// utils/smartFeatures.js
// Lightweight, dependency-free "smart" heuristics. These are intentionally
// implemented as deterministic statistics/geometry rather than a trained ML
// model, so the app remains easy to run without extra infra — the same
// interfaces could later be swapped for a real ML microservice.

/**
 * Haversine distance in km between two [lng, lat] points.
 */
function haversineDistanceKm([lng1, lat1], [lng2, lat2]) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Given a donation's coordinates and a list of NGOs (each with .location.coordinates
 * and .serviceRadiusKm), return NGOs sorted by distance, annotated with distanceKm,
 * limited to those within their service radius (falls back to all if none match).
 */
function recommendNearestNGOs(donationCoords, ngoList, limit = 5) {
  const withDistance = ngoList
    .filter((n) => n.location && Array.isArray(n.location.coordinates))
    .map((n) => ({
      ngo: n,
      distanceKm: Number(haversineDistanceKm(donationCoords, n.location.coordinates).toFixed(2)),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const withinRadius = withDistance.filter(
    (item) => item.distanceKm <= (item.ngo.serviceRadiusKm || 10)
  );

  return (withinRadius.length ? withinRadius : withDistance).slice(0, limit);
}

/**
 * Sorts donations by urgency: soonest expiry + largest quantity first.
 * Donation.priorityScore is precomputed on save; this just orders by it.
 */
function sortByPriority(donations) {
  return [...donations].sort((a, b) => b.priorityScore - a.priorityScore);
}

/**
 * Very simple moving-average demand prediction from historical donation counts.
 * `history` = array of { date, count } sorted ascending by date (e.g. daily totals).
 * Returns a naive forecast for the next N days using a weighted moving average,
 * giving more weight to recent days. This is a heuristic, not a trained model —
 * good enough to surface a trend line on the admin dashboard.
 */
function predictDemand(history, daysAhead = 7) {
  if (!history.length) return [];

  const windowSize = Math.min(7, history.length);
  const recent = history.slice(-windowSize);

  // Weighted average: most recent day gets highest weight
  const weights = recent.map((_, i) => i + 1);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const weightedAvg =
    recent.reduce((sum, point, i) => sum + point.count * weights[i], 0) / weightSum;

  // Simple linear trend from first to last point in the window
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
 * Flags a new donation as potentially duplicate/suspicious by comparing it
 * against the same donor's recent donations (last 24h):
 * - Duplicate: same food name + very similar quantity + pickup location within ~150m
 * - Suspicious: unusually high quantity vs donor's historical average, or
 *   more than N donations posted within a short window (spam-like behavior)
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

  // Spam-like posting frequency
  if (recentDonorDonations.length >= 5) {
    result.isSuspicious = true;
    reasons.push('Unusually high number of donations posted in the last 24 hours');
  }

  // Outlier quantity vs donor's own history
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
  // speed is a MINIMUM floor of 70 km/h (real speed can only be >= 70,
  // so this gives a worst-case/safe-upper-bound ETA — never underestimates)
  const MIN_SPEED_KMH = 70;
  return haversineDistanceKm(coordsA, coordsB) / MIN_SPEED_KMH;
}

function getEligibleNGOs(donationCoords, expiryDate, ngoList) {
  // ngoList = array of NGO docs with officeLocation.coordinates
  // returns only NGOs whose ETA <= remaining safe time, sorted by ETA ascending
  const remainingSafeHours = (new Date(expiryDate) - Date.now()) / (1000 * 60 * 60);
  return ngoList
    .map(ngo => ({ ngo, etaHours: calculateETAHours(donationCoords, ngo.officeLocation.coordinates) }))
    .filter(({ etaHours }) => etaHours <= remainingSafeHours)
    .sort((a, b) => a.etaHours - b.etaHours);
}

function getEligibleVolunteers(donorCoords, ngoCoords, volunteerList, maxKm = 50) {
  // returns volunteers within maxKm of BOTH donor and ngo location
  return volunteerList.filter(v => {
    const toDonor = haversineDistanceKm(donorCoords, v.location.coordinates);
    const toNGO = haversineDistanceKm(ngoCoords, v.location.coordinates);
    return toDonor <= maxKm && toNGO <= maxKm;
  });
}

module.exports = {
  haversineDistanceKm,
  recommendNearestNGOs,
  sortByPriority,
  predictDemand,
  detectDuplicateOrSuspicious,
  calculateETAHours,
  getEligibleNGOs,
  getEligibleVolunteers,
};

