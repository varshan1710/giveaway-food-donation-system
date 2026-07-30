// pages/admin/AdminApprovals.jsx
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/DashboardLayout';
import Loader from '../../components/Loader';
import { getAllNGOsAdmin, approveNGO, getAllVolunteersAdmin, approveVolunteer } from '../../services/otherServices';

const AdminApprovals = () => {
  const [ngos, setNgos] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([getAllNGOsAdmin(), getAllVolunteersAdmin()])
      .then(([n, v]) => {
        setNgos(n.data.data);
        setVolunteers(v.data.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleApproveNGO = async (id) => {
    try {
      await approveNGO(id);
      toast.success('NGO approved');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve');
    }
  };

  const handleApproveVolunteer = async (id) => {
    try {
      await approveVolunteer(id);
      toast.success('Volunteer approved');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve');
    }
  };

  if (loading) return <DashboardLayout><Loader /></DashboardLayout>;

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-50">NGO & Volunteer Approvals</h1>

      <h2 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">NGOs</h2>
      <div className="mb-8 space-y-2">
        {ngos.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No NGOs registered yet.</p>}
        {ngos.map((n) => (
          <div key={n._id} className="card flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">{n.organizationName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{n.user?.email} · {n.user?.phone}</p>
            </div>
            {n.isApproved ? (
              <span className="badge bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">Approved</span>
            ) : (
              <button onClick={() => handleApproveNGO(n._id)} className="btn-primary !py-1.5 !px-3 text-xs">
                Approve
              </button>
            )}
          </div>
        ))}
      </div>

      <h2 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">Volunteers</h2>
      <div className="space-y-2">
        {volunteers.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No volunteers registered yet.</p>}
        {volunteers.map((v) => (
          <div key={v._id} className="card flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">{v.user?.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {v.user?.email} · {v.vehicleType} · {v.availability}
              </p>
            </div>
            {v.isApproved ? (
              <span className="badge bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">Approved</span>
            ) : (
              <button onClick={() => handleApproveVolunteer(v._id)} className="btn-primary !py-1.5 !px-3 text-xs">
                Approve
              </button>
            )}
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default AdminApprovals;
