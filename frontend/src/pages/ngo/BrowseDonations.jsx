// pages/ngo/BrowseDonations.jsx
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FiMap, FiList } from 'react-icons/fi';
import DashboardLayout from '../../components/DashboardLayout';
import DonationCard from '../../components/DonationCard';
import DonationsMapView from '../../components/DonationsMapView';
import Loader from '../../components/Loader';
import { getDonations, acceptDonation, rejectDonation } from '../../services/donationService';

const CATEGORIES = ['', 'Cooked Meals', 'Bakery', 'Fruits & Vegetables', 'Grains & Staples', 'Dairy', 'Packaged Food', 'Beverages', 'Other'];

const BrowseDonations = () => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [view, setView] = useState('list'); // list | map

  const load = () => {
    setLoading(true);
    getDonations({ status: 'pending', sortByExpiry: 'true', ...(category ? { category } : {}) })
      .then(({ data }) => setDonations(data.data))
      .finally(() => setLoading(false));
  };

  useEffect(load, [category]);

  const handleAccept = async (id) => {
    try {
      await acceptDonation(id);
      toast.success('Donation accepted! Assign a volunteer from "Accepted Donations".');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not accept donation');
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Optional: reason for rejecting this donation');
    try {
      await rejectDonation(id, reason || '');
      toast.success('Donation rejected');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not reject donation');
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Nearby Donations</h1>
        <div className="flex items-center gap-2">
          <select className="input-field max-w-[200px]" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c || 'All categories'}</option>
            ))}
          </select>
          <div className="flex overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600">
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1 px-3 py-2 text-sm ${view === 'list' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800'}`}
            >
              <FiList size={14} /> List
            </button>
            <button
              onClick={() => setView('map')}
              className={`flex items-center gap-1 px-3 py-2 text-sm ${view === 'map' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800'}`}
            >
              <FiMap size={14} /> Map
            </button>
          </div>
        </div>
      </div>

      <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
        Sorted by urgency — donations closest to expiry and largest in quantity appear first.
      </p>

      {loading ? (
        <Loader />
      ) : donations.length === 0 ? (
        <div className="card text-center text-sm text-gray-500 dark:text-gray-400">No pending donations found.</div>
      ) : view === 'map' ? (
        <DonationsMapView donations={donations} height="500px" />
      ) : (
        <div className="space-y-3">
          {donations.map((d) => (
            <DonationCard
              key={d._id}
              donation={d}
              actions={
                <>
                  <button onClick={() => handleAccept(d._id)} className="btn-primary !py-1.5 !px-3 text-xs">
                    Accept
                  </button>
                  <button onClick={() => handleReject(d._id)} className="btn-secondary !py-1.5 !px-3 text-xs">
                    Reject
                  </button>
                </>
              }
            />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default BrowseDonations;
