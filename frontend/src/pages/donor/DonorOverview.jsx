// pages/donor/DonorOverview.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiPackage, FiCheckCircle, FiClock, FiTrendingUp } from 'react-icons/fi';
import DashboardLayout from '../../components/DashboardLayout';
import StatCard from '../../components/StatCard';
import DonationCard from '../../components/DonationCard';
import Loader from '../../components/Loader';
import { getDonations } from '../../services/donationService';

const DonorOverview = () => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDonations()
      .then(({ data }) => setDonations(data.data))
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total: donations.length,
    delivered: donations.filter((d) => d.status === 'delivered').length,
    pending: donations.filter((d) => d.status === 'pending').length,
    mealsProvided: donations
      .filter((d) => d.status === 'delivered')
      .reduce((sum, d) => sum + (d.estimatedMeals || 0), 0),
  };

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Donor Overview</h1>
        <Link to="/dashboard/new-donation" className="btn-primary">
          + New Donation
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FiPackage} label="Total Donations" value={stats.total} accent="primary" />
        <StatCard icon={FiCheckCircle} label="Delivered" value={stats.delivered} accent="blue" />
        <StatCard icon={FiClock} label="Pending" value={stats.pending} accent="accent" />
        <StatCard icon={FiTrendingUp} label="Meals Provided" value={stats.mealsProvided} accent="purple" />
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold text-gray-900 dark:text-gray-50">Recent Donations</h2>
      {loading ? (
        <Loader />
      ) : donations.length === 0 ? (
        <div className="card text-center text-sm text-gray-500 dark:text-gray-400">
          You haven't posted any donations yet.{' '}
          <Link to="/dashboard/new-donation" className="font-semibold text-primary-600">
            Create your first one
          </Link>
          .
        </div>
      ) : (
        <div className="space-y-3">
          {donations.slice(0, 5).map((d) => (
            <DonationCard key={d._id} donation={d} />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default DonorOverview;
