/*
 * GiveAway ESP32 Firmware — Food Quality Sensing
 * ================================================
 * Hardware:
 *   - ESP32 dev board
 *   - DHT22 sensor            → GPIO 4
 *   - MQ gas sensor (single)  → GPIO 34 (ADC input, 3.3 V logic)
 *   - 16×2 I2C LCD            → SDA GPIO 21 / SCL GPIO 22 / address 0x27
 *   - Buzzer                  → GPIO 23
 *
 * What this firmware does:
 *   1. Reads DHT22 (temperature + humidity)
 *   2. Reads MQ gas ADC value
 *   3. Determines NORMAL / CRITICAL status (same thresholds as original firmware)
 *   4. Displays status on LCD
 *   5. Buzzes on CRITICAL
 *   6. Prints to Serial Monitor
 *   7. [NEW] Connects to Wi-Fi (fails gracefully — local operation continues)
 *   8. [NEW] Polls GiveAway backend for an active FoodTest assigned to this device
 *   9. [NEW] POSTs sensor readings to the backend for each active test
 *
 * Configuration (edit the #define section below — do NOT hard-code credentials):
 *   DEVICE_ID       — unique identifier for this physical ESP32
 *   DEVICE_TOKEN    — authentication token (must match ESP32_DEVICE_TOKENS in Render)
 *   BACKEND_URL     — base URL of the GiveAway backend API
 *   WIFI_SSID       — Wi-Fi network name
 *   WIFI_PASSWORD   — Wi-Fi password
 *
 * Required Arduino libraries (install via Library Manager):
 *   - DHT sensor library (Adafruit)
 *   - Adafruit Unified Sensor
 *   - LiquidCrystal_I2C (Frank de Brabander or compatible)
 *   - ArduinoJson (Benoit Blanchon) — version 6.x or 7.x
 *
 * PRESERVED from original firmware:
 *   - All pin assignments
 *   - DHT22 reading
 *   - MQ reading
 *   - NORMAL/CRITICAL logic
 *   - LCD display
 *   - Buzzer alert
 *   - Serial Monitor output
 *
 * Wi-Fi / backend failures are ALWAYS non-fatal.
 * The local sensor loop continues regardless of network state.
 */

#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include "DHT.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ===========================================================================
// ── CONFIGURATION — edit these for each physical device ────────────────────
// ===========================================================================

// Unique identifier for this physical ESP32 device.
// Must be registered in the GiveAway admin panel (POST /api/esp/devices).
#define DEVICE_ID      "ESP32-001"

// Static authentication token for this device.
// Must appear in ESP32_DEVICE_TOKENS env variable on Render.
// Change placeholder before flashing — never commit real tokens to version control.
#define DEVICE_TOKEN   "YOUR_DEVICE_TOKEN"

// GiveAway backend base URL (no trailing slash).
// Local development: "http://192.168.x.x:5000"   (use local IP, not localhost)
// Production:        "https://your-app.onrender.com"
#define BACKEND_URL    "YOUR_BACKEND_URL"

// Wi-Fi credentials (replace placeholders — never commit real values)
#define WIFI_SSID      "YOUR_WIFI_SSID"
#define WIFI_PASSWORD  "YOUR_WIFI_PASSWORD"

// ===========================================================================
// ── Pin assignments (original firmware — do NOT change) ────────────────────
// ===========================================================================

#define DHTPIN      4
#define DHTTYPE     DHT22
#define MQ_PIN      34
#define BUZZER_PIN  23

// LCD: SDA = GPIO 21, SCL = GPIO 22, address 0x27 (set by hardware jumpers)
#define LCD_ADDR    0x27
#define LCD_COLS    16
#define LCD_ROWS    2

// ===========================================================================
// ── Thresholds (original firmware — preserved exactly) ─────────────────────
// ===========================================================================

#define TEMP_CRITICAL  35.0f   // °C
#define HUM_CRITICAL   60.0f   // %
#define MQ_CRITICAL    2000    // ADC value

// ===========================================================================
// ── Timing ─────────────────────────────────────────────────────────────────
// ===========================================================================

#define SENSOR_INTERVAL_MS      3000   // how often to read sensors (ms)
#define WIFI_RETRY_INTERVAL_MS  30000  // how often to retry Wi-Fi if disconnected
#define POLL_ACTIVE_TEST_MS     10000  // how often to poll backend for active test
#define SEND_READING_MS         15000  // how often to POST a reading when test active
#define WIFI_CONNECT_TIMEOUT_MS 10000  // max time to wait for Wi-Fi on boot

// ===========================================================================
// ── Globals ─────────────────────────────────────────────────────────────────
// ===========================================================================

DHT dht(DHTPIN, DHTTYPE);
LiquidCrystal_I2C lcd(LCD_ADDR, LCD_COLS, LCD_ROWS);

// Active test state (updated by pollActiveTest)
String activeTestId = "";  // empty = no active test

// Timestamps for non-blocking scheduling
unsigned long lastSensorRead    = 0;
unsigned long lastWifiRetry     = 0;
unsigned long lastPollActiveTest = 0;
unsigned long lastSendReading   = 0;

// ===========================================================================
// ── Wi-Fi helpers ───────────────────────────────────────────────────────────
// ===========================================================================

bool wifiConnected = false;

/**
 * Attempt to connect to Wi-Fi.
 * Returns true on success, false on timeout.
 * Does NOT block indefinitely — times out after WIFI_CONNECT_TIMEOUT_MS.
 */
bool connectWiFi() {
  Serial.print("[WiFi] Connecting to ");
  Serial.print(WIFI_SSID);
  Serial.print(" ...");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED) {
    if (millis() - start > WIFI_CONNECT_TIMEOUT_MS) {
      Serial.println(" TIMEOUT (continuing without Wi-Fi)");
      WiFi.disconnect();
      return false;
    }
    delay(200);
    Serial.print(".");
  }

  Serial.println();
  Serial.print("[WiFi] Connected! IP: ");
  Serial.println(WiFi.localIP());
  return true;
}

// ===========================================================================
// ── Backend API helpers ──────────────────────────────────────────────────────
// ===========================================================================

/**
 * Poll the backend for an active food test assigned to this device.
 * On success, updates activeTestId (empty string = no active test).
 * On any network/parse error, leaves activeTestId unchanged.
 */
void pollActiveTest() {
  if (WiFi.status() != WL_CONNECTED) return;

  String url = String(BACKEND_URL) + "/api/esp/tests/active/" + String(DEVICE_ID);

  HTTPClient http;
  http.begin(url);
  http.addHeader("x-device-token", DEVICE_TOKEN);
  http.addHeader("x-device-id", DEVICE_ID);
  http.setTimeout(5000);

  int httpCode = http.GET();

  if (httpCode == 200) {
    String payload = http.getString();
    StaticJsonDocument<512> doc;
    DeserializationError err = deserializeJson(doc, payload);
    if (!err) {
      bool active = doc["active"] | false;
      if (active) {
        String newTestId = doc["data"]["testId"] | "";
        if (newTestId != activeTestId) {
          activeTestId = newTestId;
          Serial.print("[ESP] Active test found: ");
          Serial.println(activeTestId);

          lcd.clear();
          lcd.setCursor(0, 0);
          lcd.print("Test Active:");
          lcd.setCursor(0, 1);
          String shortId = activeTestId.substring(0, min(activeTestId.length(), (unsigned int)16));
          lcd.print(shortId);
        }
      } else {
        if (activeTestId != "") {
          Serial.println("[ESP] No active test — waiting");
          activeTestId = "";
        }
      }
    }
  } else if (httpCode > 0) {
    Serial.print("[ESP] pollActiveTest HTTP ");
    Serial.println(httpCode);
  } else {
    Serial.print("[ESP] pollActiveTest failed: ");
    Serial.println(http.errorToString(httpCode));
  }

  http.end();
}

/**
 * POST a sensor reading to the backend for the current active test.
 * Fails silently if no active test, no Wi-Fi, or HTTP error.
 */
void sendReading(float temperature, float humidity, int mqValue) {
  if (activeTestId == "") return;
  if (WiFi.status() != WL_CONNECTED) return;

  String url = String(BACKEND_URL) + "/api/esp/tests/" + activeTestId + "/readings";

  // Build JSON payload
  StaticJsonDocument<256> doc;
  doc["deviceId"]    = DEVICE_ID;
  doc["temperature"] = temperature;
  doc["humidity"]    = humidity;
  doc["mqValue"]     = mqValue;

  String payload;
  serializeJson(doc, payload);

  HTTPClient http;
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-device-token", DEVICE_TOKEN);
  http.addHeader("x-device-id", DEVICE_ID);
  http.setTimeout(5000);

  int httpCode = http.POST(payload);

  if (httpCode == 200 || httpCode == 201) {
    String response = http.getString();
    StaticJsonDocument<128> resp;
    deserializeJson(resp, response);
    int count = resp["data"]["readingCount"] | -1;
    Serial.print("[ESP] Reading sent — count: ");
    Serial.println(count);
  } else if (httpCode > 0) {
    Serial.print("[ESP] sendReading HTTP ");
    Serial.println(httpCode);
  } else {
    Serial.print("[ESP] sendReading failed: ");
    Serial.println(http.errorToString(httpCode));
  }

  http.end();
}

// ===========================================================================
// ── Arduino setup ───────────────────────────────────────────────────────────
// ===========================================================================

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println();
  Serial.println("=== GiveAway ESP32 Food Quality Sensor ===");
  Serial.print("Device ID: ");
  Serial.println(DEVICE_ID);

  // ── Initialize hardware (original firmware) ──────────────────────────────
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  Wire.begin();           // I2C for LCD (SDA=21, SCL=22 on ESP32)
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("GiveAway Sensor");
  lcd.setCursor(0, 1);
  lcd.print("Initialising...");

  dht.begin();
  delay(2000);            // DHT22 warm-up

  // ── Wi-Fi (new — non-blocking, fails gracefully) ─────────────────────────
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Connecting WiFi");
  lcd.setCursor(0, 1);
  lcd.print(WIFI_SSID);

  wifiConnected = connectWiFi();

  if (wifiConnected) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Connected!");
    lcd.setCursor(0, 1);
    lcd.print(WiFi.localIP());
    delay(1500);
  } else {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("No WiFi — local");
    lcd.setCursor(0, 1);
    lcd.print("mode only");
    delay(1500);
  }

  lcd.clear();
  Serial.println("[ESP] Setup complete. Starting sensor loop.");
}

// ===========================================================================
// ── Arduino loop ────────────────────────────────────────────────────────────
// ===========================================================================

void loop() {
  unsigned long now = millis();

  // ── 1. Non-blocking sensor read (every SENSOR_INTERVAL_MS) ────────────────
  if (now - lastSensorRead >= SENSOR_INTERVAL_MS) {
    lastSensorRead = now;

    // ── Read DHT22 (original firmware) ──────────────────────────────────────
    float temperature = dht.readTemperature();
    float humidity    = dht.readHumidity();

    // ── Read MQ gas sensor ADC (original firmware) ──────────────────────────
    int mqValue = analogRead(MQ_PIN);

    // ── Validate readings ────────────────────────────────────────────────────
    if (isnan(temperature) || isnan(humidity)) {
      Serial.println("[DHT22] Sensor read error — skipping cycle");
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("DHT22 Error!");
      lcd.setCursor(0, 1);
      lcd.print("Check wiring");
      return;
    }

    // ── NORMAL / CRITICAL determination (original firmware) ──────────────────
    bool isCritical = (temperature > TEMP_CRITICAL) ||
                      (humidity    > HUM_CRITICAL)   ||
                      (mqValue     > MQ_CRITICAL);

    // ── Serial Monitor output (original firmware) ─────────────────────────────
    Serial.println("--------------------------------------------------");
    Serial.print("Temperature: "); Serial.print(temperature); Serial.println(" °C");
    Serial.print("Humidity:    "); Serial.print(humidity);    Serial.println(" %");
    Serial.print("MQ Value:    "); Serial.println(mqValue);
    Serial.print("Status:      "); Serial.println(isCritical ? "CRITICAL" : "NORMAL");
    if (activeTestId != "") {
      Serial.print("Active Test: "); Serial.println(activeTestId);
    }
    Serial.println("--------------------------------------------------");

    // ── LCD display (original firmware) ──────────────────────────────────────
    lcd.clear();
    if (isCritical) {
      lcd.setCursor(0, 0);
      lcd.print("!! CRITICAL !!");
    } else {
      lcd.setCursor(0, 0);
      lcd.print("T:");
      lcd.print(temperature, 1);
      lcd.print("C H:");
      lcd.print((int)humidity);
      lcd.print("%");
    }
    lcd.setCursor(0, 1);
    lcd.print("MQ:");
    lcd.print(mqValue);
    if (activeTestId != "") {
      lcd.print(" T:");
      String shortId = activeTestId.length() > 5
        ? activeTestId.substring(activeTestId.length() - 5)
        : activeTestId;
      lcd.print(shortId);
    } else {
      lcd.print(isCritical ? " CRIT" : " OK");
    }

    // ── Buzzer alert on CRITICAL (original firmware) ──────────────────────────
    if (isCritical) {
      for (int i = 0; i < 3; i++) {
        digitalWrite(BUZZER_PIN, HIGH);
        delay(200);
        digitalWrite(BUZZER_PIN, LOW);
        delay(150);
      }
    }

    // ── [NEW] Send reading to backend (non-fatal) ─────────────────────────────
    if (now - lastSendReading >= SEND_READING_MS) {
      lastSendReading = now;
      sendReading(temperature, humidity, mqValue);
    }
  }

  // ── 2. Wi-Fi reconnection (non-blocking, every WIFI_RETRY_INTERVAL_MS) ─────
  if (WiFi.status() != WL_CONNECTED && (now - lastWifiRetry >= WIFI_RETRY_INTERVAL_MS)) {
    lastWifiRetry = now;
    Serial.println("[WiFi] Disconnected — attempting reconnect...");
    wifiConnected = connectWiFi();
  }

  // ── 3. Poll for active test (non-blocking, every POLL_ACTIVE_TEST_MS) ──────
  if (WiFi.status() == WL_CONNECTED && (now - lastPollActiveTest >= POLL_ACTIVE_TEST_MS)) {
    lastPollActiveTest = now;
    pollActiveTest();
  }
}
