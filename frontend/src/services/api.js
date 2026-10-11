import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

export const getHealth = async () => {
  const response = await api.get('/health');
  return response.data;
};

export const createGenerationJob = async (jobData) => {
  const response = await api.post('/jobs', jobData);
  return response.data;
};

export const getJobs = async ({ page = 1, pageSize = 10, status = '', search = '' } = {}) => {
  const params = {
    page,
    page_size: pageSize,
  };
  if (status) params.status = status;
  if (search) params.search = search;

  const response = await api.get('/jobs', { params });
  return response.data;
};

export const getJobDetails = async (jobId) => {
  const response = await api.get(`/jobs/${jobId}`);
  return response.data;
};

export const getJobCertificates = async (jobId) => {
  const response = await api.get(`/jobs/${jobId}/certificates`);
  return response.data;
};

export const downloadCertificatePdf = async (certificateId) => {
  const response = await api.get(`/certificates/${certificateId}`, {
    responseType: 'blob',
  });
  return response;
};

export const extractErrorMessage = (error) => {
  if (error.response?.data?.detail) {
    if (typeof error.response.data.detail === 'string') {
      return error.response.data.detail;
    }
    if (Array.isArray(error.response.data.detail)) {
      return error.response.data.detail
        .map((d) => (d.msg ? `${d.loc?.slice(-1)[0] || 'Field'}: ${d.msg}` : JSON.stringify(d)))
        .join(', ');
    }
    return JSON.stringify(error.response.data.detail);
  }
  return error.message || 'An unexpected error occurred';
};

export default api;
