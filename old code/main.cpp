#include <SD.h>
#include <SPI.h>
#include <Wire.h>
#include <math.h>

#include <TinyGPSPlus.h>

#include <Adafruit_BME280.h>
#include <Adafruit_BME680.h>
#include <Adafruit_BMP280.h>

#include <MPU9250_asukiaaa.h>

// ===================== PINOUT =====================
static const int I2C_SDA = 21; // P21
static const int I2C_SCL = 22; // P22

// GPS (UART2)
static const int GPS_RX = 16; // ESP32 RX2 <- GPS TX
static const int GPS_TX = 17; // ESP32 TX2 -> GPS RX

// LR900P (UART1) ✅ 57600
static const int LR_RX = 32;       // ESP32 RX1 <- LR TX
static const int LR_TX = 33;       // ESP32 TX1 -> LR RX
static const long LR_BAUD = 57600; // IMPORTANT

// SD (VSPI)
static const int SD_CS = 5;
static const int SPI_SCK = 18;
static const int SPI_MISO = 19;
static const int SPI_MOSI = 23;

// Analog pins (ADC1 recommended)
static const int BAT_ADC_PIN = 35;  // Battery voltage sensor OUT
static const int MICS_ADC_PIN = 34; // MiCS-5524 analog OUT (A0)
static const int MICS_EN_PIN =
    -1; // если EN реально на GPIO, поставь номер, иначе -1

// ===================== I2C ADDRESSES =====================
static const uint8_t BME680_ADDR = 0x76;    // BME680: SDO=GND
static const uint8_t SENSOR280_ADDR = 0x77; // BME/BMP280: SDO=3V3

// ===================== RATES =====================
static const uint32_t SEND_PERIOD_MS = 200; // 5 Hz (стабильно для всего)
static const uint32_t SD_FLUSH_EVERY =
    1; // писать каждую строку (можно 5 для меньшего износа)

// ===================== BATTERY CALIB =====================
// bat_V = (bat_adc_mV * BAT_K) / 1000
// Подстрой по мультиметру: BAT_K = Vbat_mV / bat_adc_mV
static float BAT_K = 5.00f; // стартовое

// ===================== MiCS-5524 MODEL =====================
// Это НЕ ppm. Это “аналоговый тракт + Rs/R0 + индекс”
// Проверь реальное питание модуля (обычно 5V):
static const float MICS_VCC_V = 5.00f;
// RL на плате часто 10k (иногда 5k). Если знаешь — поставь точное:
static const float MICS_RL_OHM = 10000.0f;
// Если у тебя стоит делитель/усилитель на линии A0 -> ESP32, поправь
// коэффициент. Если A0 напрямую в ESP32 (только если <=3.3V!) => 1.0
static const float MICS_ADC_TO_VOUT = 1.00f;
// Калибровка R0 (опционально): сопротивление сенсора в “чистом воздухе” после
// прогрева
static float MICS_R0_OHM = NAN;

// ===================== Divider (если используешь делитель 10k/20k для
// батареи/аналогов) ===================== В этом скетче делители не “вшиты” по
// резисторам — только коэффициенты BAT_K и MICS_ADC_TO_VOUT.
// ===================== SD =====================
const char *LOG_PATH = "/telemetry.txt";

// ===================== SERIAL OBJECTS =====================
HardwareSerial GPS(2);
HardwareSerial LR(1);
TinyGPSPlus gps;

// GPS custom fields (GN и GP варианты)
TinyGPSCustom rmcStatusGN(gps, "GNRMC", 2); // A/V
TinyGPSCustom ggaFixQGN(gps, "GNGGA", 6);   // 0..6
TinyGPSCustom ggaSatsGN(gps, "GNGGA", 7);   // 00..xx
TinyGPSCustom ggaHdopGN(gps, "GNGGA", 8);   // 99.99

TinyGPSCustom rmcStatusGP(gps, "GPRMC", 2);
TinyGPSCustom ggaFixQGP(gps, "GPGGA", 6);
TinyGPSCustom ggaSatsGP(gps, "GPGGA", 7);
TinyGPSCustom ggaHdopGP(gps, "GPGGA", 8);

// ===================== ENV SENSORS =====================
Adafruit_BME680 bme680;
Adafruit_BME280 bme280;
Adafruit_BMP280 bmp280;

bool hasBME680 = false;
bool hasBME280 = false;
bool hasBMP280 = false;
bool hasSD = false;

// ===================== IMU =====================
MPU9250_asukiaaa imu68(MPU9250_ADDRESS_AD0_LOW);
MPU9250_asukiaaa imu69(MPU9250_ADDRESS_AD0_HIGH);
MPU9250_asukiaaa *imu = nullptr;
bool hasIMU = false;

// Gyro bias calibration
static const int GYRO_CAL_SAMPLES = 400;
float gbx = 0, gby = 0, gbz = 0;
bool gyroCalDone = false;

// Attitude & velocity state
float roll_deg = 0, pitch_deg = 0, yaw_deg = 0;
float vx = 0, vy = 0, vz = 0;

float prev_gx = NAN, prev_gy = NAN, prev_gz = NAN;
float prev_omega = NAN;
uint32_t prev_ms = 0;
// ===================== HELPERS =====================
uint32_t readAdcMilliVolts(int pin) {
#if defined(ARDUINO_ARCH_ESP32)
  return analogReadMilliVolts(pin);
#else
  int raw = analogRead(pin);
  return (uint32_t)(raw * 3300.0f / 4095.0f);
#endif
}

static inline float rad(float deg) { return deg * 0.01745329252f; }
static inline float wrap180(float a) {
  while (a > 180)
    a -= 360;
  while (a < -180)
    a += 360;
  return a;
}
static inline float wrap360(float a) {
  while (a >= 360)
    a -= 360;
  while (a < 0)
    a += 360;
  return a;
}

static inline void kv(String &s, const char *k, float v, int prec,
                      const char *unit = "") {
  s += k;
  s += "=";
  if (!isnan(v))
    s += String(v, prec);
  else
    s += "NA";
  if (unit && unit[0])
    s += unit;
  s += " ";
}
static inline void kvd(String &s, const char *k, double v, int prec,
                       const char *unit = "") {
  s += k;
  s += "=";
  if (!isnan(v))
    s += String(v, prec);
  else
    s += "NA";
  if (unit && unit[0])
    s += unit;
  s += " ";
}
static inline void kvi(String &s, const char *k, long v,
                       const char *unit = "") {
  s += k;
  s += "=";
  s += v;
  if (unit && unit[0])
    s += unit;
  s += " ";
}

int safeToInt(const char *p, int def = -1) {
  if (!p || !*p)
    return def;
  return atoi(p);
}
double safeToD(const char *p, double def = NAN) {
  if (!p || !*p)
    return def;
  return atof(p);
}

void i2cScan() {
  Serial.println("\nI2C scan:");
  int found = 0;
  for (uint8_t addr = 1; addr < 127; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() == 0) {
      Serial.print("  found 0x");
      if (addr < 16)
        Serial.print("0");
      Serial.println(addr, HEX);
      found++;
    }
  }
  Serial.print("I2C total: ");
  Serial.println(found);
}

void setupEnvSensors() {
  // BME680
  if (bme680.begin(BME680_ADDR, &Wire)) {
    hasBME680 = true;
    bme680.setTemperatureOversampling(BME680_OS_8X);
    bme680.setHumidityOversampling(BME680_OS_2X);
    bme680.setPressureOversampling(BME680_OS_4X);
    bme680.setIIRFilterSize(BME680_FILTER_SIZE_3);
    bme680.setGasHeater(320, 150);
    Serial.println("BME680: OK");
  } else {
    Serial.println("BME680: NOT FOUND");
  }

  // 280: try BME280 then BMP280
  if (bme280.begin(SENSOR280_ADDR, &Wire)) {
    hasBME280 = true;
    Serial.println("280: BME280 OK");
  } else if (bmp280.begin(SENSOR280_ADDR)) {
    hasBMP280 = true;
    bmp280.setSampling(
        Adafruit_BMP280::MODE_NORMAL, Adafruit_BMP280::SAMPLING_X2,
        Adafruit_BMP280::SAMPLING_X16, Adafruit_BMP280::FILTER_X16,
        Adafruit_BMP280::STANDBY_MS_125);
    Serial.println("280: BMP280 OK");
  } else {
    Serial.println("280: NOT FOUND");
  }
}

void setupIMU() {
  uint8_t id = 0;
  imu68.setWire(&Wire);
  if (imu68.readId(&id) == 0) {
    imu = &imu68;
    hasIMU = true;
  } else {
    imu69.setWire(&Wire);
    if (imu69.readId(&id) == 0) {
      imu = &imu69;
      hasIMU = true;
    }
  }

  if (hasIMU && imu) {
    imu->beginAccel();
    imu->beginGyro();
    // mag intentionally ignored (у тебя не работает)
    Serial.println("IMU: OK");
  } else {
    Serial.println("IMU: NOT FOUND");
  }
}

void calibrateGyroBias() {
  if (!hasIMU || !imu)
    return;
  long good = 0;
  double sx = 0, sy = 0, sz = 0;

  for (int i = 0; i < GYRO_CAL_SAMPLES; i++) {
    if (imu->gyroUpdate() == 0) {
      sx += imu->gyroX();
      sy += imu->gyroY();
      sz += imu->gyroZ();
      good++;
    }
    delay(5);
  }
  if (good > 50) {
    gbx = sx / good;
    gby = sy / good;
    gbz = sz / good;
    gyroCalDone = true;
    Serial.print("Gyro bias: ");
    Serial.print(gbx, 3);
    Serial.print(" ");
    Serial.print(gby, 3);
    Serial.print(" ");
    Serial.println(gbz, 3);
  } else {
    Serial.println("Gyro bias: FAILED (more drift)");
  }
}

void setupSD() {
  SPI.begin(SPI_SCK, SPI_MISO, SPI_MOSI, SD_CS);
  if (SD.begin(SD_CS, SPI)) {
    hasSD = true;
    Serial.println("SD: OK");
    // ensure file exists
    File f = SD.open(LOG_PATH, FILE_APPEND);
    if (f)
      f.close();
  } else {
    hasSD = false;
    Serial.println("SD: FAIL");
  }
}

void logLine(const String &line) {
  // USB debug + LR
  Serial.println(line);
  LR.println(line);
  // SD
  static uint32_t cnt = 0;
  if (hasSD) {
    cnt++;
    if (cnt % SD_FLUSH_EVERY == 0) {
      File f = SD.open(LOG_PATH, FILE_APPEND);
      if (f) {
        f.println(line);
        f.close();
      }
    }
  }
}

// ===================== SETUP =====================
void setup() {
  Serial.begin(57600);
  delay(300);

  // ADC stable (ADC1 pins)
  analogReadResolution(12);
  analogSetPinAttenuation(BAT_ADC_PIN, ADC_11db);
  analogSetPinAttenuation(MICS_ADC_PIN, ADC_11db);

  if (MICS_EN_PIN >= 0) {
    pinMode(MICS_EN_PIN, OUTPUT);
    digitalWrite(MICS_EN_PIN, HIGH);
  }

  // I2C
  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setClock(100000);

  i2cScan();

  // Sensors
  setupEnvSensors();
  setupIMU();

  // UARTs
  GPS.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);
  LR.begin(LR_BAUD, SERIAL_8N1, LR_RX, LR_TX);

  // SD
  setupSD();

  Serial.println("\n--- START ---");
  Serial.println("Hold IMU still ~2-3 seconds...");
  calibrateGyroBias();

  prev_ms = millis();
}

// ===================== LOOP =====================
uint32_t lastSend = 0;

void loop() {
  // feed GPS parser always
  while (GPS.available())
    gps.encode(GPS.read());

  uint32_t now = millis();
  if (now - lastSend < SEND_PERIOD_MS)
    return;
  lastSend = now;

  float dt = (now - prev_ms) / 1000.0f;
  prev_ms = now;
  if (dt <= 0 || dt > 0.5f)
    dt = SEND_PERIOD_MS / 1000.0f;

  // ---------- GPS ----------
  const char *stGN = rmcStatusGN.value();
  const char *stGP = rmcStatusGP.value();
  const char *st = (stGN && *stGN) ? stGN : stGP;

  int fixQ =
      safeToInt((ggaFixQGN.value() && *ggaFixQGN.value()) ? ggaFixQGN.value()
                                                          : ggaFixQGP.value(),
                -1);
  int sats =
      safeToInt((ggaSatsGN.value() && *ggaSatsGN.value()) ? ggaSatsGN.value()
                                                          : ggaSatsGP.value(),
                -1);
  double hdop =
      safeToD((ggaHdopGN.value() && *ggaHdopGN.value()) ? ggaHdopGN.value()
                                                        : ggaHdopGP.value(),
              NAN);

  double lat = gps.location.isValid() ? gps.location.lat() : NAN;
  double lon = gps.location.isValid() ? gps.location.lng() : NAN;
  double alt = gps.altitude.isValid() ? gps.altitude.meters() : NAN;
  double spd = gps.speed.isValid() ? gps.speed.kmph() : NAN;
  double crs = gps.course.isValid() ? gps.course.deg() : NAN;

  // ---------- ENV: 280 ----------
  float t280 = NAN, p280 = NAN, h280 = NAN;
  if (hasBME280) {
    t280 = bme280.readTemperature();
    p280 = bme280.readPressure() / 100.0f;
    h280 = bme280.readHumidity();
  } else if (hasBMP280) {
    t280 = bmp280.readTemperature();
    p280 = bmp280.readPressure() / 100.0f;
    h280 = NAN;
  }

  // ---------- ENV: 680 ----------
  float t680 = NAN, p680 = NAN, h680 = NAN;
  uint32_t gas680 = 0;
  if (hasBME680 && bme680.performReading()) {
    t680 = bme680.temperature;
    p680 = bme680.pressure / 100.0f;
    h680 = bme680.humidity;
    gas680 = bme680.gas_resistance;
  }

  // ---------- IMU raw ----------
  float ax_g = NAN, ay_g = NAN, az_g = NAN;
  float gx_dps = NAN, gy_dps = NAN, gz_dps = NAN;

  if (hasIMU && imu) {
    if (imu->accelUpdate() == 0) {
      ax_g = imu->accelX();
      ay_g = imu->accelY();
      az_g = imu->accelZ();
    }
    if (imu->gyroUpdate() == 0) {
      gx_dps = imu->gyroX();
      gy_dps = imu->gyroY();
      gz_dps = imu->gyroZ();
    }
  }

  // gyro bias
  if (gyroCalDone) {
    if (!isnan(gx_dps))
      gx_dps -= gbx;
    if (!isnan(gy_dps))
      gy_dps -= gby;
    if (!isnan(gz_dps))
      gz_dps -= gbz;
  }

  // ---------- attitude (complementary) ----------
  if (!isnan(gx_dps))
    roll_deg += gx_dps * dt;
  if (!isnan(gy_dps))
    pitch_deg += gy_dps * dt;
  if (!isnan(gz_dps))
    yaw_deg += gz_dps * dt;

  roll_deg = wrap180(roll_deg);
  pitch_deg = wrap180(pitch_deg);
  yaw_deg = wrap360(yaw_deg);

  if (!isnan(ax_g) && !isnan(ay_g) && !isnan(az_g)) {
    float roll_acc = atan2f(ay_g, az_g) * 57.2957795f;
    float pitch_acc =
        atan2f(-ax_g, sqrtf(ay_g * ay_g + az_g * az_g)) * 57.2957795f;
    const float ALPHA = 0.98f;
    roll_deg = ALPHA * roll_deg + (1.0f - ALPHA) * roll_acc;
    pitch_deg = ALPHA * pitch_deg + (1.0f - ALPHA) * pitch_acc;
    roll_deg = wrap180(roll_deg);
    pitch_deg = wrap180(pitch_deg);
  }
  // ---------- angular speed & angular acceleration ----------
  float omega_dps = NAN;
  if (!isnan(gx_dps) && !isnan(gy_dps) && !isnan(gz_dps))
    omega_dps = sqrtf(gx_dps * gx_dps + gy_dps * gy_dps + gz_dps * gz_dps);

  float alphax_dps2 = NAN, alphay_dps2 = NAN, alphaz_dps2 = NAN,
        alpha_dps2 = NAN;
  if (dt > 0.0005f) {
    if (!isnan(prev_gx) && !isnan(gx_dps))
      alphax_dps2 = (gx_dps - prev_gx) / dt;
    if (!isnan(prev_gy) && !isnan(gy_dps))
      alphay_dps2 = (gy_dps - prev_gy) / dt;
    if (!isnan(prev_gz) && !isnan(gz_dps))
      alphaz_dps2 = (gz_dps - prev_gz) / dt;
    if (!isnan(prev_omega) && !isnan(omega_dps))
      alpha_dps2 = (omega_dps - prev_omega) / dt;
  }
  prev_gx = gx_dps;
  prev_gy = gy_dps;
  prev_gz = gz_dps;
  prev_omega = omega_dps;

  // ---------- linear acceleration (gravity removed) ----------
  float lax_mps2 = NAN, lay_mps2 = NAN, laz_mps2 = NAN;
  float a_lin_mag = NAN;

  if (!isnan(ax_g) && !isnan(ay_g) && !isnan(az_g)) {
    float r = rad(roll_deg);
    float p = rad(pitch_deg);

    // gravity vector in body frame (in g)
    float gx_g = -sinf(p);
    float gy_g = sinf(r) * cosf(p);
    float gz_g = cosf(r) * cosf(p);

    float lax_g = ax_g - gx_g;
    float lay_g = ay_g - gy_g;
    float laz_g = az_g - gz_g;

    lax_mps2 = lax_g * 9.80665f;
    lay_mps2 = lay_g * 9.80665f;
    laz_mps2 = laz_g * 9.80665f;

    a_lin_mag =
        sqrtf(lax_mps2 * lax_mps2 + lay_mps2 * lay_mps2 + laz_mps2 * laz_mps2);
  }

  // ---------- velocity estimate (drifts but controlled) ----------
  float v_leak = 0.995f;
  bool almostStill = false;
  if (!isnan(a_lin_mag) && !isnan(omega_dps)) {
    if (a_lin_mag < 0.35f && omega_dps < 2.0f)
      almostStill = true;
  }
  if (almostStill)
    v_leak = 0.90f;

  vx *= v_leak;
  vy *= v_leak;
  vz *= v_leak;

  if (dt > 0.0005f && !isnan(lax_mps2) && !isnan(lay_mps2) &&
      !isnan(laz_mps2)) {
    vx += lax_mps2 * dt;
    vy += lay_mps2 * dt;
    vz += laz_mps2 * dt;
  }
  float v_mps = sqrtf(vx * vx + vy * vy + vz * vz);

  // ---------- Battery ----------
  uint32_t bat_adc_mV = readAdcMilliVolts(BAT_ADC_PIN);
  float bat_V = (bat_adc_mV * BAT_K) / 1000.0f;

  // ---------- MiCS-5524 ----------
  uint32_t mics_adc_mV = readAdcMilliVolts(MICS_ADC_PIN);
  float mics_vout_V = (mics_adc_mV / 1000.0f) * MICS_ADC_TO_VOUT;

  float mics_rs_ohm = NAN;
  if (mics_vout_V > 0.05f && mics_vout_V < (MICS_VCC_V - 0.05f)) {
    mics_rs_ohm = MICS_RL_OHM * (MICS_VCC_V / mics_vout_V - 1.0f);
  }
  float mics_rs_kohm = !isnan(mics_rs_ohm) ? (mics_rs_ohm / 1000.0f) : NAN;

  float mics_ratio = NAN;
  if (!isnan(MICS_R0_OHM) && !isnan(mics_rs_ohm) && MICS_R0_OHM > 10.0f) {
    mics_ratio = mics_rs_ohm / MICS_R0_OHM; // Rs/R0
  }

  float mics_idx = NAN; // 0..100 "gas activity index"
  if (!isnan(mics_ratio)) {
    float x = 1.0f / mics_ratio;
    // clamp to 0..100
    float idx = (x - 0.5f) * 50.0f;
    if (idx < 0)
      idx = 0;
    if (idx > 100)
      idx = 100;
    mics_idx = idx;
  }

  // ---------- Build ONE full packet line ----------
  String line;
  line.reserve(950);

  kvi(line, "ms", (long)now);

  line += "| GPS ";
  line += "status=";
  line += (st && *st) ? st : "NA";
  line += " ";
  kvi(line, "fixQ", fixQ);
  kvi(line, "sats", sats);
  kvd(line, "hdop", hdop, 2);
  kvd(line, "lat", lat, 6);
  kvd(line, "lon", lon, 6);
  kvd(line, "alt_m", alt, 1, "m");
  kvd(line, "spd_kmh", spd, 1, "kmh");
  kvd(line, "crs_deg", crs, 1, "deg");

  line += "| IMU_ATT ";
  kv(line, "roll_deg", roll_deg, 1, "deg");
  kv(line, "pitch_deg", pitch_deg, 1, "deg");
  kv(line, "yaw_deg", yaw_deg, 1, "deg");

  line += "| IMU_GYRO ";
  kv(line, "gx_dps", gx_dps, 2, "dps");
  kv(line, "gy_dps", gy_dps, 2, "dps");
  kv(line, "gz_dps", gz_dps, 2, "dps");
  kv(line, "omega_dps", omega_dps, 2, "dps");

  line += "| IMU_ANGACC ";
  kv(line, "alphax_dps2", alphax_dps2, 1, "dps2");
  kv(line, "alphay_dps2", alphay_dps2, 1, "dps2");
  kv(line, "alphaz_dps2", alphaz_dps2, 1, "dps2");
  kv(line, "alpha_dps2", alpha_dps2, 1, "dps2");

  line += "| IMU_ACC_RAW ";
  kv(line, "ax_g", ax_g, 3, "g");
  kv(line, "ay_g", ay_g, 3, "g");
  kv(line, "az_g", az_g, 3, "g");
  line += "| IMU_ACC_LIN ";
  kv(line, "lax_mps2", lax_mps2, 2, "mps2");
  kv(line, "lay_mps2", lay_mps2, 2, "mps2");
  kv(line, "laz_mps2", laz_mps2, 2, "mps2");

  line += "| IMU_VEL_EST ";
  kv(line, "vx_mps", vx, 2, "mps");
  kv(line, "vy_mps", vy, 2, "mps");
  kv(line, "vz_mps", vz, 2, "mps");
  kv(line, "v_mps", v_mps, 2, "mps");

  line += "| ENV280 ";
  kv(line, "t280_C", t280, 2, "C");
  kv(line, "p280_hPa", p280, 2, "hPa");
  kv(line, "h280_pct", h280, 2, "%");

  line += "| ENV680 ";
  kv(line, "t680_C", t680, 2, "C");
  kv(line, "p680_hPa", p680, 2, "hPa");
  kv(line, "h680_pct", h680, 2, "%");
  kvi(line, "gas680_ohm", (long)gas680, "ohm");

  line += "| MiCS5524 ";
  kv(line, "vout_V", mics_vout_V, 3, "V");
  kv(line, "rs_kohm", mics_rs_kohm, 2, "k");
  kv(line, "ratio", mics_ratio, 3);
  kv(line, "idx", mics_idx, 1, "%");

  line += "| BAT ";
  kv(line, "bat_V", bat_V, 2, "V");
  kvi(line, "bat_adc_mV", (long)bat_adc_mV, "mV");

  // ---------- send + log ----------
  logLine(line);
}