import api from './client';

export const getReportMetadata = () => api.get('/api/report/metadata').then(r => r.data);
export const getReportItems = (params) => api.get('/api/report/items', { params }).then(r => r.data);
export const getReportItem = (rank) => api.get(`/api/report/items/${rank}`).then(r => r.data);
export const refreshReport = () => api.post('/api/report/refresh').then(r => r.data);
