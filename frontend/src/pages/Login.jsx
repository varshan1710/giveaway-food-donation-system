// pages/Login.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-16">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Log in to GiveAway</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          New here?{' '}
          <Link to="/register" className="font-semibold text-primary-600">
            Create an account
          </Link>
        </p>

        <form onSubmit={handleSubmit} className="card mt-6 space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              name="email"
              required
              className="input-field"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              name="password"
              required
              className="input-field"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Logging in...' : 'Log in'}
          </button>

          <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500 dark:bg-gray-700/40 dark:text-gray-400">
            Demo accounts (after running the seed script): <br />
            donor@example.com · ngo@example.com · volunteer@example.com — password: Password123!
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
