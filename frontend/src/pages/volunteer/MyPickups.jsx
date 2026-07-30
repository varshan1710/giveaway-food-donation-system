import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { FiRadio } from 'react-icons/fi';
import DashboardLayout from '../../components/DashboardLayout';
import DonationCard from '../../components/DonationCard';
import Loader from '../../components/Loader';
import { getMyPickups, updateVolunteerLocation } from '../../services/otherServices';
import { updateDeliveryStatus } from '../../services/donationService';

const MyPickups = () => {
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isBeaconing, setIsBeaconing] = useState(false);
  const watchIdRef = useRef(null);

  const load = () => {
    setLoading(true);
    getMyPickups()
      .then(({ data }) => setPickups(data.data))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  // GPS Beacon effect: auto-send volunteer location to backend while active deliveries exist
  useEffect(() => {
    const activeDeliveries = pickups.some((d) => ['out_for_pickup', 'picked_up'].includes(d.status));
    if (!activeDeliveries || !navigator.geolocation) {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      setIsBeaconing(false);
      return;
    }

    setIsBeaconing(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = [pos.coords.longitude, pos.coords.latitude];
        updateVolunteerLocation(coords).catch(() => {});
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [pickups]);

  const handleUpdate = async (id, status) => {
    try {
      await updateDeliveryStatus(id, status, `Marked as ${status.replace('_', ' ')} by volunteer`);
      toast.success(`Status updated to ${status.replace('_', ' ')}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update status');
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">My Pickups</h1>
        {isBeaconing && (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
            <FiRadio className="animate-pulse text-emerald-600" /> Live GPS location sharing active (NGO can track you)
          </span>
        )}
      </div>

      {loading ? (
        <Loader />
      ) : pickups.length === 0 ? (
        <div className="card text-center text-sm text-gray-500 dark:text-gray-400">
          No pickups assigned to you yet. Check back soon!
        </div>
      ) : (
        <div className="space-y-3">
          {pickups.map((d) => (
            <DonationCard
              key={d._id}
              donation={d}
              actions={
                <>
                  {d.status === 'out_for_pickup' && (
                    <button onClick={() => handleUpdate(d._id, 'picked_up')} className="btn-primary !py-1.5 !px-3 text-xs">
                      Mark Picked Up
                    </button>
                  )}
                  {d.status === 'picked_up' && (
                    <button onClick={() => handleUpdate(d._id, 'delivered')} className="btn-primary !py-1.5 !px-3 text-xs">
                      Mark Delivered
                    </button>
                  )}
                </>
              }
            />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default MyPickups;
