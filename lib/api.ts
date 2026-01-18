import axios, { AxiosHeaders } from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8001",
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      const headers = AxiosHeaders.from(config.headers ?? {});
      headers.set("Authorization", `Bearer ${token}`);
      config.headers = headers;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const detail = error?.response?.data?.detail;
    if (typeof window !== "undefined" && status === 403 && detail === "Email not verified") {
      sessionStorage.setItem("toast:message", "Verify your email to unlock full access.");
      window.location.href = "/verify-email";
    }
    if (typeof window !== "undefined" && status === 401) {
      localStorage.removeItem("access_token");
      sessionStorage.setItem("toast:message", "You were logged out. Please sign in again.");
      window.dispatchEvent(new CustomEvent("auth:logged_out"));
      window.location.href = "/auth?reason=logged_out";
    }
    return Promise.reject(error);
  }
);
