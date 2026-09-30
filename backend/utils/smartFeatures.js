// utils/smartFeatures.js
// Deterministic distance math & geographic matching heuristics.

/**
 * Calculates geographic distance in kilometers between two lat/lon pairs using the Haversine formula.
 * Takes explicit numeric parameters: (lat1, lon1, lat2, lon2)
 */
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return Infinity;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Legacy array helper: Haversine distance in km between two [lng, lat] GeoJSON coordinate arrays.
 */
function haversineDistanceKm(coordsA, coordsB) {
  if (!Array.isArray(coordsA) || !Array.isArray(coordsB)) return Infinity;
  const [lng1, lat1] = coordsA;
  const [lng2, lat2] = coordsB;
  return calculateDistanceKm(lat1, lng1, lat2, lng2);
}

/**
 * Extracts [lat, lon] array from flexible location representations:
 * - GeoJSON Point: { type: 'Point', coordinates: [lng, lat] }
 * - Array: [lng, lat]
 * - Object: { lat, lon } or { latitude, longitude }
 */
function extractLatLon(location) {
  if (!location) return null;
  if (location.type === 'Point' && Array.isArray(location.coordinates) && location.coordinates.length >= 2) {
    const [lng, lat] = location.coordinates;
    return [lat, lng];
  }
  if (Array.isArray(location) && location.length >= 2) {
    const [lng, lat] = location;
    return [lat, lng];
  }
  if (typeof location === 'object') {
    const lat = location.lat ?? location.latitude;
    const lon = location.lng ?? location.lon ?? location.longitude;
    if (lat != null && lon != null) return [Number(lat), Number(lon)];
  }
  return null;
}

/**
 * Helper function to check if two locations are within 65 km of each other.
 * Returns boolean true if distance <= 65 km, false otherwise.
 */
function isWithin65Km(locationA, locationB, maxRadiusKm = 65) {
  const pA = extractLatLon(locationA);
  const pB = extractLatLon(locationB);
  if (!pA || !pB) return false;
  const dist = calculateDistanceKm(pA[0], pA[1], pB[0], pB[1]);
  return dist <= maxRadiusKm;
}

// Alias for backwards compatibility
const isWithin50Km = isWithin65Km;

/**
 * Helper to safely extract NGO coordinates with fallbacks
 */
function getNgoCoords(ngo) {
  if (ngo.officeLocation && Array.isArray(ngo.officeLocation.coordinates)) {
    const [lng, lat] = ngo.officeLocation.coordinates;
    if (lat !== 0 || lng !== 0) return [lng, lat];
  }
  if (ngo.user && ngo.user.location && Array.isArray(ngo.user.location.coordinates)) {
    return ngo.user.location.coordinates;
  }
  return [0, 0];
}

/**
 * Recommends nearest NGOs within radius (max 65km hard cap)
 */
function recommendNearestNGOs(donationCoords, ngoList, limit = 5, hardCapKm = 65) {
  const withDistance = ngoList
    .map((n) => {
      const coords = getNgoCoords(n);
      return {
        ngo: n,
        distanceKm: Number(haversineDistanceKm(donationCoords, coords).toFixed(2)),
      };
    })
    .filter((item) => item.distanceKm <= hardCapKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return withDistance.slice(0, limit);
}

/**
 * Sorts donations by urgency: soonest expiry + largest quantity first.
 */
function sortByPriority(donations) {
  return [...donations].sort((a, b) => b.priorityScore - a.priorityScore);
}

/**
 * Demand prediction logic
 */
function predictDemand(history, daysAhead = 7) {
  if (!history.length) return [];
  const windowSize = Math.min(7, history.length);
  const recent = history.slice(-windowSize);

  const weights = recent.map((_, i) => i + 1);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const weightedAvg =
    recent.reduce((sum, point, i) => sum + point.count * weights[i], 0) / weightSum;

  const trend = (recent[recent.length - 1].count - recent[0].count) / windowSize;

  const forecast = [];
  let lastDate = new Date(history[history.length - 1].date);

  for (let i = 1; i <= daysAhead; i++) {
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + i);
    const predicted = Math.max(0, Math.round(weightedAvg + trend * i));
    forecast.push({ date: nextDate.toISOString().slice(0, 10), predictedCount: predicted });
  }

  return forecast;
}

/**
 * Duplicate & suspicious detector
 */
function detectDuplicateOrSuspicious(newDonation, recentDonorDonations) {
  const result = { isDuplicateSuspected: false, isSuspicious: false, reason: '' };
  const reasons = [];

  const sameNameRecent = recentDonorDonations.filter(
    (d) => d.foodName.trim().toLowerCase() === newDonation.foodName.trim().toLowerCase()
  );

  for (const d of sameNameRecent) {
    const distanceKm = haversineDistanceKm(
      newDonation.pickupLocation.coordinates,
      d.pickupLocation.coordinates
    );
    const qtyDiffRatio =
      Math.abs(d.quantity.value - newDonation.quantity.value) / Math.max(d.quantity.value, 1);

    if (distanceKm < 0.15 && qtyDiffRatio < 0.2) {
      result.isDuplicateSuspected = true;
      reasons.push('Similar food item, quantity, and location posted recently');
      break;
    }
  }

  if (recentDonorDonations.length >= 5) {
    result.isSuspicious = true;
    reasons.push('Unusually high number of donations posted in the last 24 hours');
  }

  if (recentDonorDonations.length >= 3) {
    const avgQty =
      recentDonorDonations.reduce((sum, d) => sum + d.quantity.value, 0) / recentDonorDonations.length;
    if (newDonation.quantity.value > avgQty * 5) {
      result.isSuspicious = true;
      reasons.push('Quantity far exceeds donor\'s typical donation size');
    }
  }

  result.reason = reasons.join('; ');
  return result;
}

function calculateETAHours(coordsA, coordsB) {
  const MIN_SPEED_KMH = 70;
  return haversineDistanceKm(coordsA, coordsB) / MIN_SPEED_KMH;
}

/**
 * Returns NGOs within 65 km boundary whose ETA is less than remaining safe food time.
 */
function getEligibleNGOs(donationCoords, expiryDate, ngoList, hardCapKm = 65) {
  const remainingSafeHours = (new Date(expiryDate) - Date.now()) / (1000 * 60 * 60);
  if (remainingSafeHours <= 0) return [];

  return ngoList
    .map((ngo) => {
      const coords = getNgoCoords(ngo);
      const distanceKm = haversineDistanceKm(donationCoords, coords);
      const etaHours = calculateETAHours(donationCoords, coords);
      return { ngo, distanceKm, etaHours };
    })
    .filter(({ distanceKm, etaHours }) => distanceKm <= hardCapKm && etaHours <= remainingSafeHours)
    .sort((a, b) => a.etaHours - b.etaHours);
}

/**
 * Returns volunteers whose FIXED base location is within maxKm (65 km) of BOTH donor pickup and NGO office.
 */
function getEligibleVolunteers(donorCoords, ngoCoords, volunteerList, maxKm = 65) {
  return volunteerList.filter((v) => {
    let volCoords = null;
    if (v.serviceLocation && Array.isArray(v.serviceLocation.coordinates) && (v.serviceLocation.coordinates[0] !== 0 || v.serviceLocation.coordinates[1] !== 0)) {
      volCoords = v.serviceLocation.coordinates;
    } else if (v.user && v.user.location && Array.isArray(v.user.location.coordinates)) {
      volCoords = v.user.location.coordinates;
    } else if (v.location && Array.isArray(v.location.coordinates)) {
      volCoords = v.location.coordinates;
    }

    if (!volCoords) return false;

    const toDonor = haversineDistanceKm(donorCoords, volCoords);
    const toNGO = haversineDistanceKm(ngoCoords, volCoords);

    return toDonor <= maxKm && toNGO <= maxKm;
  });
}

module.exports = {
  calculateDistanceKm,
  haversineDistanceKm,
  isWithin65Km,
  isWithin50Km,
  recommendNearestNGOs,
  sortByPriority,
  predictDemand,
  detectDuplicateOrSuspicious,
  calculateETAHours,
  getEligibleNGOs,
  getEligibleVolunteers,
  getNgoCoords,
};
