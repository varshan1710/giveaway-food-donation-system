import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import MapPicker from '../components/MapPicker';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [officeCoords, setOfficeCoords] = useState(null);
  const [officeAddress, setOfficeAddress] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'donor',
    phone: '',
    address: '',
    organizationName: '',
    vehicleType: 'bike',
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Phone input handler — always keeps the +91 prefix and allows only digits after it
  const handlePhoneChange = (e) => {
    let val = e.target.value;
    // Always force the +91 prefix
    if (!val.startsWith('+91')) val = '+91';
    // Only allow digits after +91, max 10 digits
    const digits = val.slice(3).replace(/\D/g, '').slice(0, 10);
    setForm({ ...form, phone: '+91' + digits });
  };

  // Validate phone: +91 + 10 digits starting with 6-9
  const phoneValid = form.phone === '' || /^\+91[6-9]\d{9}$/.test(form.phone);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validate phone format before submitting
    if (form.phone && !/^\+91[6-9]\d{9}$/.test(form.phone)) {
      toast.error('Phone must be in +91XXXXXXXXXX format (10 digits after +91, starting with 6–9)');
      return;
    }
    if (form.role === 'ngo' && !officeCoords) {
      toast.error('Please set your NGO office location on the map to receive nearby donation alerts.');
      return;
    }
    setLoading(true);
    try {
      // Grab a default coordinate via browser geolocation if available; fallback to [0,0]
      const coordinates = await new Promise((resolve) => {
        if (!navigator.geolocation) return resolve([0, 0]);
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve([pos.coords.longitude, pos.coords.latitude]),
          () => resolve([0, 0]),
          { timeout: 4000 }
        );
      });

      const payload = { ...form, coordinates };
      if (form.role === 'ngo') {
        payload.officeCoordinates = officeCoords;
        payload.officeAddress = officeAddress || form.address;
      }

      await register(payload);
      toast.success('Account created!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="mx-auto flex max-w-lg flex-col justify-center px-4 py-12">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Create your GiveAway account</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary-600">
            Log in
          </Link>
        </p>

        <form onSubmit={handleSubmit} className="card mt-6 space-y-4">
          <div>
            <label className="label">I am registering as</label>
            <div className="grid grid-cols-3 gap-2">
              {['donor', 'ngo', 'volunteer'].map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setForm({ ...form, role: r })}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium capitalize transition ${
                    form.role === r
                      ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                      : 'border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-300'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Full name {form.role === 'ngo' && '/ Contact person'}</label>
            <input name="name" required className="input-field" value={form.name} onChange={handleChange} />
          </div>

          {form.role === 'ngo' && (
            <>
              <div>
                <label className="label">Organization name</label>
                <input
                  name="organizationName"
                  required
                  className="input-field"
                  value={form.organizationName}
                  onChange={handleChange}
                />
              </div>
              <div className="rounded-xl border border-primary-200 bg-primary-50/50 p-3 dark:border-primary-800 dark:bg-primary-950/30">
                <div className="mb-1 flex items-center justify-between">
                  <label className="label !mb-0 font-semibold text-primary-900 dark:text-primary-200">
                    📍 Registered NGO Office Location (Required for SMS alerts)
                  </label>
                  {officeCoords && (
                    <span className="badge bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                      Location set
                    </span>
                  )}
                </div>
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                  Donations near this fixed office location will trigger automatic SMS/email alerts to your phone.
                </p>
                <MapPicker
                  initialCoords={officeCoords}
                  onChange={setOfficeCoords}
                  onAddressResolved={(addr) => {
                    setOfficeAddress(addr);
                    if (!form.address) setForm((f) => ({ ...f, address: addr }));
                  }}
                  height="220px"
                />
              </div>
            </>
          )}

          {form.role === 'volunteer' && (
            <div>
              <label className="label">Vehicle type</label>
              <select name="vehicleType" className="input-field" value={form.vehicleType} onChange={handleChange}>
                <option value="bike">Bike</option>
                <option value="car">Car</option>
                <option value="van">Van</option>
                <option value="on_foot">On foot</option>
                <option value="other">Other</option>
              </select>
            </div>
          )}

          <div>
            <label className="label">Email</label>
            <input type="email" name="email" required className="input-field" value={form.email} onChange={handleChange} />
          </div>

          <div>
            <label className="label">Password</label>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              className="input-field"
              value={form.password}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Phone (Indian mobile)</label>
              <input
                name="phone"
                type="tel"
                maxLength={13}
                placeholder="+91XXXXXXXXXX"
                className={`input-field ${
                  form.phone && !phoneValid ? 'border-red-500 focus:ring-red-400' : ''
                } ${
                  form.phone && phoneValid ? 'border-green-500 focus:ring-green-400' : ''
                }`}
                value={form.phone || '+91'}
                onFocus={() => { if (!form.phone) setForm({ ...form, phone: '+91' }); }}
                onChange={handlePhoneChange}
              />
              {form.phone && !phoneValid && (
                <p className="mt-1 text-xs text-red-500">Enter 10 digits after +91 (e.g. +91 9876543210)</p>
              )}
              {form.phone && phoneValid && form.phone.length === 13 && (
                <p className="mt-1 text-xs text-green-600">✓ Valid Indian mobile number</p>
              )}
            </div>
            <div>
              <label className="label">Address</label>
              <input name="address" className="input-field" value={form.address} onChange={handleChange} />
            </div>
          </div>

          <p className="text-xs text-gray-400">
            We'll ask your browser for location access to help match you with nearby donations/NGOs. You can skip this.
          </p>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;
