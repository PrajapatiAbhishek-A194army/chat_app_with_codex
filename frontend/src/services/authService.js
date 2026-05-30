import api from "./api";

export const signupUser = async (payload) => {
  const response = await api.post("/auth/signup", payload);
  return response.data;
};

export const loginUser = async (payload) => {
  const response = await api.post("/auth/login", payload);
  return response.data;
};

export const googleAuthUser = async (token) => {
  const response = await api.post("/auth/google", { token });
  return response.data;
};

export const logoutUser = async () => {
  const response = await api.post("/auth/logout");
  return response.data;
};

export const forgotPassword = async (payload) => {
  const response = await api.post("/auth/forgot-password", payload);
  return response.data;
};

export const resetPassword = async ({ token, password }) => {
  const response = await api.post(`/auth/reset-password/${token}`, {
    password,
  });
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get("/auth/me");
  return response.data;
};

export const deleteAccount = async () => {
  const response = await api.delete("/auth/delete-account");
  return response.data;
};

export const changePassword = async (payload) => {
  const response = await api.put("/auth/change-password", payload);
  return response.data;
};
