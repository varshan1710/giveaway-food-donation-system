// components/Navbar.jsx
// Top navigation bar: logo, theme toggle, user menu / auth links.

import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { FiSun, FiMoon, FiMenu, FiX, FiLogOut, FiUser } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-700 dark:bg-gray-900/90">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 text-xl font-extrabold text-primary-700 dark:text-primary-400">
          <span aria-hidden>🍲</span> GiveAway
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-6 md:flex">
          <Link to="/" className="text-sm font-medium text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400">
            Home
          </Link>
          {user && (
            <Link to="/dashboard" className="text-sm font-medium text-gray-600 hover:text-primary-600 dark:text-gray-300 dark:hover:text-primary-400">
              Dashboard
            </Link>
          )}

          <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {theme === 'light' ? <FiMoon size={18} /> : <FiSun size={18} />}
          </button>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1.5 text-sm font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300"
              >
                <FiUser size={16} /> {user.name?.split(' ')[0]}
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                  <Link
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <FiLogOut size={14} /> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                Log in
              </Link>
              <Link to="/register" className="btn-primary !py-2 !px-4 text-sm">
                Get Started
              </Link>
            </div>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden" onClick={() => setMobileOpen((o) => !o)} aria-label="Toggle menu">
          {mobileOpen ? <FiX size={22} /> : <FiMenu size={22} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-gray-200 px-4 pb-4 dark:border-gray-700 md:hidden">
          <div className="flex flex-col gap-3 pt-3">
            <Link to="/" onClick={() => setMobileOpen(false)} className="text-sm font-medium">
              Home
            </Link>
            {user && (
              <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="text-sm font-medium">
                Dashboard
              </Link>
            )}
            <button onClick={toggleTheme} className="flex items-center gap-2 text-sm font-medium">
              {theme === 'light' ? <FiMoon size={16} /> : <FiSun size={16} />} Toggle theme
            </button>
            {user ? (
              <>
                <Link to="/profile" onClick={() => setMobileOpen(false)} className="text-sm font-medium">
                  Profile
                </Link>
                <button onClick={handleLogout} className="text-left text-sm font-medium text-red-600">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)} className="text-sm font-medium">
                  Log in
                </Link>
                <Link to="/register" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-primary-600">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
