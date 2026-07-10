import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "/api" : "http://localhost:3001/api")
});

api.interceptors.request.use((config) => {
  let token = null;
  try {
    token = window.localStorage.getItem("nota10.token");
  } catch {
    token = null;
  }
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
