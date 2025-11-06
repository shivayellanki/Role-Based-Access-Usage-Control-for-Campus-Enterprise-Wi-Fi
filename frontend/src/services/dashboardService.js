import api from '../utils/api';

export const dashboardService = {
  getAdminDashboard: async () => {
    const response = await api.get('/dashboard/admin');
    return response.data;
  },

  getUserDashboard: async () => {
    const response = await api.get('/dashboard/user');
    return response.data;
  },

  getAuditLogs: async (params = {}) => {
    const response = await api.get('/dashboard/audit-logs', { params });
    return response.data;
  },
};


