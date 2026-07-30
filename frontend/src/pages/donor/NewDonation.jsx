// pages/donor/NewDonation.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/DashboardLayout';
import MapPicker from '../../components/MapPicker';
import { createDonation } from '../../services/donationService';

const CATEGORIES = ['Cooked Meals', 'Bakery', 'Fruits & Vegetables', 'Grains & Staples', 'Dairy', 'Packaged Food', 'Beverages', 'Other'];
const UNITS = ['kg', 'plates', 'packets', 'liters', 'items'];

const NewDonation = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [coords, setCoords] = useState(null); // no hardcoded fallback — must be set via geolocation/search/click
  const [form, setForm] = useState({
    foodName: '',
    category: CATEGORIES[0],
    quantityValue: '',
    unit: 'kg',
    description: '',
    expiryDate: '',
    address: '',
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!coords) {
      toast.error('Please set the pickup location using "Use My Location", the address search, or by clicking the map.');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('foodName', form.foodName);
      fd.append('category', form.category);
      fd.append('quantity', JSON.stringify({ value: Number(form.quantityValue), unit: form.unit }));
      fd.append('description', form.description);
      fd.append('expiryDate', new Date(form.expiryDate).toISOString());
      fd.append(
        'pickupLocation',
        JSON.stringify({ address: form.address, type: 'Point', coordinates: coords })
      );
      if (imageFile) fd.append('image', imageFile);

      const { data } = await createDonation(fd);
      const notif = data?.notificationStatus;

      if (notif && (notif.smsSent || notif.notifiedCount > 0)) {
        const recipientPhones = (notif.recipients || [])
          .map((r) => `${r.name}${r.phone ? ` (${r.phone})` : ''}`)
          .join(', ');

        toast.success(
          `📲 SMS Alert Sent to NGO!\nSuccessfully notified ${notif.notifiedCount} nearby NGO(s)${
            recipientPhones ? `: ${recipientPhones}` : ''
          }`,
          { duration: 7000, style: { background: '#064e3b', color: '#fff' } }
        );
      } else {
        toast.success('Donation posted successfully!');
      }

      navigate('/dashboard/my-donations');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create donation');
    } finally {
      setLoading(false);
    }
  };

  // Minimum datetime-local value = now
  const minDateTime = new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 16);

  return (
    <DashboardLayout>
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-50">Post a New Donation</h1>

      {/* Donation flow info banner */}
      <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/40">
        <p className="mb-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">📋 How it works after you post:</p>
        <ol className="space-y-1 text-sm text-emerald-700 dark:text-emerald-400">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">1</span>
            <span><strong>Nearby NGOs are instantly alerted</strong> via email &amp; SMS when your donation is posted.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">2</span>
            <span><strong>An NGO accepts</strong> the donation and takes ownership of coordinating the pickup.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">3</span>
            <span><strong>The NGO assigns a volunteer</strong> for pickup &amp; delivery — only after accepting.</span>
          </li>
        </ol>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-4">
          <div>
            <label className="label">Food Name</label>
            <input name="foodName" required className="input-field" value={form.foodName} onChange={handleChange} placeholder="e.g. Vegetable Biryani" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Category</label>
              <select name="category" className="input-field" value={form.category} onChange={handleChange}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Expiry Date & Time</label>
              <input
                type="datetime-local"
                name="expiryDate"
                required
                min={minDateTime}
                className="input-field"
                value={form.expiryDate}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Quantity</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                name="quantityValue"
                required
                className="input-field"
                value={form.quantityValue}
                onChange={handleChange}
              />
            </div>
            <div>
              <label className="label">Unit</label>
              <select name="unit" className="input-field" value={form.unit} onChange={handleChange}>
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              name="description"
              rows={3}
              className="input-field"
              placeholder="Any details NGOs/volunteers should know (allergens, packaging, etc.)"
              value={form.description}
              onChange={handleChange}
            />
          </div>

          <div>
            <label className="label">Food Image (optional)</label>
            <input
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={(e) => setImageFile(e.target.files[0])}
              className="block w-full text-sm text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary-700 dark:file:bg-primary-900/40 dark:file:text-primary-300"
            />
          </div>
        </div>

        <div className="card space-y-4">
          <div>
            <label className="label">Pickup Address</label>
            <input
              name="address"
              required
              className="input-field"
              placeholder="Street, area, city — or set it automatically from the map below"
              value={form.address}
              onChange={handleChange}
            />
            <p className="mt-1 text-xs text-gray-400">
              Tip: use "Use My Location" or search on the map below and this field fills in automatically.
            </p>
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="label !mb-0">Pickup Location on Map</label>
              {coords && (
                <span className="badge bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                  📍 Location set
                </span>
              )}
            </div>
            <MapPicker
              initialCoords={coords}
              onChange={setCoords}
              onAddressResolved={(addr) => setForm((f) => ({ ...f, address: addr }))}
            />
          </div>

          <button type="submit" disabled={loading || !coords} className="btn-primary w-full">
            {loading ? 'Posting...' : !coords ? 'Set pickup location to continue' : 'Post Donation'}
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
};

export default NewDonation;