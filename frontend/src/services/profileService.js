import api from "./api";

export const getMyProfile = async () => {
  const response = await api.get("/profile/me");
  return response.data;
};

export const updateProfile = async (payload) => {
  const response = await api.put("/profile/update", payload);
  return response.data;
};

export const uploadAvatar = async (file, onUploadProgress) => {
  const formData = new FormData();
  formData.append("avatar", file);

  const response = await api.put("/profile/avatar", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress,
  });

  return response.data;
};
