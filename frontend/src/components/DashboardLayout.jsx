// components/DashboardLayout.jsx
// Common shell for all authenticated dashboard pages: Navbar + Sidebar + content area.

import Navbar from './Navbar';
import Sidebar from './Sidebar';

const DashboardLayout = ({ children }) => {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="mx-auto flex w-full max-w-7xl flex-1">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
