const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(url, options = {}) {
  const token = getToken();
  const isFormData = options.body instanceof FormData;
  const headers = isFormData ? {} : { 'Content-Type': 'application/json', ...options.headers };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  const data = await res.json();

  // If token is expired/invalid, clear it
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  return data;
}

// Auth API
export const login = (email, password) =>
  request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });

export const getMe = () => request('/auth/me');

// User API (public)
export const createClient = (data) =>
  request('/clients', { method: 'POST', body: JSON.stringify(data) });

// User API (auth required, admin only)
export const createAdmin = (data) =>
  request('/admins', { method: 'POST', body: JSON.stringify(data) });

export const createClientAsAdmin = (data) =>
  request('/admin/clients', { method: 'POST', body: JSON.stringify(data) });

// User API (auth required)
export const getUsers = () => request('/users');

export const getUser = (id) => request(`/users/${id}`);

export const updateUser = (id, data) =>
  request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteUser = (id) =>
  request(`/users/${id}`, { method: 'DELETE' });

export const changePassword = (id, data) =>
  request(`/users/${id}/password`, { method: 'PUT', body: JSON.stringify(data) });

export const uploadUserAvatar = (id, file) => {
  const form = new FormData();
  form.append('file', file);
  return request(`/users/${id}/avatar`, { method: 'POST', body: form });
};

export const uploadPetPhoto = (petId, file) => {
  const form = new FormData();
  form.append('file', file);
  return request(`/pets/${petId}/photo`, { method: 'POST', body: form });
};

// Pet API (auth required)
export const createPet = (ownerId, data) =>
  request(`/users/${ownerId}/pets`, { method: 'POST', body: JSON.stringify(data) });

export const getPetsByOwner = (ownerId) =>
  request(`/users/${ownerId}/pets`);

export const updatePet = (petId, data) =>
  request(`/pets/${petId}`, { method: 'PUT', body: JSON.stringify(data) });

export const deletePet = (petId) =>
  request(`/pets/${petId}`, { method: 'DELETE' });

// Appointment API (auth required)
export const createAppointment = (userId, data) =>
  request(`/users/${userId}/appointments`, { method: 'POST', body: JSON.stringify(data) });

export const getMyAppointments = (userId) =>
  request(`/users/${userId}/appointments`);

export const getAllAppointments = () =>
  request('/appointments');

export const getAppointment = (id) =>
  request(`/appointments/${id}`);

export const updateAppointment = (id, data) =>
  request(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deleteAppointment = (id) =>
  request(`/appointments/${id}`, { method: 'DELETE' });

export const approveAppointment = (id) =>
  request(`/appointments/${id}/approve`, { method: 'POST' });

export const rejectAppointment = (id) =>
  request(`/appointments/${id}/reject`, { method: 'POST' });

export const completeAppointment = (id) =>
  request(`/appointments/${id}/complete`, { method: 'POST' });

export const cancelAppointment = (id) =>
  request(`/appointments/${id}/cancel`, { method: 'POST' });

export const getAppointmentHistory = (id) =>
  request(`/appointments/${id}/history`);

// Waiver API
export const getActiveWaiver = () => request('/waivers/active');

export const listWaiverTemplates = () => request('/waivers/templates');

export const createWaiverTemplate = (data) =>
  request('/waivers/templates', { method: 'POST', body: JSON.stringify(data) });

export const activateWaiverTemplate = (id) =>
  request(`/waivers/templates/${id}/activate`, { method: 'POST' });

export const getSignedWaiver = (appointmentId) =>
  request(`/appointments/${appointmentId}/waiver`);

export const signAppointmentWaiver = (appointmentId, data) =>
  request(`/appointments/${appointmentId}/sign-waiver`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const getAuditLogs = () => request('/admin/audit-logs');

// Timeslot API (auth required)
export const getAvailableTimeslots = (date) =>
  request(`/timeslots?date=${encodeURIComponent(date)}`);

export const blockTimeslot = (data) =>
  request('/timeslots/block', { method: 'POST', body: JSON.stringify(data) });

export const getBlockedTimeslots = (date) =>
  request(`/timeslots/blocked${date ? `?date=${encodeURIComponent(date)}` : ''}`);

export const unblockTimeslot = (id) =>
  request(`/timeslots/blocked/${id}`, { method: 'DELETE' });

export const bulkBlockTimeslots = (slots) =>
  request('/timeslots/block/bulk', {
    method: 'POST',
    body: JSON.stringify({ slots }),
  });

export const bulkUnblockTimeslots = (ids) =>
  request('/timeslots/blocked/bulk', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
