// components/LiveTrackingMap.jsx
// Shows a live-updating Google Maps-style navigation HUD of the assigned volunteer's position as they
// travel from the donor's pickup point toward the receiving organization (NGO).
// Features dynamic movement speed calculation (0 km/h when stationary), Gemini AI ETA, distance, and traffic.

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { FiRadio, FiClock, FiAlertTriangle, FiNavigation, FiMapPin, FiTruck, FiZap } from 'react-icons/fi';
import { trackDonation } from '../services/donationService';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom pulsing icon for the "live" volunteer marker
const volunteerIcon = L.divIcon({
  className: '',
  html: `<div style="
    width: 26px; height: 26px; border-radius: 9999px;
    background: #16a34a; border: 3px solid white;
    box-shadow: 0 0 0 6px rgba(22,163,74,0.35), 0 2px 8px rgba(0,0,0,0.3);
    display: flex; align-items: center; justify-content: center;
    color: white; font-size: 12px; font-weight: bold;
  ">🛵</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

const POLL_INTERVAL_MS = 6000; // how often to check for a new volunteer position

/** Haversine distance helper in kilometers between two [lat, lng] points */
function calculateDistanceKm([lat1, lng1], [lat2, lng2]) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/** Helper to safely convert [lng, lat] from GeoJSON into Leaflet [lat, lng], rejecting [0,0] ocean coords */
function parseLatLng(coords) {
  if (!coords || !Array.isArray(coords) || coords.length !== 2) return null;
  const [lng, lat] = coords.map(Number);
  if (Math.abs(lng) < 0.0001 && Math.abs(lat) < 0.0001) return null;
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lat, lng]; // Leaflet format
}

const FitRouteBounds = ({ positions }) => {
  const map = useMap();
  useEffect(() => {
    const valid = positions.filter(Boolean);
    if (valid.length === 0) return;
    if (valid.length === 1) {
      map.setView(valid[0], 14);
    } else {
      map.fitBounds(valid, { padding: [40, 40], maxZoom: 15 });
    }
  }, [positions.map(p => p?.join(',')).join('|')]); // eslint-disable-line
  return null;
};

const LiveTrackingMap = ({ donationId, height = '360px' }) => {
  const [trackData, setTrackData] = useState(null);
  const [error, setError] = useState('');
  const [liveSpeed, setLiveSpeed] = useState(0); // 0 km/h if stationary
  const [isMoving, setIsMoving] = useState(false);

  const prevPosRef = useRef(null);
  const prevTimeRef = useRef(null);
  const intervalRef = useRef(null);

  const poll = async () => {
    try {
      const { data } = await trackDonation(donationId);
      const resData = data.data;
      setTrackData(resData);
      setError('');

      // ── Calculate Real-Time Speed ──────────────────────────────────────────
      const currentPos = parseLatLng(resData?.liveLocation);
      const currentTime = Date.now();

      if (currentPos && prevPosRef.current && prevTimeRef.current) {
        const movedDistKm = calculateDistanceKm(prevPosRef.current, currentPos);
        const timeDiffSec = (currentTime - prevTimeRef.current) / 1000;

        if (movedDistKm > 0.005 && timeDiffSec > 0) { // moved > 5 meters
          const calcSpeedKmh = Math.min(80, Math.round((movedDistKm / timeDiffSec) * 3600));
          setLiveSpeed(calcSpeedKmh > 0 ? calcSpeedKmh : 0);
          setIsMoving(calcSpeedKmh > 2);
        } else {
          // Stationary / hasn't moved a single step
          setLiveSpeed(0);
          setIsMoving(false);
        }
      } else {
        setLiveSpeed(0);
        setIsMoving(false);
      }

      if (currentPos) {
        prevPosRef.current = currentPos;
        prevTimeRef.current = currentTime;
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load tracking data');
    }
  };

  useEffect(() => {
    poll(); // immediate first fetch
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [donationId]);

  if (error) {
    return (
      <div className="card flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
        <FiAlertTriangle /> {error}
      </div>
    );
  }

  if (!trackData) {
    return <div className="card text-sm text-gray-500 dark:text-gray-400">Loading tracking info...</div>;
  }

  if (!trackData.trackingAvailable) {
    return (
      <div className="card flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <FiClock /> {trackData.reason}
      </div>
    );
  }

  const pickup = parseLatLng(trackData.pickupLocation?.coordinates);
  const volunteerPos = parseLatLng(trackData.liveLocation);
  const center = volunteerPos || pickup || [13.0827, 80.2707];

  const distanceKm = volunteerPos && pickup ? calculateDistanceKm(volunteerPos, pickup) : null;
  const etaPrediction = trackData.etaPrediction;
  const formattedEta = etaPrediction?.formattedEta || (distanceKm != null ? `${Math.max(2, Math.round((distanceKm / 30) * 60))} mins` : null);
  const trafficLevel = etaPrediction?.trafficLevel || 'Normal flow';

  return (
    <div className="space-y-3">
      {/* ── Google Maps-Style Navigation HUD Header ── */}
      <div className="rounded-2xl border border-gray-800 bg-gradient-to-r from-slate-900 via-gray-900 to-emerald-950 p-4 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-emerald-500/20 p-2 text-emerald-400">
              <FiNavigation className="animate-pulse" size={18} />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Google Maps Navigation HUD</p>
              <h3 className="font-bold text-base text-gray-100 flex items-center gap-2">
                {trackData.volunteer?.name || 'Volunteer'}
                <span className="text-xs text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
                  <FiRadio size={10} className="inline mr-1 animate-pulse" /> Live Tracking
                </span>
              </h3>
            </div>
          </div>
          {trackData.lastUpdated && (
            <span className="text-xs text-gray-400">
              {trackData.isStale ? '⚠ Last seen ' : 'GPS Updated '}
              {new Date(trackData.lastUpdated).toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-gray-800/60 p-2.5 border border-gray-700/50">
            <p className="text-[11px] text-gray-400 flex items-center gap-1"><FiNavigation size={11} /> Distance</p>
            <p className="text-base font-bold text-emerald-400">{distanceKm != null ? `${distanceKm} km` : 'Calculating...'}</p>
          </div>
          <div className="rounded-xl bg-gray-800/60 p-2.5 border border-gray-700/50">
            <p className="text-[11px] text-gray-400 flex items-center gap-1"><FiClock size={11} /> Gemini AI ETA</p>
            <p className="text-base font-bold text-amber-400">{formattedEta || 'Calculating...'}</p>
          </div>
          <div className="rounded-xl bg-gray-800/60 p-2.5 border border-gray-700/50">
            <p className="text-[11px] text-gray-400 flex items-center gap-1"><FiTruck size={11} /> Real Speed</p>
            <p className={`text-base font-bold ${isMoving ? 'text-emerald-400 animate-pulse' : 'text-gray-300'}`}>
              {liveSpeed > 0 ? `${liveSpeed} km/h` : '0 km/h (Stationary)'}
            </p>
          </div>
          <div className="rounded-xl bg-gray-800/60 p-2.5 border border-gray-700/50">
            <p className="text-[11px] text-gray-400 flex items-center gap-1"><FiZap size={11} /> Traffic Flow</p>
            <p className="text-xs font-semibold text-emerald-300 mt-1 truncate">{trafficLevel}</p>
          </div>
        </div>
      </div>

      {!volunteerPos && (
        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <FiMapPin size={12} />
          <span>Map centered at Pickup Point. Waiting for volunteer device GPS signal...</span>
        </p>
      )}

      {/* ── Interactive Map ── */}
      <div style={{ height }} className="relative overflow-hidden rounded-2xl border border-gray-200 shadow-md dark:border-gray-700">
        <MapContainer center={center} zoom={volunteerPos ? 14 : 13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Render Route Polyline connecting Volunteer & Pickup */}
          {volunteerPos && pickup && (
            <Polyline
              positions={[volunteerPos, pickup]}
              color="#059669"
              weight={5}
              dashArray="8, 8"
              opacity={0.85}
            />
          )}

          {pickup && (
            <Marker position={pickup}>
              <Popup>📦 Pickup Location: {trackData.pickupLocation?.address}</Popup>
            </Marker>
          )}

          {volunteerPos && (
            <Marker position={volunteerPos} icon={volunteerIcon}>
              <Popup>
                <strong>🛵 {trackData.volunteer?.name}</strong>
                <br />
                Phone: {trackData.volunteer?.phone}
                <br />
                Speed: {liveSpeed > 0 ? `${liveSpeed} km/h (In Transit)` : '0 km/h (Stationary)'}
                <br />
                {trackData.isStale ? 'Last known position' : 'Live GPS position'}
                {distanceKm != null && <><br />Distance to pickup: {distanceKm} km</>}
              </Popup>
            </Marker>
          )}

          <FitRouteBounds positions={[volunteerPos, pickup]} />
        </MapContainer>
      </div>
      <p className="text-xs text-gray-400">Google Maps-style navigation HUD updates automatically every few seconds.</p>
    </div>
  );
};

export default LiveTrackingMap;
