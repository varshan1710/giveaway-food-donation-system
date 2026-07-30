// components/VolunteerTrackingBeacon.jsx
// Reusable GPS beacon: requests geolocation permission, sends coords to
// backend every BEACON_INTERVAL_MS, and shows a live status pill.

import { useState, useEffect, useRef, useCallback } from 'react';
import { FiRadio, FiWifiOff, FiMapPin } from 'react-icons/fi';
import { updateVolunteerLocation } from '../services/otherServices';

const BEACON_INTERVAL_MS = 12000; // send GPS every 12 seconds

const VolunteerTrackingBeacon = ({ isTracking, onLocationUpdate }) => {
  const [gpsStatus, setGpsStatus] = useState('idle'); // 'idle' | 'acquiring' | 'active' | 'denied' | 'error'
  const [lastCoords, setLastCoords] = useState(null);
  const [lastSentAt, setLastSentAt] = useState(null);
  const watchIdRef = useRef(null);
  const intervalRef = useRef(null);
  const latestCoordsRef = useRef(null); // keep latest coords without triggering re-render

  const sendLocation = useCallback(async (coords) => {
    try {
      await updateVolunteerLocation(coords);
      setLastSentAt(new Date());
      if (onLocationUpdate) onLocationUpdate(coords);
    } catch {
      // silent — don't disrupt the UX for a failed beacon
    }
  }, [onLocationUpdate]);

  useEffect(() => {
    if (!isTracking) {
      // Stop everything
      if (watchIdRef.current) {
        navigator.geolocation?.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      clearInterval(intervalRef.current);
      setGpsStatus('idle');
      setLastCoords(null);
      return;
    }

    if (!navigator.geolocation) {
      setGpsStatus('error');
      return;
    }

    setGpsStatus('acquiring');

    // Watch position for immediate updates
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = [pos.coords.longitude, pos.coords.latitude];
        latestCoordsRef.current = coords;
        setLastCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setGpsStatus('active');
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsStatus('denied');
        } else {
          setGpsStatus('error');
        }
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    // Send to backend on interval (not every watchPosition callback to avoid rate-limiting)
    intervalRef.current = setInterval(() => {
      if (latestCoordsRef.current) {
        sendLocation(latestCoordsRef.current);
      }
    }, BEACON_INTERVAL_MS);

    // Send immediately on first fix
    const immediateId = navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.longitude, pos.coords.latitude];
        latestCoordsRef.current = coords;
        sendLocation(coords);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );

    return () => {
      navigator.geolocation?.clearWatch(watchIdRef.current);
      clearInterval(intervalRef.current);
    };
  }, [isTracking, sendLocation]);

  if (!isTracking) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {gpsStatus === 'acquiring' && (
        <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
          <FiMapPin className="animate-bounce" size={12} />
          Acquiring GPS…
        </span>
      )}
      {gpsStatus === 'active' && (
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
          <FiRadio className="animate-pulse text-emerald-600" size={12} />
          🟢 GPS Live — sharing location
          {lastCoords && (
            <span className="ml-1 opacity-70">
              ({lastCoords.lat.toFixed(4)}, {lastCoords.lng.toFixed(4)})
            </span>
          )}
        </span>
      )}
      {gpsStatus === 'denied' && (
        <span className="flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800 dark:bg-red-900/40 dark:text-red-300">
          <FiWifiOff size={12} />
          Location permission denied — please allow in browser settings
        </span>
      )}
      {gpsStatus === 'error' && (
        <span className="flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800 dark:bg-red-900/40 dark:text-red-300">
          <FiWifiOff size={12} />
          GPS unavailable on this device
        </span>
      )}
      {lastSentAt && gpsStatus === 'active' && (
        <span className="text-xs text-gray-400 dark:text-gray-500">
          Last sent: {lastSentAt.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};

export default VolunteerTrackingBeacon;
