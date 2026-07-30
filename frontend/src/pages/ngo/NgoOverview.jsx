// pages/ngo/NgoOverview.jsx
import { useEffect, useState } from 'react';
import { FiPackage, FiCheckCircle, FiUsers, FiTrendingUp } from 'react-icons/fi';
import DashboardLayout from '../../components/DashboardLayout';
import StatCard from '../../components/StatCard';
import DonationCard from '../../components/DonationCard';
import Loader from '../../components/Loader';
import { getDonations } from '../../services/donationService';
import { getMyNgoProfile } from '../../services/otherServices';

const NgoOverview = () => {
  const [pending, setPending] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDonations({ status: 'pending', sortByExpiry: 'true' }), getMyNgoProfile()])
      .then(([donationsRes, profileRes]) => {
        setPending(donationsRes.data.data);
        setProfile(profileRes.data.data);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <h1 className="mb-1 text-2xl font-bold text-gray-900 dark:text-gray-50">NGO Overview</h1>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        {profile?.organizationName}{' '}
        {!profile?.isApproved && (
          <span className="badge ml-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">
            Pending admin approval
          </span>
        )}
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FiPackage} label="Available Nearby" value={pending.length} accent="primary" />
        <StatCard icon={FiCheckCircle} label="Donations Accepted" value={profile?.totalDonationsAccepted || 0} accent="blue" />
        <StatCard icon={FiTrendingUp} label="Meals Distributed" value={profile?.totalMealsDistributed || 0} accent="purple" />
        <StatCard icon={FiUsers} label="Service Radius" value={`${profile?.serviceRadiusKm || 0} km`} accent="accent" />
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold text-gray-900 dark:text-gray-50">
        Most Urgent Donations Nearby
      </h2>
      {loading ? (
        <Loader />
      ) : pending.length === 0 ? (
        <div className="card text-center text-sm text-gray-500 dark:text-gray-400">No pending donations right now.</div>
      ) : (
        <div className="space-y-3">
          {pending.slice(0, 5).map((d) => (
            <DonationCard key={d._id} donation={d} />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default NgoOverview;
