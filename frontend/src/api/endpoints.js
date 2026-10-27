import { api } from './client.js';

const data = (p) => p.then((r) => r.data);

export const authApi = {
  login: (body) => data(api.post('/auth/login', body)),
  register: (body) => data(api.post('/auth/register', body)),
  logout: () => api.post('/auth/logout'),
};

export const ticketsApi = {
  list: (params) => data(api.get('/tickets', { params })),
  get: (id) => data(api.get(`/tickets/${id}`)).then((d) => d.ticket),
  create: (body) => data(api.post('/tickets', body)).then((d) => d.ticket),
  update: (id, body) => data(api.patch(`/tickets/${id}`, body)).then((d) => d.ticket),
  remove: (id) => api.delete(`/tickets/${id}`),
  changeStatus: (id, status) => data(api.patch(`/tickets/${id}/status`, { status })).then((d) => d.ticket),
  jobs: (id) => data(api.get(`/tickets/${id}/jobs`)).then((d) => d.jobs),
};

export const usersApi = {
  list: (params) => data(api.get('/users', { params })).then((d) => d.users),
  updateRole: (id, role) => data(api.patch(`/users/${id}/role`, { role })).then((d) => d.user),
};

export const jobsApi = {
  list: (params) => data(api.get('/jobs', { params })),
  retry: (queue, id) => data(api.post(`/jobs/${queue}/${id}/retry`)),
};

export const adminApi = {
  openQueuesSession: () => data(api.post('/admin/queues/session')),
};
