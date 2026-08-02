import apiClient from './apiClient';

export const aiAdvisorService = {
  sendMessage: async (message, context = {}) => {
    return await apiClient('/ai-advisor/chat', {
      method: 'POST',
      body: JSON.stringify({ message, context })
    });
  }
};