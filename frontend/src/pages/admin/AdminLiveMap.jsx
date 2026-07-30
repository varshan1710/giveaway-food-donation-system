// pages/admin/AdminLiveMap.jsx
// Real-time admin map showing:
//  🟢 Active tracking volunteers (green pulsing markers)
//  🔴 Pending/unassigned donations (red markers)
//  🔵 In-progress donations with assigned volunteer (blue markers)
// Auto-refreshes every 15 seconds. Uses React-Leaflet + OpenStreetMap.

import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import DashboardLayout from '../../components/DashboardLayout';
import Loader from '../../components/Loader';
import { getLiveVolunteers, getAllDonationsAdmin } from '../../services/otherServices';
import {
  FiRadio,
  FiPackage,
  FiUsers,
  FiMapPin,
  FiRefreshCw,
  FiWifi,
  FiAlertTriangle,
} from 'react-icons/fi';

// Fix Leaflet default icon URLs broken by Vite bundler
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const REFRESH_INTERVAL_MS = 15000;

// ── Custom marker icons ─────────────────────────────────────────────────────
const makeCircleIcon = (color, pulse = false, size = 20) =>
  L.divIcon({
    className: '',
    html: `
      <div style="position:relative; width:${size}px; height:${size}px;">
        ${pulse ? `<div style="
          position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
          width:${size + 12}px; height:${size + 12}px; border-radius:50%;
          background:${color}33; animation: ping 1.5s cubic-bezier(0,0,0.2,1) infinite;
        "></div>` : ''}
        <div style="
          position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
          width:${size}px; height:${size}px; border-radius:50%;
          background:${color}; border:3px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,0.3);
        "></div>
      </div>
    `,
    iconSize: [size + 12, size + 12],
    iconAnchor: [(size + 12) / 2, (size + 12) / 2],
  });

const volunteerIcon = (isStale) =>
  makeCircleIcon(isStale ? '#f59e0b' : '#16a34a', !isStale, 18);

const pendingDonationIcon = makeCircleIcon('#ef4444', false, 16);
const activeDonationIcon = makeCircleIcon('#3b82f6', false, 16);

// ── Parse coordinates safely ────────────────────────────────────────────────
function parseLatLng(coords) {
  if (!coords || !Array.isArray(coords) || coords.length !== 2) return null;
  const [lng, lat] = coords.map(Number);
  if (Math.abs(lng) < 0.0001 && Math.abs(lat) < 0.0001) return null;
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lat, lng]; // Leaflet [lat, lng]
}

// ── Auto-fit bounds on data load ────────────────────────────────────────────
const AutoFitBounds = ({ positions }) => {
  const map = useMap();
  useEffect(() => {
    const valid = positions.filter(Boolean);
    if (valid.length === 0) return;
    if (valid.length === 1) {
      map.setView(valid[0], 14);
    } else {
      map.fitBounds(valid, { padding: [50, 50], maxZoom: 14 });
    }
  }, [positions.length]); // eslint-disable-line
  return null;
};

// ── Status badge helper ─────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const colors = {
    available: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
    busy: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
    offline: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${colors[status] || colors.offline}`}>
      {status}
    </span>
  );
};

// ── Main Component ──────────────────────────────────────────────────────────
const AdminLiveMap = () => {
  const [volunteers, setVolunteers] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [error, setError] = useState('');
  const intervalRef = useRef(null);

  const fetchData = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    setError('');
    try {
      const [volRes, donRes] = await Promise.all([
        getLiveVolunteers(),
        getAllDonationsAdmin({ status: 'pending' }),
      ]);
      setVolunteers(volRes.data.data || []);

      // Combine pending + active donations for the map
      const pendingDons = donRes.data.data || [];
      // Separately fetch active donations
      const activeDonRes = await getAllDonationsAdmin({ status: 'out_for_pickup' });
      const pickedUpRes = await getAllDonationsAdmin({ status: 'picked_up' });
      setDonations([
        ...pendingDons.map(d => ({ ...d, _mapType: 'pending' })),
        ...(activeDonRes.data.data || []).map(d => ({ ...d, _mapType: 'active' })),
        ...(pickedUpRes.data.data || []).map(d => ({ ...d, _mapType: 'active' })),
      ]);
      setLastRefresh(new Date());
    } catch (err) {
      setError('Failed to load live data. Check your connection.');
      console.error('[AdminLiveMap] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(true);
    intervalRef.current = setInterval(() => fetchData(false), REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [fetchData]);

  // Build all positions for auto-fit
  const allPositions = [
    ...volunteers.map(v => parseLatLng(v.coordinates)),
    ...donations.map(d => parseLatLng(d.pickupLocation?.coordinates)),
  ].filter(Boolean);

  // Stats for header
  const onlineCount = volunteers.filter(v => !v.isStale).length;
  const staleCount = volunteers.filter(v => v.isStale).length;
  const pendingCount = donations.filter(d => d._mapType === 'pending').length;
  const activeCount = donations.filter(d => d._mapType === 'active').length;

  return (
    <DashboardLayout>
      {/* ── Page Header ── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50 flex items-center gap-2">
            <FiMapPin className="text-primary-500" /> Live Operations Map
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Real-time volunteer locations and donation status. Auto-refreshes every 15 seconds.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => fetchData(true)}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
          >
            <FiRefreshCw className={loading ? 'animate-spin' : ''} size={13} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-900/20">
          <div className="rounded-lg bg-emerald-500/20 p-2">
            <FiWifi className="text-emerald-600 dark:text-emerald-400" size={18} />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Live Volunteers</p>
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{onlineCount}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
          <div className="rounded-lg bg-amber-500/20 p-2">
            <FiUsers className="text-amber-600 dark:text-amber-400" size={18} />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Stale / Idle</p>
            <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{staleCount}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
          <div className="rounded-lg bg-red-500/20 p-2">
            <FiPackage className="text-red-600 dark:text-red-400" size={18} />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Pending Donations</p>
            <p className="text-xl font-bold text-red-700 dark:text-red-300">{pendingCount}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
          <div className="rounded-lg bg-blue-500/20 p-2">
            <FiRadio className="text-blue-600 dark:text-blue-400 animate-pulse" size={18} />
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">In Progress</p>
            <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{activeCount}</p>
          </div>
        </div>
      </div>

      {/* ── Map Legend ── */}
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-emerald-300"></span>
          Live volunteer
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-amber-500"></span>
          Stale / no recent GPS
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-red-500"></span>
          Pending donation
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-blue-500"></span>
          Active pickup/delivery
        </span>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
          <FiAlertTriangle />
          {error}
        </div>
      )}

      {/* ── Map ── */}
      {loading && volunteers.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <Loader />
        </div>
      ) : (
        <div
          className="overflow-hidden rounded-2xl border border-gray-200 shadow-lg dark:border-gray-700"
          style={{ height: '520px' }}
        >
          <MapContainer
            center={allPositions[0] || [20.5937, 78.9629]} // India center fallback
            zoom={allPositions.length > 0 ? 12 : 5}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Auto-fit map bounds to all markers */}
            <AutoFitBounds positions={allPositions} />

            {/* ── Volunteer markers ── */}
            {volunteers.map((v) => {
              const pos = parseLatLng(v.coordinates);
              if (!pos) return null;
              return (
                <Marker key={v.volunteerId} position={pos} icon={volunteerIcon(v.isStale)}>
                  <Popup minWidth={200}>
                    <div className="text-sm space-y-1.5">
                      <p className="font-bold text-base">{v.name}</p>
                      {v.phone && (
                        <p className="text-gray-600">
                          📞 <a href={`tel:${v.phone}`} className="text-blue-600 hover:underline">{v.phone}</a>
                        </p>
                      )}
                      <p>
                        Status:{' '}
                        <span className={`font-semibold capitalize ${
                          v.availabilityStatus === 'available' ? 'text-emerald-600' :
                          v.availabilityStatus === 'busy' ? 'text-amber-600' : 'text-gray-500'
                        }`}>
                          {v.availabilityStatus}
                        </span>
                      </p>
                      <p className="text-gray-500 capitalize">Vehicle: {v.vehicleType}</p>
                      <p className="text-gray-500">Pickups done: {v.totalPickupsCompleted}</p>
                      {v.lastLocationUpdate && (
                        <p className={`text-xs ${v.isStale ? 'text-amber-600' : 'text-gray-400'}`}>
                          {v.isStale ? '⚠ ' : '🟢 '}
                          GPS: {new Date(v.lastLocationUpdate).toLocaleTimeString()}
                          {v.isStale && ' (stale >3 min)'}
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* ── Donation markers ── */}
            {donations.map((d) => {
              const pos = parseLatLng(d.pickupLocation?.coordinates);
              if (!pos) return null;
              const isPending = d._mapType === 'pending';
              return (
                <Marker
                  key={d._id}
                  position={pos}
                  icon={isPending ? pendingDonationIcon : activeDonationIcon}
                >
                  <Popup minWidth={200}>
                    <div className="text-sm space-y-1">
                      <p className="font-bold text-base">{d.foodName}</p>
                      <p className="text-gray-500 capitalize">{d.category}</p>
                      <p>
                        Status:{' '}
                        <span className={`font-semibold capitalize ${
                          isPending ? 'text-red-600' : 'text-blue-600'
                        }`}>
                          {d.status?.replace(/_/g, ' ')}
                        </span>
                      </p>
                      <p className="text-gray-600">📦 {d.quantity?.value} {d.quantity?.unit}</p>
                      {d.pickupLocation?.address && (
                        <p className="text-gray-500 text-xs">📍 {d.pickupLocation.address}</p>
                      )}
                      {d.assignedVolunteer && (
                        <p className="text-emerald-600 font-medium">
                          🛵 Volunteer: {d.assignedVolunteer.name || 'Assigned'}
                        </p>
                      )}
                      {d.donor?.name && (
                        <p className="text-gray-500 text-xs">Donor: {d.donor.name}</p>
                      )}
                      <p className="text-amber-600 text-xs">
                        Expires: {new Date(d.expiryDate).toLocaleTimeString()}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      )}

      {/* ── Volunteer list table ── */}
      <div className="mt-6">
        <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-50">
          Active Volunteers ({volunteers.length})
        </h2>
        {volunteers.length === 0 ? (
          <div className="card text-center text-sm text-gray-500 dark:text-gray-400">
            No volunteers are currently tracking. Volunteers need to click "Start Tracking" in their dashboard.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Phone</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Vehicle</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">GPS Updated</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600 dark:text-gray-300">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-700 dark:bg-gray-900">
                {volunteers.map((v) => (
                  <tr key={v.volunteerId} className="hover:bg-gray-50 dark:hover:bg-gray-800/60 transition">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{v.name}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{v.phone || '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={v.availabilityStatus} />
                    </td>
                    <td className="px-4 py-3 capitalize text-gray-600 dark:text-gray-400">{v.vehicleType}</td>
                    <td className="px-4 py-3">
                      {v.lastLocationUpdate ? (
                        <span className={v.isStale ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>
                          {v.isStale ? '⚠ ' : '🟢 '}
                          {new Date(v.lastLocationUpdate).toLocaleTimeString()}
                        </span>
                      ) : (
                        <span className="text-gray-400">No GPS yet</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 font-mono">
                      {v.coordinates
                        ? `${v.coordinates[1].toFixed(4)}, ${v.coordinates[0].toFixed(4)}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminLiveMap;
