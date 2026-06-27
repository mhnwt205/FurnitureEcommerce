import apiClient from './apiClient';

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value);
    }
  });
  return searchParams.toString();
};

export const consultationRequestService = {
  createConsultationRequest: async (payload) => {
    return await apiClient('/consultation-requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getMyConsultationRequests: async () => {
    return await apiClient('/consultation-requests/my', {
      method: 'GET',
    });
  },

  getConsultationAssignees: async () => {
    return await apiClient('/consultation-requests/admin/assignees', { method: 'GET' });
  },

  getAdminConsultations: async (params = {}) => {
    const queryString = buildQueryString(params);
    const endpoint = queryString ? `/consultation-requests/admin?${queryString}` : '/consultation-requests/admin';
    return await apiClient(endpoint, { method: 'GET' });
  },

  getAdminConsultation: async (id) => {
    return await apiClient(`/consultation-requests/admin/${id}`, { method: 'GET' });
  },

  updateConsultationStatus: async (id, status) => {
    return await apiClient(`/consultation-requests/admin/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  assignConsultation: async (id, assignedStaffId) => {
    return await apiClient(`/consultation-requests/admin/${id}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ assignedStaffId }),
    });
  },

  updateConsultationNote: async (id, internalNote) => {
    return await apiClient(`/consultation-requests/admin/${id}/note`, {
      method: 'PATCH',
      body: JSON.stringify({ internalNote }),
    });
  }
};