// pages/admin/AdminUsers.jsx
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/DashboardLayout';
import Loader from '../../components/Loader';
import { getUsers, setUserActiveStatus } from '../../services/otherServices';

const ROLES = ['', 'donor', 'ngo', 'volunteer', 'admin'];

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    getUsers({ ...(role ? { role } : {}), ...(search ? { search } : {}) })
      .then(({ data }) => setUsers(data.data))
      .finally(() => setLoading(false));
  };

  useEffect(load, [role]);

  const handleSearch = (e) => {
    e.preventDefault();
    load();
  };

  const toggleActive = async (id, current) => {
    try {
      await setUserActiveStatus(id, !current);
      toast.success(`User ${!current ? 'activated' : 'deactivated'}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update user');
    }
  };

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-50">Manage Users</h1>

      <form onSubmit={handleSearch} className="mb-4 flex flex-wrap items-center gap-3">
        <input
          className="input-field max-w-xs"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input-field max-w-[180px]" value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLES.map((r) => (
            <option key={r} value={r}>{r || 'All roles'}</option>
          ))}
        </select>
        <button type="submit" className="btn-secondary">Search</button>
      </form>

      {loading ? (
        <Loader />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/40">
              <tr>
                {['Name', 'Email', 'Role', 'Verified', 'Status', 'Action'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {users.map((u) => (
                <tr key={u._id}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{u.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{u.email}</td>
                  <td className="px-4 py-3 text-sm capitalize text-gray-500 dark:text-gray-400">{u.role}</td>
                  <td className="px-4 py-3 text-sm">{u.isVerified ? '✅' : '—'}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`badge ${u.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}`}>
                      {u.isActive ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(u._id, u.isActive)}
                      className="text-xs font-semibold text-primary-600 hover:underline"
                    >
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminUsers;
