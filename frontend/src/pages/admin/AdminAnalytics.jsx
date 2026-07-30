// pages/admin/AdminAnalytics.jsx
import { useEffect, useState } from 'react';
import { FiPackage, FiUsers, FiTrendingUp, FiActivity } from 'react-icons/fi';
import DashboardLayout from '../../components/DashboardLayout';
import StatCard from '../../components/StatCard';
import Loader from '../../components/Loader';
import { DonationTrendChart, CategoryBarChart, StatusDoughnutChart, UsersByRoleChart } from '../../components/Charts';
import { getAnalytics } from '../../services/otherServices';

const AdminAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalytics()
      .then(({ data }) => setData(data.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardLayout><Loader /></DashboardLayout>;
  if (!data) return <DashboardLayout><p>Could not load analytics.</p></DashboardLayout>;

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-50">Platform Analytics</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FiPackage} label="Total Donations" value={data.totalDonations} accent="primary" />
        <StatCard icon={FiUsers} label="Total Users" value={data.totalUsers} accent="blue" />
        <StatCard icon={FiTrendingUp} label="Meals Served" value={data.totalMealsServed} accent="purple" />
        <StatCard icon={FiActivity} label="Food Saved (kg)" value={data.foodSavedKg} accent="accent" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <h2 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">
            Donation Trend & Demand Forecast (next 7 days)
          </h2>
          <DonationTrendChart trend={data.donationTrend} forecast={data.demandForecast} />
          <p className="mt-2 text-xs text-gray-400">
            Dashed line is a heuristic forecast based on recent trend, useful for anticipating NGO/volunteer staffing needs.
          </p>
        </div>
        <div className="card">
          <h2 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">Donation Status</h2>
          <StatusDoughnutChart statusStats={data.statusStats} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">Donations by Category</h2>
          <CategoryBarChart categoryStats={data.categoryStats} />
        </div>
        <div className="card">
          <h2 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">Users by Role</h2>
          <UsersByRoleChart usersByRole={data.usersByRole} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminAnalytics;
