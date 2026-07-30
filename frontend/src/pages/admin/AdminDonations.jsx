// pages/admin/AdminDonations.jsx
import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import DonationCard from '../../components/DonationCard';
import Loader from '../../components/Loader';
import { getAllDonationsAdmin } from '../../services/otherServices';

const STATUS_FILTERS = ['all', 'pending', 'accepted', 'rejected', 'out_for_pickup', 'picked_up', 'delivered', 'expired', 'cancelled'];

const AdminDonations = () => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  useEffect(() => {
    setLoading(true);
    getAllDonationsAdmin({
      ...(status !== 'all' ? { status } : {}),
      ...(flaggedOnly ? { flagged: 'true' } : {}),
    })
      .then(({ data }) => setDonations(data.data))
      .finally(() => setLoading(false));
  }, [status, flaggedOnly]);

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-50">All Donations</h1>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select className="input-field max-w-[200px]" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>{s === 'all' ? 'All statuses' : s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} />
          Show flagged/suspicious only
        </label>
      </div>

      {loading ? (
        <Loader />
      ) : donations.length === 0 ? (
        <div className="card text-center text-sm text-gray-500 dark:text-gray-400">No donations match your filters.</div>
      ) : (
        <div className="space-y-3">
          {donations.map((d) => (
            <DonationCard key={d._id} donation={d} />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminDonations;
