import api from "./api";

export const getChatUsers = async (params = {}) => {
  const response = await api.get("/chat/users", { params });
  return response.data;
};

export const getMessages = async (userId, params = {}) => {
  const response = await api.get(`/chat/messages/${userId}`, { params });
  return response.data;
};

export const sendMessage = async (payload) => {
  const response = await api.post("/chat/send-message", payload);
  return response.data;
};

export const sendImageMessage = async ({ receiverId, text, image }, onUploadProgress) => {
  const formData = new FormData();
  formData.append("receiverId", receiverId);
  formData.append("image", image);

  if (text) {
    formData.append("text", text);
  }

  const response = await api.post("/chat/send-image", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress,
  });

  return response.data;
};

export const sendVideoMessage = async ({ receiverId, text, video }, onUploadProgress) => {
  const formData = new FormData();
  formData.append("receiverId", receiverId);
  formData.append("video", video);

  if (text) {
    formData.append("text", text);
  }

  const response = await api.post("/chat/send-video", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress,
  });

  return response.data;
};

export const markMessageAsRead = async (messageId) => {
  const response = await api.put(`/chat/read/${messageId}`);
  return response.data;
};

export const deleteMessage = async (messageId) => {
  const response = await api.delete(`/chat/messages/${messageId}`);
  return response.data;
};
