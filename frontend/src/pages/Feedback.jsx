// pages/Feedback.jsx
// Shared feedback page: any role can submit general platform feedback,
// admins additionally see everyone's submissions.

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import DashboardLayout from '../components/DashboardLayout';
import Loader from '../components/Loader';
import { useAuth } from '../context/AuthContext';
import { createFeedback, getFeedback } from '../services/otherServices';

const Feedback = () => {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ rating: 5, message: '', type: 'platform_feedback' });

  const load = () => {
    setLoading(true);
    getFeedback()
      .then(({ data }) => setList(data.data))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createFeedback(form);
      toast.success('Thanks for your feedback!');
      setForm({ rating: 5, message: '', type: 'platform_feedback' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-50">Feedback</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <form onSubmit={handleSubmit} className="card space-y-4 lg:col-span-1">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Share your experience</h2>
          <div>
            <label className="label">Feedback type</label>
            <select
              className="input-field"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="platform_feedback">General platform feedback</option>
              <option value="donation_experience">Donation experience</option>
              <option value="complaint">Complaint</option>
            </select>
          </div>
          <div>
            <label className="label">Rating</label>
            <select
              className="input-field"
              value={form.rating}
              onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
            >
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>{'⭐'.repeat(r)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Message</label>
            <textarea
              rows={4}
              required
              className="input-field"
              placeholder="Tell us what's working well or what we can improve..."
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </form>

        <div className="lg:col-span-2">
          <h2 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">
            {user?.role === 'admin' ? 'All Feedback' : 'Your Submitted Feedback'}
          </h2>
          {loading ? (
            <Loader />
          ) : list.length === 0 ? (
            <div className="card text-center text-sm text-gray-500 dark:text-gray-400">No feedback yet.</div>
          ) : (
            <div className="space-y-3">
              {list.map((f) => (
                <div key={f._id} className="card">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {f.submittedBy?.name} {user?.role === 'admin' && `(${f.submittedBy?.role})`}
                    </span>
                    <span>{'⭐'.repeat(f.rating || 0)}</span>
                  </div>
                  <p className="mt-1 text-xs uppercase tracking-wide text-gray-400">{f.type.replace(/_/g, ' ')}</p>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{f.message}</p>
                  <p className="mt-2 text-xs text-gray-400">{new Date(f.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Feedback;
