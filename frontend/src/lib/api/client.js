// Base API client - all requests go through here

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

export const getBackendUrl = () => BASE_URL;

export const getImageUrl = (filename) => {
  if (!filename) return null;
  return `${BASE_URL}/${filename}`;
};

export const apiClient = async (endpoint, options = {}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Only set Content-Type: application/json for non-FormData requests
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Try to parse JSON, fallback to null for non-JSON responses
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    // Handle typos in backend: "mesage" and "sucess"
    const message =
      (data && (data.message || data.mesage)) || 'An error occurred';
    const err = new Error(message);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
};
