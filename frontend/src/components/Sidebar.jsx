// components/Sidebar.jsx
// Role-aware sidebar navigation for the dashboard layout.

import { NavLink } from 'react-router-dom';
import {
  FiHome,
  FiPlusCircle,
  FiList,
  FiMap,
  FiUsers,
  FiTruck,
  FiPackage,
  FiBarChart2,
  FiCheckCircle,
  FiMessageSquare,
  FiRadio,
  FiActivity,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const LINKS = {
  donor: [
    { to: '/dashboard', label: 'Overview', icon: FiHome, end: true },
    { to: '/dashboard/new-donation', label: 'New Donation', icon: FiPlusCircle },
    { to: '/dashboard/my-donations', label: 'My Donations', icon: FiList },
  ],
  ngo: [
    { to: '/dashboard', label: 'Overview', icon: FiHome, end: true },
    { to: '/dashboard/browse', label: 'Nearby Donations', icon: FiMap },
    { to: '/dashboard/accepted', label: 'Accepted Donations', icon: FiPackage },
  ],
  volunteer: [
    { to: '/dashboard', label: 'Overview', icon: FiHome, end: true },
    { to: '/dashboard/overview', label: 'Tracking & Notifications', icon: FiRadio },
    { to: '/dashboard/pickups', label: 'My Pickups', icon: FiTruck },
  ],
  admin: [
    { to: '/dashboard', label: 'Analytics', icon: FiBarChart2, end: true },
    { to: '/dashboard/live-map', label: 'Live Map', icon: FiActivity },
    { to: '/dashboard/users', label: 'Users', icon: FiUsers },
    { to: '/dashboard/approvals', label: 'NGO/Volunteer Approvals', icon: FiCheckCircle },
    { to: '/dashboard/donations', label: 'All Donations', icon: FiPackage },
  ],
};

const Sidebar = () => {
  const { user } = useAuth();
  const links = LINKS[user?.role] || [];

  return (
    <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 md:block">
      <div className="mb-6 rounded-lg bg-primary-50 px-3 py-2.5 dark:bg-primary-900/30">
        <p className="text-xs font-medium uppercase tracking-wide text-primary-700 dark:text-primary-300">Logged in as</p>
        <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{user?.name}</p>
        <p className="text-xs capitalize text-gray-500 dark:text-gray-400">{user?.role}</p>
      </div>
      <nav className="space-y-1">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`
            }
          >
            <Icon size={17} /> {label}
          </NavLink>
        ))}
        <NavLink
          to="/dashboard/feedback"
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              isActive ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
            }`
          }
        >
          <FiMessageSquare size={17} /> Feedback
        </NavLink>
      </nav>
    </aside>
  );
};

export default Sidebar;
