import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/DashboardLayout';
import DonationCard from '../../components/DonationCard';
import LiveTrackingMap from '../../components/LiveTrackingMap';
import VolunteerPhoneTracker from '../../components/VolunteerPhoneTracker';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import Loader from '../../components/Loader';
import { getDonations, assignVolunteer, deleteDonation, confirmNgoDelivery } from '../../services/donationService';
import { getAvailableVolunteers } from '../../services/otherServices';

const AcceptedDonations = () => {
  const [donations, setDonations] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState({}); // donationId -> volunteerId
  const [activeTrackingId, setActiveTrackingId] = useState(null); // Track map open for current food only
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      getDonations(), // fetch all NGO accessible donations
      getAvailableVolunteers(),
    ])
      .then(([donationsRes, volunteersRes]) => {
        setDonations(donationsRes.data.data);
        setVolunteers(volunteersRes.data.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleAssign = async (donationId) => {
    const volunteerId = selected[donationId];
    if (!volunteerId) {
      toast.error('Please select a volunteer first');
      return;
    }
    try {
      const res = await assignVolunteer(donationId, volunteerId);
      toast.success(res.data.message || 'Invitation sent to volunteer!');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not assign volunteer');
    }
  };

  const handleConfirmReceipt = async (donationId) => {
    try {
      const res = await confirmNgoDelivery(donationId);
      toast.success(res.data.message || 'Delivery confirmed! Order completed 🎉');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not confirm delivery');
    }
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    setDeleteLoading(true);
    try {
      await deleteDonation(deleteTargetId);
      toast.success('Donation record deleted from NGO dashboard');
      setDeleteTargetId(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete donation record');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-50">Accepted Donations &amp; Live Tracking</h1>

      {/* Flow context: volunteers can only be assigned after NGO acceptance */}
      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
        🔔 <strong>NGO Dashboard</strong>: Manage accepted donations, track live volunteer positions, and delete past completed/expired records.
      </div>

      {/* Live Volunteer Tracking by Phone Number */}
      <div className="mb-6">
        <VolunteerPhoneTracker defaultPhone="+918870410206" volunteersList={volunteers} />
      </div>

      {loading ? (
        <Loader />
      ) : donations.length === 0 ? (
        <div className="card text-center text-sm text-gray-500 dark:text-gray-400">
          No donations found in your NGO records.
        </div>
      ) : (
        <div className="space-y-4">
          {donations.map((d) => (
            <div key={d._id} className="space-y-2">
              <DonationCard
                donation={d}
                actions={
                  <div className="flex flex-wrap items-center gap-2">
                    {d.status === 'accepted' && (() => {
                      const calcDistKm = (coordsA, coordsB) => {
                        if (!coordsA || !coordsB || (coordsA[0] === 0 && coordsA[1] === 0) || (coordsB[0] === 0 && coordsB[1] === 0)) return Infinity;
                        const [lng1, lat1] = coordsA;
                        const [lng2, lat2] = coordsB;
                        const toRad = (deg) => (deg * Math.PI) / 180;
                        const R = 6371;
                        const dLat = toRad(lat2 - lat1);
                        const dLng = toRad(lng2 - lng1);
                        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
                        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                      };

                      const eligibleVolunteers = volunteers.map((v) => {
                        const volCoords = (v.serviceLocation?.coordinates && (v.serviceLocation.coordinates[0] !== 0 || v.serviceLocation.coordinates[1] !== 0))
                          ? v.serviceLocation.coordinates
                          : v.user?.location?.coordinates;
                        const dist = calcDistKm(volCoords, d.pickupLocation?.coordinates);
                        return { ...v, distKm: dist < Infinity ? dist.toFixed(1) : null };
                      }).filter((v) => v.distKm !== null && Number(v.distKm) <= 65);

                      return (
                        <>
                          <select
                            className="input-field !py-1.5 max-w-[220px] text-xs"
                            value={selected[d._id] || ''}
                            onChange={(e) => setSelected({ ...selected, [d._id]: e.target.value })}
                            disabled={eligibleVolunteers.length === 0}
                          >
                            <option value="">
                              {eligibleVolunteers.length > 0 ? 'Assign a volunteer...' : 'No volunteers within 65km'}
                            </option>
                            {eligibleVolunteers.map((v) => (
                              <option key={v._id} value={v.user._id}>
                                {v.user.name} ({v.vehicleType}){v.distKm ? ` - ${v.distKm}km` : ''}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleAssign(d._id)}
                            disabled={eligibleVolunteers.length === 0}
                            className="btn-primary !py-1.5 !px-3 text-xs disabled:opacity-50"
                          >
                            Assign
                          </button>
                        </>
                      );
                    })()}
                    {d.status === 'assigned_pending_volunteer' && (
                      <span className="text-xs text-amber-600 font-semibold dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-800">
                        ⏳ Invitation Sent ({d.assignedVolunteer?.name || 'Volunteer'}) — Awaiting Accept/Decline
                      </span>
                    )}

                    {['out_for_pickup', 'picked_up'].includes(d.status) && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-emerald-600 font-semibold dark:text-emerald-400">
                          🛵 Volunteer En-Route ({d.assignedVolunteer?.name || 'Assigned'})
                        </span>
                        <button
                          onClick={() => setActiveTrackingId(activeTrackingId === d._id ? null : d._id)}
                          className="btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1"
                        >
                          {activeTrackingId === d._id ? '🙈 Hide Map' : '🗺️ Track Live Location'}
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => setDeleteTargetId(d._id)}
                      className="btn-danger !py-1.5 !px-3 text-xs flex items-center gap-1 ml-auto"
                      title="Delete this record from NGO dashboard"
                    >
                      🗑️ Delete Record
                    </button>
                  </div>
                }
              />

              {/* Confirm Receipt Card when Volunteer Delivered Food */}
              {(d.status === 'delivery_pending_ngo_confirmation' || d.volunteerDelivered) && d.status !== 'delivered' && (
                <div className="card border-l-4 border-l-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/50 p-4 ml-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-emerald-900 dark:text-emerald-200 text-sm flex items-center gap-1.5">
                        📦 Volunteer Arrived &amp; Delivered Food!
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                        Volunteer <strong>{d.assignedVolunteer?.name || 'Volunteer'}</strong> has delivered <strong>{d.foodName}</strong> to your location.
                      </p>
                    </div>
                    <button
                      onClick={() => handleConfirmReceipt(d._id)}
                      className="btn-primary !py-2.5 !px-4 text-xs font-bold shadow-md bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse shrink-0"
                    >
                      🎉 Confirm Food Received (Complete Order)
                    </button>
                  </div>
                </div>
              )}

              {['out_for_pickup', 'picked_up'].includes(d.status) && activeTrackingId === d._id && (
                <div className="card border-l-4 border-l-primary-500 bg-gray-50/50 dark:bg-gray-800/50 ml-4">
                  <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center justify-between">
                    <span>🗺️ Live Volunteer Tracking — {d.foodName}</span>
                    <button
                      onClick={() => setActiveTrackingId(null)}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-normal"
                    >
                      Close Map ✖
                    </button>
                  </h3>
                  <LiveTrackingMap donationId={d._id} height="280px" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Interactive Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deleteTargetId)}
        title="Delete Donation Record?"
        message="Are you sure you want to delete this donation record? This action cannot be undone and will permanently remove it from your NGO dashboard history."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTargetId(null)}
        loading={deleteLoading}
      />
    </DashboardLayout>
  );
};

export default AcceptedDonations;
