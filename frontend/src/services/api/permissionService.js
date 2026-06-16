import apiClient from './apiClient';

export const permissionService = {
  getPermissions: () => apiClient('/permissions'),
};
