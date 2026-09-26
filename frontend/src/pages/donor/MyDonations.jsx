// pages/donor/MyDonations.jsx
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/DashboardLayout';
import DonationCard from '../../components/DonationCard';
import Loader from '../../components/Loader';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import { getDonations, deleteDonation } from '../../services/donationService';

const STATUS_FILTERS = ['all', 'pending', 'accepted', 'out_for_pickup', 'picked_up', 'delivered', 'expired', 'rejected'];

const MyDonations = () => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = () => {
    setLoading(true);
    getDonations(statusFilter !== 'all' ? { status: statusFilter } : {})
      .then(({ data }) => setDonations(data.data))
      .finally(() => setLoading(false));
  };

  useEffect(load, [statusFilter]);

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    setDeleteLoading(true);
    try {
      await deleteDonation(deleteTargetId);
      toast.success('Donation record deleted from your dashboard');
      setDeleteTargetId(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete donation record');
    } finally {
      setDeleteLoading(false);
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
                !['accepted', 'out_for_pickup'].includes(d.status) && (
                  <button
                    onClick={() => setDeleteTargetId(d._id)}
                    className="btn-danger !py-1.5 !px-3 text-xs flex items-center gap-1"
                    title="Delete this record from your dashboard"
                  >
                    🗑️ Delete Record
                  </button>
                )
              }
            />
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deleteTargetId)}
        title="Delete Donation Record?"
        message="Are you sure you want to delete this donation record? This action cannot be undone and will remove it permanently from your dashboard."
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTargetId(null)}
        loading={deleteLoading}
      />
    </DashboardLayout>
  );
};

export default MyDonations;
