// src/services/authService.js

import api from "./api";

export const login = (data) => api.post("token/", data);
export const register = (data) => api.post("register/", data);
export const logout = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
};