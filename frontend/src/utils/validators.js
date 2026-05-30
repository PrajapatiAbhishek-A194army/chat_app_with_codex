export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const isValidPassword = (password) =>
  typeof password === "string" && password.trim().length >= 8;
