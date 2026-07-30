// components/StatusBadge.jsx
// Color-coded pill for donation status values, reused across all dashboards.

const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  accepted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  out_for_pickup: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  picked_up: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  expired: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  cancelled: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

const LABELS = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  out_for_pickup: 'Out for Pickup',
  picked_up: 'Picked Up',
  delivered: 'Delivered',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

const StatusBadge = ({ status }) => (
  <span className={`badge ${STATUS_STYLES[status] || STATUS_STYLES.pending}`}>
    {LABELS[status] || status}
  </span>
);

export default StatusBadge;
