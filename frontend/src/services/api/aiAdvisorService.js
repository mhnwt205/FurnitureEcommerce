import apiClient from './apiClient';

export const buildAdvisorPayload = ({ message, sessionId = null, clientMessageId, context = {}, resetSession = false }) => ({
  message,
  ...(sessionId ? { sessionId } : {}),
  ...(clientMessageId ? { clientMessageId } : {}),
  ...(resetSession ? { resetSession: true } : {}),
  context
});

export const aiAdvisorService = {
  chatWithAdvisor: async ({ message, sessionId = null, clientMessageId, context = {}, resetSession = false }, { signal } = {}) => {
    return await apiClient('/ai-advisor/chat', {
      method: 'POST',
      signal,
      body: JSON.stringify(buildAdvisorPayload({ message, sessionId, clientMessageId, context, resetSession }))
    });
  },
  sendMessage: async (message, context = {}) => aiAdvisorService.chatWithAdvisor({ message, context })
};
