// components/StatCard.jsx
const StatCard = ({ icon: Icon, label, value, accent = 'primary' }) => {
  const accentClasses = {
    primary: 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300',
    accent: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    purple: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  };

  return (
    <div className="card flex items-center gap-4">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${accentClasses[accent]}`}>
        {Icon && <Icon size={22} />}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  );
};

export default StatCard;
