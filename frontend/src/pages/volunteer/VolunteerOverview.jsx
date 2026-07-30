// pages/volunteer/VolunteerOverview.jsx
// Enhanced with:
//  - Start/Stop Tracking toggle (calls backend, starts GPS beacon)
//  - Nearby donation notification polling (every 10s while tracking)
//  - Browser Notification API for new nearby donations
//  - In-app notification modal with Accept / Decline buttons (first-accept-wins)

import { useEffect, useState, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  FiTruck,
  FiCheckCircle,
  FiStar,
  FiRadio,
  FiWifiOff,
  FiMapPin,
  FiBell,
  FiX,
  FiNavigation,
  FiClock,
  FiPackage,
} from 'react-icons/fi';
import DashboardLayout from '../../components/DashboardLayout';
import StatCard from '../../components/StatCard';
import DonationCard from '../../components/DonationCard';
import Loader from '../../components/Loader';
import VolunteerTrackingBeacon from '../../components/VolunteerTrackingBeacon';
import {
  getMyPickups,
  getMyVolunteerProfile,
  startTracking,
  stopTracking,
  getNearbyDonations,
  volunteerAcceptDonation,
} from '../../services/otherServices';

const POLL_INTERVAL_MS = 10000; // poll nearby donations every 10 seconds

// ── Browser Notification permission helper ──────────────────────────────────
async function requestBrowserNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

function fireBrowserNotification(donation) {
  if (Notification.permission !== 'granted') return;
  const n = new Notification('🍱 New Food Donation Nearby!', {
    body: `${donation.foodName} — ${donation.distanceKm ?? '?'} km away\nPickup: ${donation.pickupLocation?.address}\nExpiry: ${new Date(donation.expiryDate).toLocaleTimeString()}`,
    icon: '/favicon.ico',
    tag: donation._id, // prevent duplicate notifications for same donation
  });
  n.onclick = () => window.focus();
}

// ── Notification Modal ──────────────────────────────────────────────────────
const NearbyDonationModal = ({ donations, onAccept, onDecline, onDismissAll }) => {
  if (!donations.length) return null;
  const d = donations[0]; // show one at a time

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl border border-emerald-200 bg-white shadow-2xl dark:border-emerald-800 dark:bg-gray-900 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4">
          <div className="flex items-center gap-2 text-white">
            <FiBell className="animate-bounce" size={20} />
            <span className="font-bold text-lg">New Food Donation Nearby!</span>
          </div>
          <button onClick={onDismissAll} className="text-white/80 hover:text-white transition">
            <FiX size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-emerald-100 dark:bg-emerald-900/40 p-3">
              <FiPackage className="text-emerald-600 dark:text-emerald-400" size={24} />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-gray-50 text-lg">{d.foodName}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{d.category}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                <FiMapPin size={10} className="inline mr-1" />Location
              </p>
              <p className="text-gray-800 dark:text-gray-200 font-medium">{d.pickupLocation?.address || 'N/A'}</p>
            </div>
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                <FiNavigation size={10} className="inline mr-1" />Distance
              </p>
              <p className="text-emerald-700 dark:text-emerald-400 font-bold text-lg">
                {d.distanceKm != null ? `${d.distanceKm} km` : '—'}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                <FiPackage size={10} className="inline mr-1" />Quantity
              </p>
              <p className="text-gray-800 dark:text-gray-200 font-medium">
                {d.quantity?.value} {d.quantity?.unit}
              </p>
            </div>
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                <FiClock size={10} className="inline mr-1" />Expires
              </p>
              <p className="text-amber-700 dark:text-amber-400 font-medium text-sm">
                {new Date(d.expiryDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          {d.donor?.name && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Donated by: <strong className="text-gray-700 dark:text-gray-200">{d.donor.name}</strong>
              {d.donor.address && ` · ${d.donor.address}`}
            </p>
          )}

          {donations.length > 1 && (
            <p className="text-xs text-blue-600 dark:text-blue-400 text-center">
              +{donations.length - 1} more nearby donation{donations.length > 2 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 pb-5">
          <button
            onClick={() => onDecline(d._id)}
            className="flex-1 rounded-xl border border-gray-300 bg-white py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Decline
          </button>
          <button
            onClick={() => onAccept(d._id)}
            className="flex-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 text-sm font-bold text-white transition hover:opacity-90 shadow-lg"
          >
            ✅ Accept Pickup
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────────────────────
const VolunteerOverview = () => {
  const [pickups, setPickups] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Tracking state
  const [isTracking, setIsTracking] = useState(false);
  const [trackingLoading, setTrackingLoading] = useState(false);

  // Nearby donation notifications
  const [nearbyDonations, setNearbyDonations] = useState([]);
  const [declinedIds, setDeclinedIds] = useState(new Set());
  const [acceptingId, setAcceptingId] = useState(null);
  const pollRef = useRef(null);
  const notifiedIdsRef = useRef(new Set()); // track which IDs already got browser notification

  // ── Load initial data ──────────────────────────────────────────────────
  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getMyPickups({ status: 'out_for_pickup' }), getMyVolunteerProfile()])
      .then(([pickupsRes, profileRes]) => {
        setPickups(pickupsRes.data.data);
        const prof = profileRes.data.data;
        setProfile(prof);
        // Restore tracking state from profile
        setIsTracking(prof.trackingEnabled || false);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    requestBrowserNotificationPermission();
  }, [load]);

  // ── Nearby donation poll (runs only while tracking) ────────────────────
  const pollNearby = useCallback(async () => {
    try {
      const { data } = await getNearbyDonations(5);
      const fresh = (data.data || []).filter((d) => !declinedIds.has(d._id));
      setNearbyDonations(fresh);

      // Fire browser notification for truly new donations
      fresh.forEach((d) => {
        if (!notifiedIdsRef.current.has(d._id)) {
          notifiedIdsRef.current.add(d._id);
          fireBrowserNotification(d);
        }
      });
    } catch {
      // silent
    }
  }, [declinedIds]);

  useEffect(() => {
    if (isTracking) {
      pollNearby(); // immediate first poll
      pollRef.current = setInterval(pollNearby, POLL_INTERVAL_MS);
    } else {
      clearInterval(pollRef.current);
      setNearbyDonations([]);
    }
    return () => clearInterval(pollRef.current);
  }, [isTracking, pollNearby]);

  // ── Start / Stop Tracking ──────────────────────────────────────────────
  const handleStartTracking = async () => {
    setTrackingLoading(true);
    try {
      await startTracking();
      setIsTracking(true);
      toast.success('🟢 Tracking started! You will be notified of nearby donations.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start tracking');
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleStopTracking = async () => {
    setTrackingLoading(true);
    try {
      await stopTracking();
      setIsTracking(false);
      setNearbyDonations([]);
      notifiedIdsRef.current.clear();
      toast('🔴 Tracking stopped. You won\'t receive new donation alerts.', { icon: '📴' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not stop tracking');
    } finally {
      setTrackingLoading(false);
    }
  };

  // ── Accept donation (first-accept-wins) ───────────────────────────────
  const handleAccept = async (donationId) => {
    setAcceptingId(donationId);
    try {
      await volunteerAcceptDonation(donationId);
      toast.success('✅ Donation accepted! Head to the pickup location.');
      // Remove from nearby list and reload pickups
      setNearbyDonations((prev) => prev.filter((d) => d._id !== donationId));
      load();
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not accept donation';
      if (msg.toLowerCase().includes('no longer available')) {
        toast.error('⚡ Sorry — another volunteer accepted it first!');
        setNearbyDonations((prev) => prev.filter((d) => d._id !== donationId));
      } else {
        toast.error(msg);
      }
    } finally {
      setAcceptingId(null);
    }
  };

  // ── Decline: just hide from this volunteer's view ─────────────────────
  const handleDecline = (donationId) => {
    setDeclinedIds((prev) => new Set(prev).add(donationId));
    setNearbyDonations((prev) => prev.filter((d) => d._id !== donationId));
    toast('Donation declined. You can find it in the list if you change your mind.', { icon: '↩️' });
  };

  const handleDismissAll = () => {
    nearbyDonations.forEach((d) => declinedIds.add(d._id));
    setDeclinedIds(new Set(declinedIds));
    setNearbyDonations([]);
  };

  return (
    <DashboardLayout>
      {/* ── Nearby donation notification modal ── */}
      {nearbyDonations.length > 0 && (
        <NearbyDonationModal
          donations={nearbyDonations}
          onAccept={handleAccept}
          onDecline={handleDecline}
          onDismissAll={handleDismissAll}
        />
      )}

      {/* ── Header ── */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Volunteer Overview</h1>
          {profile && !profile.isApproved && (
            <span className="badge bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 mt-1 inline-block">
              Pending admin approval
            </span>
          )}
        </div>

        {/* ── Start / Stop Tracking Button ── */}
        <div className="flex flex-col items-end gap-2">
          {isTracking ? (
            <button
              onClick={handleStopTracking}
              disabled={trackingLoading}
              className="flex items-center gap-2 rounded-xl border-2 border-red-400 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-100 dark:border-red-600 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
            >
              <FiWifiOff size={16} />
              {trackingLoading ? 'Stopping…' : 'Stop Tracking'}
            </button>
          ) : (
            <button
              onClick={handleStartTracking}
              disabled={trackingLoading}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition hover:opacity-90"
            >
              <FiRadio className={trackingLoading ? 'animate-pulse' : ''} size={16} />
              {trackingLoading ? 'Starting…' : '▶ Start Tracking'}
            </button>
          )}

          {/* GPS Beacon Status Pill */}
          <VolunteerTrackingBeacon isTracking={isTracking} />

          {isTracking && (
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[260px] text-right">
              📡 Scanning for nearby donations within 5 km every 10 seconds
            </p>
          )}
        </div>
      </div>

      {/* ── Notification bell indicator ── */}
      {isTracking && nearbyDonations.length === 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-2.5 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
          <FiBell className="animate-pulse" size={16} />
          <span>Listening for nearby donations… You'll be notified automatically.</span>
        </div>
      )}

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <StatCard icon={FiTruck} label="Active Pickups" value={pickups.length} accent="primary" />
        <StatCard icon={FiCheckCircle} label="Completed Pickups" value={profile?.totalPickupsCompleted || 0} accent="blue" />
        <StatCard icon={FiStar} label="Rating" value={profile?.rating?.toFixed(1) || '—'} accent="accent" />
      </div>

      {/* ── Tracking status summary ── */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          <FiRadio size={14} /> Tracking Status
        </h2>
        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Live Tracking: </span>
            {isTracking ? (
              <span className="font-bold text-emerald-600 dark:text-emerald-400">🟢 Active</span>
            ) : (
              <span className="font-bold text-gray-400">🔴 Offline</span>
            )}
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Status: </span>
            <span className={`font-bold capitalize ${
              profile?.availabilityStatus === 'available' ? 'text-emerald-600 dark:text-emerald-400' :
              profile?.availabilityStatus === 'busy' ? 'text-amber-600 dark:text-amber-400' :
              'text-gray-400'
            }`}>
              {profile?.availabilityStatus || 'offline'}
            </span>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Vehicle: </span>
            <span className="font-semibold capitalize text-gray-700 dark:text-gray-200">
              {profile?.vehicleType || '—'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Assigned Pickups ── */}
      <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-50">Assigned Pickups</h2>
      {loading ? (
        <Loader />
      ) : pickups.length === 0 ? (
        <div className="card text-center text-sm text-gray-500 dark:text-gray-400">
          No active pickups assigned to you.{' '}
          {!isTracking && (
            <span>
              Click <strong>Start Tracking</strong> to receive nearby donation alerts.
            </span>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {pickups.map((d) => (
            <DonationCard key={d._id} donation={d} />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default VolunteerOverview;
