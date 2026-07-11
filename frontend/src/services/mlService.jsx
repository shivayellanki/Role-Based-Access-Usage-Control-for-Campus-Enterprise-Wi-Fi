import api from '../utils/api';

export const mlService = {
  /**
   * Returns model status and actual evaluation metrics.
   * GET /api/ml/status
   */
  getStatus: async () => {
    const response = await api.get('/ml/status');
    return response.data;
  },

  /**
   * Submits a session for ML anomaly analysis.
   * POST /api/ml/analyze  (Admin only)
   * @param {Object} sessionData
   */
  analyzeSession: async (sessionData) => {
    const response = await api.post('/ml/analyze', sessionData);
    return response.data;
  },
};
