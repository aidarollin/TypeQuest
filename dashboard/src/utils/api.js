import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api"
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem("tq_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res.data,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem("tq_token");
      window.location.href = "/signin";
    }
    return Promise.reject(err);
  }
);

export default api;
