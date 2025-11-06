import api from '../utils/api';

export const sessionService = {
  getCurrent: async () => {
    const response = await api.get('/sessions/current');
    return response.data;
  },

  getAll: async (params = {}) => {
    const response = await api.get('/sessions', { params });
    return response.data;
  },

  getHistory: async (limit = 20) => {
    const response = await api.get('/sessions/history', { params: { limit } });
    return response.data;
  },

  disconnect: async (sessionId) => {
    const response = await api.post(`/sessions/${sessionId}/disconnect`);
    return response.data;
  },
};

