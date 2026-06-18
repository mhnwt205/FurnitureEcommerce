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

  const data = await response.json().catch(() => null);

  if (response.status === 401 || response.status === 403) {
    const errorMsg = (data?.message || '').toLowerCase();
    if (errorMsg.includes('invalid') || errorMsg.includes('expired') || errorMsg.includes('unauthorized') || errorMsg.includes('access denied')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' } }));
      window.dispatchEvent(new Event('auth-change'));
      if (window.location.pathname !== '/login') {
         window.location.href = '/login';
      }
    }
  }

  if (!response.ok) {
    const errorMessage = data?.message || response.statusText || 'An error occurred';
    throw new Error(errorMessage);
  }

  return data;
};

export default apiClient;
