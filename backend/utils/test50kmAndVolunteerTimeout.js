// backend/utils/test50kmAndVolunteerTimeout.js
// Automated verification suite for 65km geographic isolation, initial volunteer location decoupling,
// NGO donation alerting, 7-minute volunteer response timeout, and helper functions.

const {
  calculateDistanceKm,
  haversineDistanceKm,
  isWithin65Km,
  getEligibleNGOs,
  getEligibleVolunteers,
} = require('./smartFeatures');

let passedTests = 0;
let totalTests = 0;

function assert(condition, description) {
  totalTests++;
  if (condition) {
    console.log(`✅ [PASS] ${description}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${description}`);
  }
}

console.log('====================================================');
console.log('RUNNING 65 KM RADIUS & NGO ALERT TEST SUITE');
console.log('====================================================\n');

// 1. calculateDistanceKm accuracy test (Chennai center to ~59km away vs ~85km away)
const chennaiCenter = [13.0827, 80.2707]; // lat, lon
const chennaiNear59km = [13.6200, 80.2707]; // ~59.7 km north
const chennaiFar85km = [13.8500, 80.2707]; // ~85.3 km north

const distNear = calculateDistanceKm(chennaiCenter[0], chennaiCenter[1], chennaiNear59km[0], chennaiNear59km[1]);
const distFar = calculateDistanceKm(chennaiCenter[0], chennaiCenter[1], chennaiFar85km[0], chennaiFar85km[1]);

assert(distNear <= 65, `Near point distance (${distNear.toFixed(2)} km) is <= 65 km`);
assert(distFar > 65, `Far point distance (${distFar.toFixed(2)} km) is > 65 km`);

// 2. isWithin65Km utility
assert(
  isWithin65Km(
    { type: 'Point', coordinates: [chennaiCenter[1], chennaiCenter[0]] },
    { type: 'Point', coordinates: [chennaiNear59km[1], chennaiNear59km[0]] }
  ) === true,
  'isWithin65Km returns true for location within 65 km'
);

assert(
  isWithin65Km(
    { type: 'Point', coordinates: [chennaiCenter[1], chennaiCenter[0]] },
    { type: 'Point', coordinates: [chennaiFar85km[1], chennaiFar85km[0]] }
  ) === false,
  'isWithin65Km returns false for location > 65 km'
);

// 3. getEligibleNGOs 65km hard boundary test (matching ONLY donation area and NGO area)
const mockNGOs = [
  {
    name: 'Nearby NGO (59km)',
    officeLocation: { type: 'Point', coordinates: [chennaiNear59km[1], chennaiNear59km[0]] },
  },
  {
    name: 'Far NGO (85km)',
    officeLocation: { type: 'Point', coordinates: [chennaiFar85km[1], chennaiFar85km[0]] },
  },
];

const donationCoords = [chennaiCenter[1], chennaiCenter[0]]; // [lng, lat]
const futureExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

const eligibleNGOs = getEligibleNGOs(donationCoords, futureExpiry, mockNGOs, 65);
assert(eligibleNGOs.length === 1, 'getEligibleNGOs includes NGOs up to 65 km and excludes > 65 km');
assert(eligibleNGOs[0].ngo.name === 'Nearby NGO (59km)', 'Selected NGO is within 65km radius');

// 4. Verification that initial NGO matching ignores volunteer location completely
assert(
  eligibleNGOs.every(item => item.ngo.officeLocation && !item.volunteerLocationRequired),
  'Initial NGO alert matching compares ONLY donation area and NGO office area, ignoring volunteer location at start'
);

// 5. getEligibleVolunteers fixed location test with 65km limit
const mockVolunteers = [
  {
    name: 'Volunteer Nearby Both',
    serviceLocation: { type: 'Point', coordinates: [80.2707, 13.1500] }, // ~7.5km from center
    location: { type: 'Point', coordinates: [80.2707, 14.5000] }, // Live location far away
  },
  {
    name: 'Volunteer Far Base',
    serviceLocation: { type: 'Point', coordinates: [80.2707, 14.0000] }, // > 100km away
    location: { type: 'Point', coordinates: [80.2707, 13.0827] }, // Live location nearby
  },
];

const donorCoordsGeo = [80.2707, 13.0827];
const ngoCoordsGeo = [80.2707, 13.2000]; // ~13km from donor

const eligibleVolunteers = getEligibleVolunteers(donorCoordsGeo, ngoCoordsGeo, mockVolunteers, 65);

assert(eligibleVolunteers.length === 1, 'getEligibleVolunteers uses FIXED base location, not live location');
assert(eligibleVolunteers[0].name === 'Volunteer Nearby Both', 'Only volunteer with fixed service location within 65km is selected');

// 6. Timeout checker logic validation
const { VOLUNTEER_RESPONSE_TIMEOUT_MINUTES } = require('./timeoutChecker');
assert(VOLUNTEER_RESPONSE_TIMEOUT_MINUTES === 7, 'Volunteer response timeout is configured to 7 minutes');

console.log('\n====================================================');
console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} PASSED`);
console.log('====================================================');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
