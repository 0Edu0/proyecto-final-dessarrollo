import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { signAccessToken } from '../src/services/token.service.js';
import { cleanupQueues } from './helpers.js';

const suffix = `${Date.now()}@helpdesk.test`;
const users = {};
const auth = (u) => ({ Authorization: `Bearer ${signAccessToken(users[u])}` });
let ticket;

beforeAll(async () => {
  for (const [key, role] of [['admin', 'ADMIN'], ['client', 'CLIENT'], ['client2', 'CLIENT']]) {
    users[key] = await prisma.user.create({ data: { name: key, email: `${key}-${suffix}`, passwordHash: 'x', role } });
  }
  const res = await request(app).post('/api/tickets').set(auth('client')).send({ title: 'Ticket con colas', description: 'Prueba de jobs', priority: 'URGENT' });
  ticket = res.body.ticket;
});

afterAll(async () => {
  await cleanupQueues();
  await prisma.ticket.deleteMany({ where: { createdBy: { email: { endsWith: '@helpdesk.test' } } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: '@helpdesk.test' } } });
  await prisma.$disconnect();
});

describe('encolado al crear ticket', () => {
  it('registra en JobLog la asignación y la notificación', async () => {
    const res = await request(app).get(`/api/tickets/${ticket.id}/jobs`).set(auth('client'));
    expect(res.status).toBe(200);
    expect(res.body.jobs.map((j) => `${j.queue}/${j.name}`).sort()).toEqual(['notifications/ticket-created', 'ticket-assignment/assign']);
  });

  it('el job de asignación usa jobId idempotente', async () => {
    const res = await request(app).get(`/api/tickets/${ticket.id}/jobs`).set(auth('client'));
    expect(res.body.jobs.find((j) => j.name === 'assign').jobId).toBe(`assign-${ticket.id}`);
  });

  it('otro cliente no ve los jobs del ticket (403)', async () => {
    expect((await request(app).get(`/api/tickets/${ticket.id}/jobs`).set(auth('client2'))).status).toBe(403);
  });
});

describe('GET /api/jobs', () => {
  it('solo ADMIN (403 para CLIENT)', async () => {
    expect((await request(app).get('/api/jobs').set(auth('client'))).status).toBe(403);
  });

  it('ADMIN lista paginado y filtra por cola', async () => {
    const res = await request(app).get('/api/jobs?queue=ticket-assignment&limit=5').set(auth('admin'));
    expect(res.status).toBe(200);
    expect(res.body.data.every((j) => j.queue === 'ticket-assignment')).toBe(true);
    expect(res.body.pagination.limit).toBe(5);
  });

  it('filtros inválidos devuelven 400', async () => {
    expect((await request(app).get('/api/jobs?status=NOPE').set(auth('admin'))).status).toBe(400);
  });
});

describe('GET /api/jobs/:queue/:id', () => {
  const url = () => `/api/jobs/ticket-assignment/assign-${ticket.id}`;

  it('el dueño del ticket ve estado, intentos y error', async () => {
    const res = await request(app).get(url()).set(auth('client'));
    expect(res.status).toBe(200);
    expect(res.body.job).toHaveProperty('status');
    expect(res.body.job).toHaveProperty('attempts');
    expect(res.body.job).toHaveProperty('error');
  });

  it('otro cliente recibe 403', async () => {
    expect((await request(app).get(url()).set(auth('client2'))).status).toBe(403);
  });

  it('job inexistente 404 y cola inválida 400', async () => {
    expect((await request(app).get('/api/jobs/notifications/nope').set(auth('admin'))).status).toBe(404);
    expect((await request(app).get('/api/jobs/otra-cola/nope').set(auth('admin'))).status).toBe(400);
  });
});

describe('POST /api/jobs/:queue/:id/retry', () => {
  const url = () => `/api/jobs/ticket-assignment/assign-${ticket.id}/retry`;

  it('CLIENT recibe 403', async () => {
    expect((await request(app).post(url()).set(auth('client'))).status).toBe(403);
  });

  it('un job que no está fallido devuelve 409', async () => {
    const res = await request(app).post(url()).set(auth('admin'));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });
});

describe('bull-board', () => {
  it('sin cookie devuelve 401', async () => {
    expect((await request(app).get('/admin/queues')).status).toBe(401);
  });

  it('solo ADMIN obtiene la cookie y con ella entra', async () => {
    expect((await request(app).post('/api/admin/queues/session').set(auth('client'))).status).toBe(403);
    const session = await request(app).post('/api/admin/queues/session').set(auth('admin'));
    expect(session.status).toBe(200);
    const cookie = session.headers['set-cookie'][0].split(';')[0];
    expect((await request(app).get('/admin/queues').set('Cookie', cookie)).status).toBe(200);
  });
});
