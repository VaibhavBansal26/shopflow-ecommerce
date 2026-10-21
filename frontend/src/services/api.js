import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/auth/refresh`,
            { refreshToken }
          );
          const newToken = data.tokens?.access || data.accessToken;
          localStorage.setItem('token', newToken);
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        } catch (refreshErr) {
          // only force-logout when the refresh endpoint itself says the token is invalid
          const status = refreshErr.response?.status;
          if (status === 401 || status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
          }
          // network error or server down: keep tokens, let the app handle it
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
