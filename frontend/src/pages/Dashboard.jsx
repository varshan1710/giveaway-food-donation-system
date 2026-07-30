// pages/Dashboard.jsx
// Entry point for /dashboard — renders the correct "Overview" page based on
// the logged-in user's role. Sub-routes (new-donation, my-donations, etc.)
// are defined directly in App.jsx.

import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import Loader from '../components/Loader';
import DonorOverview from './donor/DonorOverview';
import NgoOverview from './ngo/NgoOverview';
import VolunteerOverview from './volunteer/VolunteerOverview';
import AdminAnalytics from './admin/AdminAnalytics';

const Dashboard = () => {
  const { user, loading } = useAuth();

  if (loading) return <DashboardLayout><Loader /></DashboardLayout>;

  switch (user?.role) {
    case 'donor':
      return <DonorOverview />;
    case 'ngo':
      return <NgoOverview />;
    case 'volunteer':
      return <VolunteerOverview />;
    case 'admin':
      return <AdminAnalytics />;
    default:
      return <DashboardLayout><p>Unknown role.</p></DashboardLayout>;
  }
};

export default Dashboard;
