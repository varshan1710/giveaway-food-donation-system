// pages/Profile.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/DashboardLayout';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Profile = () => {
  const navigate = useNavigate();
  const { user, refreshUser, logout } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', address: user?.address || '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Phone input handler — always keeps +91 prefix and allows only digits after it
  const handlePhoneChange = (e) => {
    let val = e.target.value;
    if (!val.startsWith('+91')) val = '+91';
    const digits = val.slice(3).replace(/\D/g, '').slice(0, 10);
    setForm({ ...form, phone: '+91' + digits });
  };

  // Validate phone: +91 + 10 digits starting with 6-9
  const phoneValid = form.phone === '' || /^\+91[6-9]\d{9}$/.test(form.phone);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (form.phone && !/^\+91[6-9]\d{9}$/.test(form.phone)) {
      toast.error('Phone must be in +91XXXXXXXXXX format (10 digits after +91, starting with 6–9)');
      return;
    }
    setSavingProfile(true);
    try {
      await api.put('/auth/me', form);
      await refreshUser();
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setSavingPassword(true);
    try {
      await api.put('/auth/change-password', passwordForm);
      toast.success('Password changed');
      setPasswordForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Password change failed');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await api.delete('/auth/delete-account');
      toast.success('Your account has been permanently deleted.');
      logout();
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete account');
      setDeletingAccount(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-50">My Profile</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleProfileSubmit} className="card space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Profile Details</h2>
          <div>
            <label className="label">Full Name</label>
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input-field" value={user?.email} disabled />
          </div>
          <div>
            <label className="label">Phone (Indian mobile)</label>
            <input
              type="tel"
              maxLength={13}
              placeholder="+91XXXXXXXXXX"
              className={`input-field ${
                form.phone && !phoneValid ? 'border-red-500 focus:ring-red-400' : ''
              } ${
                form.phone && phoneValid ? 'border-green-500 focus:ring-green-400' : ''
              }`}
              value={form.phone || ''}
              onFocus={() => { if (!form.phone) setForm({ ...form, phone: '+91' }); }}
              onChange={handlePhoneChange}
            />
            {form.phone && !phoneValid && (
              <p className="mt-1 text-xs text-red-500">Enter 10 digits after +91 (e.g. +919876543210)</p>
            )}
            {form.phone && phoneValid && form.phone.length === 13 && (
              <p className="mt-1 text-xs text-green-600">✓ Valid Indian mobile number</p>
            )}
          </div>
          <div>
            <label className="label">Address</label>
            <input className="input-field" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <button type="submit" disabled={savingProfile} className="btn-primary">
            {savingProfile ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        <form onSubmit={handlePasswordSubmit} className="card space-y-4">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Change Password</h2>
          <div>
            <label className="label">Current Password</label>
            <input
              type="password"
              required
              className="input-field"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
            />
          </div>
          <div>
            <label className="label">New Password</label>
            <input
              type="password"
              required
              minLength={6}
              className="input-field"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
            />
          </div>
          <button type="submit" disabled={savingPassword} className="btn-primary">
            {savingPassword ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* ── Danger Zone: Permanent Account Deletion ── */}
      <div className="mt-8 card border-2 border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20">
        <h2 className="text-base font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
          ⚠️ Danger Zone
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Once you delete your account, all your profile information, role profiles, and history will be permanently removed. This action cannot be undone.
        </p>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          className="mt-4 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 shadow-md flex items-center gap-2"
        >
          🗑️ Delete Account Permanently
        </button>
      </div>

      {/* Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        title="Delete Account Permanently?"
        message="Are you sure you want to delete your complete account? All your profile details, role permissions, and access will be permanently removed. You will be logged out immediately."
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteModal(false)}
        loading={deletingAccount}
      />
    </DashboardLayout>
  );
};

export default Profile;
