// utils/geminiAI.js
// Gemini AI integration for arrival time (ETA), vehicle speed, and distance prediction.
// Includes robust fallback to mathematical Haversine ETA if API key is not configured or fails.

const { GoogleGenAI } = require('@google/genai');
const { haversineDistanceKm } = require('./smartFeatures');

let currentApiKey = null;
let aiClient = null;

function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_gemini_api_key_here') {
    return null;
  }
  if (aiClient && currentApiKey === apiKey) {
    return aiClient;
  }
  try {
    currentApiKey = apiKey;
    aiClient = new GoogleGenAI({ apiKey });
    return aiClient;
  } catch (err) {
    console.error('[GeminiAI] Failed to initialize GoogleGenAI client:', err.message);
    return null;
  }
}

/**
 * Fallback ETA calculation based on Haversine distance and vehicle speeds.
 */
function calculateFallbackETA(distanceKm, vehicleType = 'bike') {
  const averageSpeedsKmh = {
    on_foot: 5,
    bike: 28,
    car: 35,
    van: 30,
    other: 25,
  };

  const speedKmh = averageSpeedsKmh[vehicleType] || 28;
  const hours = distanceKm / speedKmh;
  const minutes = Math.max(2, Math.round(hours * 60));

  return {
    estimatedMinutes: minutes,
    formattedEta: minutes < 60 ? `${minutes} mins` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`,
    vehicleSpeedKmh: speedKmh,
    trafficLevel: 'Normal flow',
    confidence: 'standard_heuristic',
    isAiPredicted: false,
    vehicleType,
    distanceKm: Number(distanceKm.toFixed(2)),
  };
}

/**
 * Predict arrival time and speed using Gemini 2.5 Flash model with dynamic prompt context.
 */
async function predictArrivalTime({
  originCoords,
  destinationCoords,
  distanceKm,
  vehicleType = 'bike',
  foodCategory = 'Cooked Meals',
  originAddress = '',
  destinationAddress = '',
}) {
  const dist = distanceKm || (originCoords && destinationCoords ? haversineDistanceKm(originCoords, destinationCoords) : 0);

  if (!dist || dist <= 0) {
    return {
      estimatedMinutes: 0,
      formattedEta: '0 mins',
      vehicleSpeedKmh: 0,
      trafficLevel: 'Immediate',
      confidence: 'immediate',
      isAiPredicted: false,
      distanceKm: 0,
    };
  }

  const client = getAIClient();
  if (!client) {
    return calculateFallbackETA(dist, vehicleType);
  }

  try {
    const prompt = `
You are an expert logistics AI for a food donation platform. Predict the realistic arrival time for food delivery based on the following details:
- Distance: ${dist.toFixed(2)} km
- Vehicle Type: ${vehicleType} (options: bike, car, van, on_foot)
- Food Category: ${foodCategory}
- Pickup Address: ${originAddress || 'Origin'}
- Destination Address: ${destinationAddress || 'Destination'}
- Current Time: ${new Date().toLocaleTimeString()}

Calculate the estimated travel time in minutes, factoring in urban traffic delay, vehicle speed (in km/h), loading/unloading overhead (3-5 minutes), and distance.

Respond ONLY with a valid JSON object in the following format (no markdown code blocks, no extra text):
{
  "estimatedMinutes": <number>,
  "formattedEta": "<string e.g. 18 mins>",
  "vehicleSpeedKmh": <number e.g. 30>,
  "trafficLevel": "<string e.g. Moderate traffic>",
  "confidence": "gemini_ai",
  "isAiPredicted": true
}
`;

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: prompt,
    });

    const text = response.text ? response.text.trim() : '';
    const cleanedText = text.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(cleanedText);

    const estMins = Number(parsed.estimatedMinutes) || Math.max(2, Math.round((dist / 28) * 60));

    return {
      estimatedMinutes: estMins,
      formattedEta: parsed.formattedEta || `${estMins} mins`,
      vehicleSpeedKmh: Number(parsed.vehicleSpeedKmh) || Math.round((dist / (estMins / 60))) || 28,
      trafficLevel: parsed.trafficLevel || 'Normal flow',
      confidence: 'gemini_ai',
      isAiPredicted: true,
      vehicleType,
      distanceKm: Number(dist.toFixed(2)),
    };
  } catch (err) {
    console.error('[GeminiAI] Prediction error (using fallback):', err.message);
    return calculateFallbackETA(dist, vehicleType);
  }
}

module.exports = {
  predictArrivalTime,
  calculateFallbackETA,
};
