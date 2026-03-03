import api from '../utils/api';

export const authService = {
  login: async (username, password, macAddress) => {
    const response = await api.post('/auth/login', {
      username,
      password,
      macAddress,
    });
    return response.data;
  },

  requestOTP: async (email) => {
    const response = await api.post('/auth/guest/request-otp', { email });
    return response.data;
  },

  verifyOTP: async (email, otp, macAddress) => {
    const response = await api.post('/auth/guest/verify-otp', {
      email,
      otp,
      macAddress,
    });
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
};

