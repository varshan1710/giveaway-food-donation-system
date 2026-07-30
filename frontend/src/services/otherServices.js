// services/otherServices.js
// Grouped service functions for NGO, Volunteer, Admin, and Feedback resources.
import api from './api';

// ---- NGO ----
export const listNGOs = () => api.get('/ngo');
export const getAvailableVolunteers = () => api.get('/ngo/volunteers');
export const getMyNgoProfile = () => api.get('/ngo/profile');
export const updateMyNgoProfile = (payload) => api.put('/ngo/profile', payload);

// ---- Volunteer ----
export const getMyPickups = (params = {}) => api.get('/volunteer/pickups', { params });
export const getMyVolunteerProfile = () => api.get('/volunteer/profile');
export const updateMyVolunteerProfile = (payload) => api.put('/volunteer/profile', payload);
export const updateVolunteerLocation = (coordinates) => api.put('/volunteer/location', { coordinates });

// Live tracking toggle
export const startTracking = () => api.put('/volunteer/tracking/start');
export const stopTracking = () => api.put('/volunteer/tracking/stop');

// Nearby donation poll (volunteer polls this for new donation notifications)
export const getNearbyDonations = (radiusKm = 5) =>
  api.get('/volunteer/nearby-donations', { params: { radius: radiusKm } });

// Volunteer self-accept (first-accept-wins)
export const volunteerAcceptDonation = (donationId) =>
  api.put(`/volunteer/donations/${donationId}/accept`);

// ---- Admin ----
export const getUsers = (params = {}) => api.get('/admin/users', { params });
export const setUserActiveStatus = (id, isActive) => api.put(`/admin/users/${id}/status`, { isActive });
export const getAllNGOsAdmin = () => api.get('/admin/ngo');
export const approveNGO = (id) => api.put(`/admin/ngo/${id}/approve`);
export const getAllVolunteersAdmin = () => api.get('/admin/volunteer');
export const approveVolunteer = (id) => api.put(`/admin/volunteer/${id}/approve`);
export const getAllDonationsAdmin = (params = {}) => api.get('/admin/donations', { params });
export const getAnalytics = () => api.get('/admin/analytics');

// Live volunteer map (admin)
export const getLiveVolunteers = () => api.get('/admin/volunteers/live');

// ---- Feedback ----
export const createFeedback = (payload) => api.post('/feedback', payload);
export const getFeedback = () => api.get('/feedback');
