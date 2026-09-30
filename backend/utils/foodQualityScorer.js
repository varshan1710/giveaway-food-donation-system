// utils/foodQualityScorer.js
// Prototype food quality scoring from ESP32 sensor readings.
//
// ⚠️  IMPORTANT DISCLAIMER ⚠️
// This scoring system is a PROTOTYPE and has NOT been scientifically validated
// against microbiological food-safety standards.  The output (0–100 %) is a
// rough indicative score based on configurable thresholds.
// It MUST NOT be used as a certified food-safety assessment or presented as
// "guaranteed safe" / "100% safe" to end-users.
//
// Inputs (from the actual ESP32 hardware):
//   temperature  — DHT22 reading (°C)
//   humidity     — DHT22 reading (%)
//   mqValue      — Single MQ gas sensor ADC reading (0–4095)
//
// Output:
//   foodQualityScore — integer 0–100
//   breakdown        — per-component scores for transparency
//
// Thresholds are defined as module-level constants so they can be easily
// adjusted once real food-sample calibration data is available.

// ---------------------------------------------------------------------------
// Configurable thresholds
// ---------------------------------------------------------------------------

// Temperature (°C)
const TEMP_IDEAL_MAX = 25;   // ideal upper limit — score stays 100 below this
const TEMP_SAFE_MAX  = 32;   // still acceptable
const TEMP_CRIT      = 35;   // matches ESP32 firmware TEMP_CRITICAL

// Relative humidity (%)
const HUM_IDEAL_MAX  = 50;   // ideal upper limit
const HUM_SAFE_MAX   = 60;   // still acceptable
const HUM_CRIT       = 70;   // clearly elevated

// MQ gas sensor ADC value (0–4095)
const MQ_IDEAL_MAX   = 400;  // clean baseline
const MQ_SAFE_MAX    = 1000; // elevated but not alarming
const MQ_CRIT        = 2000; // matches ESP32 firmware MQ_CRITICAL

// Score component weights (must sum to 1.0)
const WEIGHT_TEMP = 0.35;
const WEIGHT_HUM  = 0.30;
const WEIGHT_MQ   = 0.35;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Maps a raw value to a 0–100 component score using a two-segment linear curve:
 *   value ≤ idealMax  → 100
 *   idealMax < value ≤ critValue → linear decay from 100 to 0
 *   value > critValue → 0
 */
function componentScore(value, idealMax, critValue) {
  if (value <= idealMax) return 100;
  if (value >= critValue) return 0;
  // Linear decay in the (idealMax, critValue) range
  return Math.max(0, Math.round(100 * (1 - (value - idealMax) / (critValue - idealMax))));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calculate the food quality score from a single sensor reading.
 *
 * @param {{ temperature: number, humidity: number, mqValue: number }} reading
 * @returns {{ score: number, breakdown: { temp: number, hum: number, mq: number } }}
 */
function scoreReading({ temperature, humidity, mqValue }) {
  const temp = componentScore(temperature, TEMP_IDEAL_MAX, TEMP_CRIT);
  const hum  = componentScore(humidity,    HUM_IDEAL_MAX,  HUM_CRIT);
  const mq   = componentScore(mqValue,     MQ_IDEAL_MAX,   MQ_CRIT);

  const score = Math.round(temp * WEIGHT_TEMP + hum * WEIGHT_HUM + mq * WEIGHT_MQ);

  return { score, breakdown: { temp, hum, mq } };
}

/**
 * Calculate a representative food quality score from an array of readings.
 * Uses the MEDIAN of individual scores (robust to outlier spikes).
 *
 * @param {Array<{ temperature: number, humidity: number, mqValue: number }>} readings
 * @returns {{ foodQualityScore: number, sampleCount: number, breakdown: object }|null}
 *   Returns null if the readings array is empty or undefined.
 */
function calculateFoodQualityScore(readings) {
  if (!readings || readings.length === 0) return null;

  const scores = readings.map(scoreReading);
  const sortedScores = [...scores].sort((a, b) => a.score - b.score);
  const mid = Math.floor(sortedScores.length / 2);

  // Median score
  const medianScore =
    sortedScores.length % 2 === 0
      ? Math.round((sortedScores[mid - 1].score + sortedScores[mid].score) / 2)
      : sortedScores[mid].score;

  // Median breakdown (from the median score's entry)
  const medianEntry = sortedScores[sortedScores.length % 2 === 0 ? mid - 1 : mid];

  return {
    foodQualityScore: medianScore,
    sampleCount: readings.length,
    breakdown: medianEntry.breakdown,
  };
}

module.exports = { calculateFoodQualityScore, scoreReading, TEMP_CRIT, HUM_CRIT, MQ_CRIT };
