import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import toast from 'react-hot-toast';
import { FiSearch, FiPhone, FiRadio, FiCheckCircle, FiClock, FiAlertTriangle, FiUser } from 'react-icons/fi';
import { trackVolunteerByPhone } from '../services/donationService';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const volunteerIcon = L.divIcon({
  className: '',
  html: `<div style="
    width: 24px; height: 24px; border-radius: 9999px;
    background: #16a34a; border: 3px solid white;
    box-shadow: 0 0 0 5px rgba(22,163,74,0.35), 0 2px 6px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function parseLatLng(coords) {
  if (!coords || !Array.isArray(coords) || coords.length !== 2) return null;
  const [lng, lat] = coords.map(Number);
  if (Math.abs(lng) < 0.0001 && Math.abs(lat) < 0.0001) return null; // Reject Null Island [0,0]
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lat, lng];
}

const RecenterOnMove = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, map.getZoom(), { duration: 1 });
  }, [position?.[0], position?.[1]]);
  return null;
};

const VolunteerPhoneTracker = ({ defaultPhone = '', volunteersList = [] }) => {
  const [phoneQuery, setPhoneQuery] = useState(defaultPhone);
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const intervalRef = useRef(null);

  const fetchTracking = async (phoneToTrack) => {
    const targetPhone = phoneToTrack || phoneQuery;
    if (!targetPhone || !targetPhone.trim()) {
      toast.error('Please enter a volunteer phone number');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data } = await trackVolunteerByPhone(targetPhone.trim());
      setTrackingData(data.data);
      setError('');
    } catch (err) {
      setTrackingData(null);
      setError(err.response?.data?.message || 'Could not find volunteer with this phone number');
    } finally {
      setLoading(false);
    }
  };

  // Periodic polling every 5 seconds when tracking is active
  useEffect(() => {
    if (!trackingData?.volunteer?.phone) return undefined;

    intervalRef.current = setInterval(() => {
      trackVolunteerByPhone(trackingData.volunteer.phone)
        .then(({ data }) => {
          setTrackingData(data.data);
          setError('');
        })
        .catch(() => {});
    }, 5000);

    return () => clearInterval(intervalRef.current);
  }, [trackingData?.volunteer?.phone]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTracking(phoneQuery);
  };

  const handleSelectVolunteer = (phone) => {
    setPhoneQuery(phone);
    fetchTracking(phone);
  };

  const volunteerPos = parseLatLng(trackingData?.liveLocation);
  const firstPickup = parseLatLng(trackingData?.activePickups?.[0]?.pickupLocation?.coordinates);
  const mapCenter = volunteerPos || firstPickup || [13.0827, 80.2707];

  return (
    <div className="card space-y-4 border-2 border-emerald-500/20 bg-gradient-to-br from-emerald-50/30 to-transparent dark:border-emerald-500/10 dark:from-emerald-950/20">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 dark:border-gray-800">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-50">
            <FiRadio className="animate-pulse text-emerald-600" />
            Live Volunteer Tracking by Phone Number
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Track any assigned volunteer's real-time GPS location by entering or selecting their phone number below.
          </p>
        </div>
      </div>

      <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <FiPhone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="tel"
            className="input-field pl-9 text-sm"
            placeholder="Enter volunteer phone e.g. +918870410206"
            value={phoneQuery}
            onChange={(e) => setPhoneQuery(e.target.value)}
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary shrink-0 text-sm !py-2">
          <FiSearch size={15} />
          {loading ? 'Locating...' : 'Track Phone'}
        </button>

        {volunteersList.length > 0 && (
          <div className="w-full flex items-center gap-2 pt-1 flex-wrap">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Quick Track:</span>
            {volunteersList.map((v) => {
              const phone = v.user?.phone || v.phone;
              if (!phone) return null;
              return (
                <button
                  type="button"
                  key={v._id || phone}
                  onClick={() => handleSelectVolunteer(phone)}
                  className="rounded-full border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:border-emerald-500 hover:text-emerald-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                >
                  📞 {v.user?.name || 'Volunteer'}: {phone}
                </button>
              );
            })}
          </div>
        )}
      </form>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300 flex items-center gap-2">
          <FiAlertTriangle className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {trackingData && (
        <div className="space-y-3 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-sm dark:border-emerald-800 dark:bg-emerald-900/20">
            <div>
              <p className="font-bold text-gray-900 dark:text-gray-50 flex items-center gap-2">
                <FiUser className="text-emerald-600" />
                {trackingData.volunteer.name}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                Phone: <strong className="text-emerald-700 dark:text-emerald-400">{trackingData.volunteer.phone}</strong>
              </p>
            </div>
            <div className="text-right">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                volunteerPos && !trackingData.isStale
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
              }`}>
                <FiRadio className={volunteerPos && !trackingData.isStale ? 'animate-pulse text-emerald-600' : ''} />
                {volunteerPos ? (trackingData.isStale ? 'Last known GPS' : 'Live GPS Signal Active') : 'GPS Signal Pending'}
              </span>
              {trackingData.lastUpdated && (
                <p className="text-xs text-gray-400 mt-1">
                  Updated: {new Date(trackingData.lastUpdated).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>

          {trackingData.activePickups && trackingData.activePickups.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                📦 Active Assigned Pickups ({trackingData.activePickups.length})
              </p>
              {trackingData.activePickups.map((pickup) => (
                <div key={pickup._id} className="rounded-lg border border-gray-200 bg-white p-2.5 text-xs dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{pickup.foodName}</span>
                    <span className="badge bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 capitalize">
                      {pickup.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 mt-0.5">Pickup: {pickup.pickupLocation?.address}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              No active pickups currently assigned to this volunteer.
            </p>
          )}

          <div style={{ height: '300px' }} className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
            <MapContainer
              center={mapCenter}
              zoom={volunteerPos ? 15 : 13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {volunteerPos && (
                <Marker position={volunteerPos} icon={volunteerIcon}>
                  <Popup>
                    <strong>🛵 {trackingData.volunteer.name}</strong><br />
                    Phone: {trackingData.volunteer.phone}<br />
                    {trackingData.isStale ? 'Last known position' : 'Live GPS position'}
                  </Popup>
                </Marker>
              )}
              {trackingData.activePickups?.map((p) => {
                const pickupPos = parseLatLng(p.pickupLocation?.coordinates);
                if (!pickupPos) return null;
                return (
                  <Marker key={p._id} position={pickupPos}>
                    <Popup>
                      <strong>📦 Pickup Point: {p.foodName}</strong><br />
                      Address: {p.pickupLocation.address}
                    </Popup>
                  </Marker>
                );
              })}
              <RecenterOnMove position={mapCenter} />
            </MapContainer>
          </div>
          <p className="text-xs text-gray-400 text-right">Auto-refreshes every 5 seconds.</p>
        </div>
      )}
    </div>
  );
};

export default VolunteerPhoneTracker;
