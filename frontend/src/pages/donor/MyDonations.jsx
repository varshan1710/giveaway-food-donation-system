// pages/donor/MyDonations.jsx
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/DashboardLayout';
import DonationCard from '../../components/DonationCard';
import Loader from '../../components/Loader';
import { getDonations, deleteDonation } from '../../services/donationService';

const STATUS_FILTERS = ['all', 'pending', 'accepted', 'out_for_pickup', 'picked_up', 'delivered', 'rejected'];

const MyDonations = () => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    getDonations(statusFilter !== 'all' ? { status: statusFilter } : {})
      .then(({ data }) => setDonations(data.data))
      .finally(() => setLoading(false));
  };

  useEffect(load, [statusFilter]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this donation? This cannot be undone.')) return;
    try {
      await deleteDonation(id);
      toast.success('Donation deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete donation');
    }
  };

  const filtered = donations.filter((d) => d.foodName.toLowerCase().includes(search.toLowerCase()));

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-50">My Donations</h1>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          className="input-field max-w-xs"
          placeholder="Search by food name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input-field max-w-[200px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>
              {s === 'all' ? 'All statuses' : s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <Loader />
      ) : filtered.length === 0 ? (
        <div className="card text-center text-sm text-gray-500 dark:text-gray-400">No donations match your filters.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <DonationCard
              key={d._id}
              donation={d}
              actions={
                d.status === 'pending' && (
                  <button onClick={() => handleDelete(d._id)} className="btn-danger !py-1.5 !px-3 text-xs">
                    Delete
                  </button>
                )
              }
            />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default MyDonations;
