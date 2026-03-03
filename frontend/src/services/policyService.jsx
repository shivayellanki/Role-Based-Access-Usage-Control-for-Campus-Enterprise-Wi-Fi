import api from '../utils/api';

export const policyService = {
  getAll: async () => {
    const response = await api.get('/policies');
    return response.data;
  },

  getByRole: async (roleId) => {
    const response = await api.get(`/policies/role/${roleId}`);
    return response.data;
  },

  update: async (policyId, data) => {
    const response = await api.put(`/policies/${policyId}`, data);
    return response.data;
  },
};


