// components/DonationCard.jsx
// Compact card used across all dashboards to display a donation summary.

import { Link } from 'react-router-dom';
import { FiClock, FiMapPin, FiPackage } from 'react-icons/fi';
import StatusBadge from './StatusBadge';

const timeUntil = (date) => {
  const diffMs = new Date(date) - new Date();
  if (diffMs <= 0) return 'Expired';
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return `${Math.floor(diffMs / (1000 * 60))} min left`;
  if (hours < 24) return `${hours}h left`;
  return `${Math.floor(hours / 24)}d left`;
};

const DonationCard = ({ donation, actions }) => {
  const urgent = new Date(donation.expiryDate) - new Date() < 1000 * 60 * 60 * 6; // < 6h

  return (
    <div className="card flex flex-col gap-3 sm:flex-row">
      <div className="h-40 w-full shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700 sm:h-28 sm:w-28">
        {donation.image ? (
          <img
            src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${donation.image}`}
            alt={donation.foodName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl">🍱</div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <Link to={`/donations/${donation._id}`} className="font-semibold text-gray-900 hover:text-primary-600 dark:text-gray-100">
              {donation.foodName}
            </Link>
            <p className="text-xs text-gray-500 dark:text-gray-400">{donation.category}</p>
          </div>
          <StatusBadge status={donation.status} />
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-300">
          <span className="flex items-center gap-1">
            <FiPackage size={13} /> {donation.quantity?.value} {donation.quantity?.unit}
          </span>
          <span className={`flex items-center gap-1 ${urgent ? 'font-semibold text-red-600 dark:text-red-400' : ''}`}>
            <FiClock size={13} /> {timeUntil(donation.expiryDate)}
          </span>
          <span className="flex items-center gap-1 truncate">
            <FiMapPin size={13} /> {donation.pickupLocation?.address}
          </span>
        </div>

        {donation.donor?.name && (
          <p className="text-xs text-gray-400">Donor: {donation.donor.name}</p>
        )}

        {(donation.flags?.isDuplicateSuspected || donation.flags?.isSuspicious) && (
          <span className="badge w-fit bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
            ⚠ Flagged for review
          </span>
        )}

        {actions && <div className="mt-1 flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
};

export default DonationCard;
