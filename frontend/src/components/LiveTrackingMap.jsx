// components/LiveTrackingMap.jsx
// Shows a live-updating map of the assigned volunteer's position as they
// travel from the donor's pickup point toward the receiving organization
// (NGO). Polls the backend every few seconds for the volunteer's latest
// GPS ping and animates the marker to the new position.

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { FiRadio, FiClock, FiAlertTriangle } from 'react-icons/fi';
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
    width: 22px; height: 22px; border-radius: 9999px;
    background: #16a34a; border: 3px solid white;
    box-shadow: 0 0 0 4px rgba(22,163,74,0.35), 0 2px 6px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const POLL_INTERVAL_MS = 6000; // how often to check for a new volunteer position

/** Helper to safely convert [lng, lat] from GeoJSON into Leaflet [lat, lng], rejecting [0,0] ocean coords */
function parseLatLng(coords) {
  if (!coords || !Array.isArray(coords) || coords.length !== 2) return null;
  const [lng, lat] = coords.map(Number);
  // Ignore Null Island [0,0] or out-of-range coordinates
  if (Math.abs(lng) < 0.0001 && Math.abs(lat) < 0.0001) return null;
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lat, lng]; // Leaflet format
}

const RecenterOnMove = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, map.getZoom(), { duration: 1 });
  }, [position?.[0], position?.[1]]);
  return null;
};

const LiveTrackingMap = ({ donationId, height = '320px' }) => {
  const [trackData, setTrackData] = useState(null);
  const [error, setError] = useState('');
  const intervalRef = useRef(null);

  const poll = async () => {
    try {
      const { data } = await trackDonation(donationId);
      setTrackData(data.data);
      setError('');
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
  // Default map center: volunteer position if valid -> pickup location -> India fallback
  const center = volunteerPos || pickup || [13.0827, 80.2707];

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-200">
          <FiRadio className={volunteerPos && !trackData.isStale ? 'animate-pulse text-primary-500' : 'text-gray-400'} />
          {trackData.volunteer?.name || 'Volunteer'} is on the way
        </span>
        {trackData.lastUpdated && (
          <span className="text-xs text-gray-400">
            {trackData.isStale ? '⚠ Last seen ' : 'Updated '}
            {new Date(trackData.lastUpdated).toLocaleTimeString()}
          </span>
        )}
      </div>

      {!volunteerPos && (
        <p className="mb-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <span>📍 Map centered at Pickup Point. Waiting for volunteer device GPS signal...</span>
        </p>
      )}

      <div style={{ height }} className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
        <MapContainer center={center} zoom={volunteerPos ? 15 : 14} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {pickup && (
            <Marker position={pickup}>
              <Popup>📦 Pickup Location: {trackData.pickupLocation?.address}</Popup>
            </Marker>
          )}
          {volunteerPos && (
            <Marker position={volunteerPos} icon={volunteerIcon}>
              <Popup>
                <strong>{trackData.volunteer?.name}</strong>
                <br />
                Phone: {trackData.volunteer?.phone}
                <br />
                {trackData.isStale ? 'Last known position' : 'Live GPS position'}
              </Popup>
            </Marker>
          )}
          <RecenterOnMove position={volunteerPos || pickup} />
        </MapContainer>
      </div>
      <p className="mt-1 text-xs text-gray-400">Refreshes automatically every few seconds.</p>
    </div>
  );
};

export default LiveTrackingMap;
