// pages/DonationDetail.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiMapPin, FiClock, FiPackage, FiUser } from 'react-icons/fi';
import DashboardLayout from '../components/DashboardLayout';
import StatusBadge from '../components/StatusBadge';
import Loader from '../components/Loader';
import DonationsMapView from '../components/DonationsMapView';
import { getDonationById, getNearbyNGOs } from '../services/donationService';
import { useAuth } from '../context/AuthContext';

const DonationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [donation, setDonation] = useState(null);
  const [nearbyNGOs, setNearbyNGOs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDonationById(id)
      .then(({ data }) => setDonation(data.data))
      .catch(() => toast.error('Could not load donation'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (user?.role === 'donor' && donation?.status === 'pending') {
      getNearbyNGOs(id)
        .then(({ data }) => setNearbyNGOs(data.data))
        .catch(() => {});
    }
  }, [donation, id, user]);

  if (loading) return <DashboardLayout><Loader /></DashboardLayout>;
  if (!donation) return <DashboardLayout><p>Donation not found.</p></DashboardLayout>;

  const imageBase = (import.meta.env.VITE_API_URL || '').replace('/api', '');

  return (
    <DashboardLayout>
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex w-fit items-center gap-1 text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400"
      >
        <FiArrowLeft size={14} /> Back
      </button>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <div className="mb-4 h-56 w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700">
              {donation.image ? (
                <img src={`${imageBase}${donation.image}`} alt={donation.foodName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-6xl">🍱</div>
              )}
            </div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">{donation.foodName}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">{donation.category}</p>
              </div>
              <StatusBadge status={donation.status} />
            </div>

            {donation.description && (
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{donation.description}</p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <FiPackage /> {donation.quantity?.value} {donation.quantity?.unit}
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <FiClock /> Expires {new Date(donation.expiryDate).toLocaleString()}
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                <FiUser /> {donation.donor?.name}
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100">
              <FiMapPin /> Pickup Location
            </h2>
            <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">{donation.pickupLocation?.address}</p>
            <DonationsMapView
              donations={[donation]}
              center={[donation.pickupLocation.coordinates[1], donation.pickupLocation.coordinates[0]]}
              height="300px"
            />
          </div>

          <div className="card">
            <h2 className="mb-3 font-semibold text-gray-900 dark:text-gray-100">Timeline</h2>
            <ol className="space-y-3 border-l border-gray-200 pl-4 dark:border-gray-700">
              {donation.timeline?.map((t, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary-500" />
                  <p className="text-sm font-medium capitalize text-gray-800 dark:text-gray-200">{t.status.replace(/_/g, ' ')}</p>
                  {t.note && <p className="text-xs text-gray-500 dark:text-gray-400">{t.note}</p>}
                  <p className="text-xs text-gray-400">{new Date(t.timestamp).toLocaleString()}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="space-y-4">
          {donation.acceptedBy && (
            <div className="card">
              <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">Accepted by</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">{donation.acceptedBy.name}</p>
              <p className="text-xs text-gray-400">{donation.acceptedBy.phone}</p>
            </div>
          )}
          {donation.assignedVolunteer && (
            <div className="card">
              <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">Assigned Volunteer</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">{donation.assignedVolunteer.name}</p>
              <p className="text-xs text-gray-400">{donation.assignedVolunteer.phone}</p>
            </div>
          )}
          {nearbyNGOs.length > 0 && (
            <div className="card">
              <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">Recommended NGOs Nearby</h3>
              <div className="space-y-2">
                {nearbyNGOs.map((n) => (
                  <div key={n.ngo.ngoProfileId} className="rounded-lg bg-gray-50 p-2.5 text-xs dark:bg-gray-700/40">
                    <p className="font-medium text-gray-800 dark:text-gray-200">{n.ngo.organizationName}</p>
                    <p className="text-gray-500 dark:text-gray-400">{n.distanceKm} km away</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DonationDetail;
