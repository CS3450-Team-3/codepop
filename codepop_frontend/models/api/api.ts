import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:9000/backend/";

let accessToken: string | null = null;

// Helper to set token in memory and localStorage
export const setAccessToken = (token: string | null) => {
  accessToken = token;
  if (typeof window !== "undefined") {
    if (token) localStorage.setItem("access_token", token);
    else localStorage.removeItem("access_token");
  }
};

// Initialize accessToken from localStorage on app start
if (typeof window !== "undefined") {
  accessToken = localStorage.getItem("access_token");
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Request interceptor to add token to headers
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Response interceptor to handle token refresh
let isRefreshing = false;
let refreshQueue: any[] = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${API_BASE_URL}auth/refresh/`,
          {},
          { withCredentials: true }
        );

        setAccessToken(data.access);

        refreshQueue.forEach((p) => p.resolve(data.access));
        refreshQueue = [];

        originalRequest.headers.Authorization = `Bearer ${data.access}`;
        return api(originalRequest);
      } catch (err) {
        // If refresh fails, clear token and redirect to login
        setAccessToken(null);
        refreshQueue.forEach((p) => p.reject(err));
        refreshQueue = [];

        if (typeof window !== "undefined" && window.location.pathname !== "/auth/login") {
          window.location.href = "/auth/login";
        }

        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;