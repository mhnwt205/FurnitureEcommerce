const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const apiClient = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, config);

  // If unauthorized, we might want to log out the user automatically
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Optionally dispatch an event or redirect to login
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMessage = data?.message || response.statusText || 'An error occurred';
    throw new Error(errorMessage);
  }

  return data;
};

export default apiClient;
