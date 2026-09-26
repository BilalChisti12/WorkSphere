import { apiClient, getBackendUrl } from './client';

// GET /get_user_profile - own profile
export const getMyProfile = () => apiClient('/get_user_profile');

// GET /user/profile/:id - other user profile (id = User _id)
export const getUserProfile = (userId) => apiClient(`/user/profile/${userId}`);

// POST /user_update - update name/email/username/password
export const updateUser = (newUserData) =>
  apiClient('/user_update', {
    method: 'POST',
    body: JSON.stringify({ newUserData }),
  });

// POST /update_profile_data - update bio/work/education/skills
// CRITICAL: arrays are replaced entirely - always send complete arrays
export const updateProfileData = (newProfileData) =>
  apiClient('/update_profile_data', {
    method: 'POST',
    body: JSON.stringify({ newProfileData }),
  });

// POST /update_profile_pic - multipart upload
export const updateProfilePic = (file) => {
  const formData = new FormData();
  formData.append('profile_picture', file);
  return apiClient('/update_profile_pic', {
    method: 'POST',
    body: formData,
  });
};

// GET /user/search?query=&page=&limit= - search users (public endpoint)
export const searchUsers = (query = '', page = 1, limit = 10) =>
  apiClient(`/user/search?query=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);

// PDF download - use window.open, not fetch (binary stream)
export const downloadResume = (userId) => {
  const url = `${getBackendUrl()}/user/download_resume?id=${userId}`;
  window.open(url, '_blank');
};

// POST /user/connections/send_connection_request
export const sendConnectionRequest = (connectionId) =>
  apiClient('/user/connections/send_connection_request', {
    method: 'POST',
    body: JSON.stringify({ connectionId }),
  });

// POST /user/connections/connection_requests - my OUTGOING requests
// NOTE: Backend uses POST for a fetch operation (semantic mismatch)
export const getMyOutgoingRequests = () =>
  apiClient('/user/connections/connection_requests', { method: 'POST' });

// POST /user/connections - my INCOMING requests
// NOTE: Backend uses POST for a fetch operation (semantic mismatch)
export const getMyIncomingRequests = () =>
  apiClient('/user/connections', { method: 'POST' });

// POST /user/connections/accept_connection
// action: "accept" to accept, any other string to reject
export const respondToRequest = (requestId, action) =>
  apiClient('/user/connections/accept_connection', {
    method: 'POST',
    body: JSON.stringify({ requestId, action }),
  });
