// pages/Landing.jsx
import { Link } from 'react-router-dom';
import { FiHeart, FiMapPin, FiTrendingUp, FiShield } from 'react-icons/fi';
import Navbar from '../components/Navbar';

const Landing = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <span className="badge bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-300">
              Fighting food waste, together
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight text-gray-900 dark:text-gray-50 sm:text-5xl">
              Surplus food shouldn't go to waste — <span className="text-primary-600">it should go to people.</span>
            </h1>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              GiveAway connects restaurants, households, and event organizers with verified NGOs and
              volunteers so surplus food reaches those who need it, before it expires.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/register" className="btn-primary">
                Start Donating
              </Link>
              <Link to="/register" className="btn-secondary">
                Join as NGO / Volunteer
              </Link>
            </div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 p-10 text-white shadow-xl">
            <div className="grid grid-cols-2 gap-6 text-center">
              <div>
                <p className="text-3xl font-extrabold">1,200+</p>
                <p className="text-sm text-primary-100">Meals delivered</p>
              </div>
              <div>
                <p className="text-3xl font-extrabold">350kg</p>
                <p className="text-sm text-primary-100">Food waste saved</p>
              </div>
              <div>
                <p className="text-3xl font-extrabold">40+</p>
                <p className="text-sm text-primary-100">Partner NGOs</p>
              </div>
              <div>
                <p className="text-3xl font-extrabold">120+</p>
                <p className="text-sm text-primary-100">Active volunteers</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-16 dark:bg-gray-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-gray-900 dark:text-gray-50">How GiveAway works</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: FiHeart, title: 'Donate', text: 'Donors post surplus food with quantity, expiry, and pickup location.' },
              { icon: FiMapPin, title: 'Match', text: 'The nearest verified NGO is recommended automatically using live location.' },
              { icon: FiTrendingUp, title: 'Deliver', text: 'A volunteer picks up and delivers food, updating status in real time.' },
              { icon: FiShield, title: 'Track', text: 'Everyone tracks donation status; admins monitor quality and safety.' },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="card text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                  <Icon size={22} />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Ready to make an impact?</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Whether you have surplus food, run an NGO, or want to volunteer your time — there's a place for you.
        </p>
        <Link to="/register" className="btn-primary mt-6 inline-flex">
          Create your free account
        </Link>
      </section>

      <footer className="border-t border-gray-200 py-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
        © {new Date().getFullYear()} GiveAway. Built to reduce food waste and fight hunger.
      </footer>
    </div>
  );
};

export default Landing;
