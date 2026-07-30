// App.jsx
// Central route definitions for GiveAway. Public routes (landing, auth) are
// open; everything under /dashboard is protected and further restricted by role.

import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import DonationDetail from './pages/DonationDetail';
import Profile from './pages/Profile';
import Feedback from './pages/Feedback';

import NewDonation from './pages/donor/NewDonation';
import MyDonations from './pages/donor/MyDonations';

import BrowseDonations from './pages/ngo/BrowseDonations';
import AcceptedDonations from './pages/ngo/AcceptedDonations';

import MyPickups from './pages/volunteer/MyPickups';

import AdminUsers from './pages/admin/AdminUsers';
import AdminApprovals from './pages/admin/AdminApprovals';
import AdminDonations from './pages/admin/AdminDonations';
import AdminLiveMap from './pages/admin/AdminLiveMap';

import VolunteerOverview from './pages/volunteer/VolunteerOverview';

import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Shared authenticated routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/donations/:id"
          element={
            <ProtectedRoute>
              <DonationDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/feedback"
          element={
            <ProtectedRoute>
              <Feedback />
            </ProtectedRoute>
          }
        />

        {/* Donor */}
        <Route
          path="/dashboard/new-donation"
          element={
            <ProtectedRoute allowedRoles={['donor']}>
              <NewDonation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/my-donations"
          element={
            <ProtectedRoute allowedRoles={['donor']}>
              <MyDonations />
            </ProtectedRoute>
          }
        />

        {/* NGO */}
        <Route
          path="/dashboard/browse"
          element={
            <ProtectedRoute allowedRoles={['ngo']}>
              <BrowseDonations />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/accepted"
          element={
            <ProtectedRoute allowedRoles={['ngo']}>
              <AcceptedDonations />
            </ProtectedRoute>
          }
        />

        {/* Volunteer */}
        <Route
          path="/dashboard/pickups"
          element={
            <ProtectedRoute allowedRoles={['volunteer']}>
              <MyPickups />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/overview"
          element={
            <ProtectedRoute allowedRoles={['volunteer']}>
              <VolunteerOverview />
            </ProtectedRoute>
          }
        />

        {/* Admin */}
        <Route
          path="/dashboard/users"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/approvals"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminApprovals />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/donations"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDonations />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/live-map"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLiveMap />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Landing />} />
      </Routes>
    </>
  );
}

export default App;
