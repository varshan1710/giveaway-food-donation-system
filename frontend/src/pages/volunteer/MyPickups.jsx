// pages/volunteer/MyPickups.jsx
import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { FiRadio } from 'react-icons/fi';
import DashboardLayout from '../../components/DashboardLayout';
import DonationCard from '../../components/DonationCard';
import Loader from '../../components/Loader';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import { getMyPickups, updateVolunteerLocation } from '../../services/otherServices';
import { updateDeliveryStatus, deleteDonation, completeVolunteerDelivery } from '../../services/donationService';

const MyPickups = () => {
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isBeaconing, setIsBeaconing] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
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

  const handleCompleteDelivery = async (donationId) => {
    try {
      const res = await completeVolunteerDelivery(donationId);
      toast.success(res.data.message || 'Delivery marked complete! NGO notified.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not mark delivery complete');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    setDeleteLoading(true);
    try {
      await deleteDonation(deleteTargetId);
      toast.success('Record deleted successfully');
      setDeleteTargetId(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete record');
    } finally {
      setDeleteLoading(false);
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
                <div className="flex flex-wrap items-center gap-2 w-full">
                  {d.status === 'picked_up' && (
                    <button
                      onClick={() => handleCompleteDelivery(d._id)}
                      className="btn-primary !py-2 !px-4 text-xs font-bold shadow-md bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse flex items-center gap-1"
                    >
                      📦 Mark Delivery Completed (Arrived at NGO)
                    </button>
                  )}

                  {d.status === 'delivery_pending_ngo_confirmation' && (
                    <span className="text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-800 font-semibold">
                      ⏳ Delivery Complete — Waiting for NGO to confirm receipt
                    </span>
                  )}

                  {['expired', 'cancelled', 'delivered', 'rejected'].includes(d.status) && (
                    <button
                      onClick={() => setDeleteTargetId(d._id)}
                      className="btn-danger !py-1.5 !px-3 text-xs flex items-center gap-1 ml-auto"
                      title="Delete this record"
                    >
                      🗑️ Delete Record
                    </button>
                  )}
                </div>
              }
            />
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deleteTargetId)}
        title="Delete Pickup Record?"
        message="Are you sure you want to delete this pickup record? This action cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTargetId(null)}
        loading={deleteLoading}
      />
    </DashboardLayout>
  );
};

export default MyPickups;
