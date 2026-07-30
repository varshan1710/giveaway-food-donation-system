import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/DashboardLayout';
import DonationCard from '../../components/DonationCard';
import LiveTrackingMap from '../../components/LiveTrackingMap';
import VolunteerPhoneTracker from '../../components/VolunteerPhoneTracker';
import Loader from '../../components/Loader';
import { getDonations, assignVolunteer } from '../../services/donationService';
import { getAvailableVolunteers } from '../../services/otherServices';

const AcceptedDonations = () => {
  const [donations, setDonations] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState({}); // donationId -> volunteerId

  const load = () => {
    setLoading(true);
    Promise.all([
      getDonations(), // fetch all NGO accessible donations
      getAvailableVolunteers(),
    ])
      .then(([donationsRes, volunteersRes]) => {
        // Filter to accepted, out_for_pickup, or picked_up
        const active = donationsRes.data.data.filter((d) =>
          ['accepted', 'out_for_pickup', 'picked_up'].includes(d.status)
        );
        setDonations(active);
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
      await assignVolunteer(donationId, volunteerId);
      toast.success('Volunteer assigned!');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not assign volunteer');
    }
  };

  return (
    <DashboardLayout>
      <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-50">Accepted Donations &amp; Live Tracking</h1>

      {/* Flow context: volunteers can only be assigned after NGO acceptance */}
      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
        🔔 <strong>You were alerted</strong> when these donations were posted nearby. Now that you've accepted them,
        assign a volunteer below to begin pickup &amp; delivery.
      </div>

      {/* Live Volunteer Tracking by Phone Number */}
      <div className="mb-6">
        <VolunteerPhoneTracker defaultPhone="+918870410206" volunteersList={volunteers} />
      </div>

      {loading ? (
        <Loader />
      ) : donations.length === 0 ? (
        <div className="card text-center text-sm text-gray-500 dark:text-gray-400">
          No accepted donations awaiting volunteer assignment.
        </div>
      ) : (
        <div className="space-y-4">
          {donations.map((d) => (
            <div key={d._id} className="space-y-2">
              <DonationCard
                donation={d}
                actions={
                  d.status === 'accepted' ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        className="input-field !py-1.5 max-w-[220px] text-xs"
                        value={selected[d._id] || ''}
                        onChange={(e) => setSelected({ ...selected, [d._id]: e.target.value })}
                      >
                        <option value="">Assign a volunteer...</option>
                        {volunteers.map((v) => (
                          <option key={v._id} value={v.user._id}>
                            {v.user.name} ({v.vehicleType})
                          </option>
                        ))}
                      </select>
                      <button onClick={() => handleAssign(d._id)} className="btn-primary !py-1.5 !px-3 text-xs">
                        Assign
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-emerald-600 font-semibold dark:text-emerald-400">
                      🛵 Volunteer En-Route ({d.assignedVolunteer?.name || 'Assigned'})
                    </span>
                  )
                }
              />

              {['out_for_pickup', 'picked_up'].includes(d.status) && (
                <div className="card border-l-4 border-l-primary-500 bg-gray-50/50 dark:bg-gray-800/50 ml-4">
                  <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    🗺️ Live Volunteer Tracking — Pickup &amp; Delivery Progress
                  </h3>
                  <LiveTrackingMap donationId={d._id} height="280px" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default AcceptedDonations;
