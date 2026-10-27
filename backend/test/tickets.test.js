import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { signAccessToken } from '../src/services/token.service.js';
import { cleanupQueues } from './helpers.js';

const suffix = `${Date.now()}@helpdesk.test`;
const users = {};
const auth = (u) => ({ Authorization: `Bearer ${signAccessToken(users[u])}` });
const newTicket = (createdBy, extra = {}) =>
  prisma.ticket.create({
    data: { title: 'Ticket de prueba', description: 'Descripción de prueba', createdById: users[createdBy].id, ...extra },
  });

beforeAll(async () => {
  for (const [key, role] of [['admin', 'ADMIN'], ['tech', 'TECH'], ['tech2', 'TECH'], ['client', 'CLIENT'], ['client2', 'CLIENT']]) {
    users[key] = await prisma.user.create({
      data: { name: key, email: `${key}-${suffix}`, passwordHash: 'x', role },
    });
  }
});

afterAll(async () => {
  await cleanupQueues();
  await prisma.ticket.deleteMany({ where: { createdBy: { email: { endsWith: '@helpdesk.test' } } } });
  await prisma.user.deleteMany({ where: { email: { endsWith: '@helpdesk.test' } } });
  await prisma.$disconnect();
});

describe('autenticación', () => {
  it('GET /tickets sin token devuelve 401', async () => {
    const res = await request(app).get('/api/tickets');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('POST /api/tickets', () => {
  it('CLIENT crea un ticket OPEN a su nombre', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set(auth('client'))
      .send({ title: 'No abre la VPN', description: 'Error al conectar', priority: 'HIGH' });
    expect(res.status).toBe(201);
    expect(res.body.ticket).toMatchObject({ status: 'OPEN', priority: 'HIGH', createdById: users.client.id });
  });

  it('TECH no puede crear (403)', async () => {
    const res = await request(app).post('/api/tickets').set(auth('tech')).send({ title: 'Hola mundo', description: 'Descripción' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('datos inválidos devuelven 400 con details', async () => {
    const res = await request(app).post('/api/tickets').set(auth('client')).send({ title: 'x', priority: 'NOPE' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toBeDefined();
  });
});

describe('GET /api/tickets (visibilidad por rol)', () => {
  let own, other, assigned;
  beforeAll(async () => {
    own = await newTicket('client', { priority: 'URGENT' });
    other = await newTicket('client2');
    assigned = await newTicket('client2', { assignedToId: users.tech.id });
  });

  const ids = (res) => res.body.data.map((t) => t.id);

  it('CLIENT ve solo los suyos', async () => {
    const res = await request(app).get('/api/tickets').set(auth('client'));
    expect(res.status).toBe(200);
    expect(ids(res)).toContain(own.id);
    expect(ids(res)).not.toContain(other.id);
  });

  it('TECH ve solo los asignados', async () => {
    const res = await request(app).get('/api/tickets').set(auth('tech'));
    expect(ids(res)).toEqual([assigned.id]);
  });

  it('ADMIN ve todos', async () => {
    const res = await request(app).get('/api/tickets?limit=100').set(auth('admin'));
    expect(ids(res)).toEqual(expect.arrayContaining([own.id, other.id, assigned.id]));
  });

  it('filtra por priority y pagina', async () => {
    const res = await request(app).get('/api/tickets?priority=URGENT&limit=1').set(auth('client'));
    expect(ids(res)).toEqual([own.id]);
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 1, total: 1, totalPages: 1 });
  });

  it('parámetros inválidos devuelven 400', async () => {
    const res = await request(app).get('/api/tickets?status=NOPE&limit=0').set(auth('admin'));
    expect(res.status).toBe(400);
  });
});

describe('GET /api/tickets/:id', () => {
  let ticket;
  beforeAll(async () => {
    ticket = await newTicket('client', { assignedToId: users.tech.id });
  });
  const get = (id, u) => request(app).get(`/api/tickets/${id}`).set(auth(u));

  it.each(['client', 'tech', 'admin'])('%s con acceso recibe 200', async (u) => {
    expect((await get(ticket.id, u)).status).toBe(200);
  });

  it.each(['client2', 'tech2'])('%s sin relación recibe 403', async (u) => {
    expect((await get(ticket.id, u)).status).toBe(403);
  });

  it('id inexistente devuelve 404', async () => {
    const res = await get('00000000-0000-4000-8000-000000000000', 'admin');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('id mal formado devuelve 400', async () => {
    expect((await get('abc', 'admin')).status).toBe(400);
  });
});

describe('PATCH y DELETE /api/tickets/:id', () => {
  const patch = (id, u, body = { title: 'Título nuevo' }) => request(app).patch(`/api/tickets/${id}`).set(auth(u)).send(body);
  const del = (id, u) => request(app).delete(`/api/tickets/${id}`).set(auth(u));

  it('el dueño edita su ticket OPEN', async () => {
    const t = await newTicket('client');
    const res = await patch(t.id, 'client');
    expect(res.status).toBe(200);
    expect(res.body.ticket.title).toBe('Título nuevo');
  });

  it('otro cliente no puede editar ni borrar (403)', async () => {
    const t = await newTicket('client');
    expect((await patch(t.id, 'client2')).status).toBe(403);
    expect((await del(t.id, 'client2')).status).toBe(403);
  });

  it('el dueño no puede editar ni borrar si ya no está OPEN (403)', async () => {
    const t = await newTicket('client', { status: 'IN_PROGRESS' });
    expect((await patch(t.id, 'client')).status).toBe(403);
    expect((await del(t.id, 'client')).status).toBe(403);
  });

  it('TECH no puede editar ni borrar (403)', async () => {
    const t = await newTicket('client', { assignedToId: users.tech.id });
    expect((await patch(t.id, 'tech')).status).toBe(403);
    expect((await del(t.id, 'tech')).status).toBe(403);
  });

  it('body vacío en PATCH devuelve 400', async () => {
    const t = await newTicket('client');
    expect((await patch(t.id, 'client', {})).status).toBe(400);
  });

  it('el dueño borra su ticket OPEN (204) y luego 404', async () => {
    const t = await newTicket('client');
    expect((await del(t.id, 'client')).status).toBe(204);
    expect((await del(t.id, 'admin')).status).toBe(404);
  });

  it('ADMIN borra un ticket que no está OPEN', async () => {
    const t = await newTicket('client', { status: 'CLOSED' });
    expect((await del(t.id, 'admin')).status).toBe(204);
  });
});

describe('PATCH /api/tickets/:id/status', () => {
  const setStatus = (id, u, status) => request(app).patch(`/api/tickets/${id}/status`).set(auth(u)).send({ status });

  it('TECH asignado recorre el flujo válido', async () => {
    const t = await newTicket('client', { assignedToId: users.tech.id });
    expect((await setStatus(t.id, 'tech', 'IN_PROGRESS')).body.ticket.status).toBe('IN_PROGRESS');
    expect((await setStatus(t.id, 'tech', 'RESOLVED')).body.ticket.status).toBe('RESOLVED');
    expect((await setStatus(t.id, 'tech', 'IN_PROGRESS')).status).toBe(200); // reabrir
  });

  it('transición inválida devuelve 409 INVALID_TRANSITION', async () => {
    const t = await newTicket('client', { assignedToId: users.tech.id });
    const res = await setStatus(t.id, 'tech', 'CLOSED');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });

  it('TECH no asignado, CLIENT dueño: 403', async () => {
    const t = await newTicket('client', { assignedToId: users.tech.id });
    expect((await setStatus(t.id, 'tech2', 'IN_PROGRESS')).status).toBe(403);
    expect((await setStatus(t.id, 'client', 'IN_PROGRESS')).status).toBe(403);
  });

  it('ADMIN puede cambiar el estado aunque no esté asignado', async () => {
    const t = await newTicket('client');
    expect((await setStatus(t.id, 'admin', 'IN_PROGRESS')).status).toBe(200);
  });

  it('estado inválido devuelve 400 y ticket inexistente 404', async () => {
    const t = await newTicket('client');
    expect((await setStatus(t.id, 'admin', 'NOPE')).status).toBe(400);
    expect((await setStatus('00000000-0000-4000-8000-000000000000', 'admin', 'IN_PROGRESS')).status).toBe(404);
  });
});

describe('/api/users', () => {
  it('ADMIN lista técnicos filtrando por rol, sin passwordHash', async () => {
    const res = await request(app).get('/api/users?role=TECH').set(auth('admin'));
    expect(res.status).toBe(200);
    expect(res.body.users.length).toBeGreaterThanOrEqual(2);
    expect(res.body.users.every((u) => u.role === 'TECH' && u.passwordHash === undefined)).toBe(true);
  });

  it('CLIENT y TECH no pueden listar (403)', async () => {
    expect((await request(app).get('/api/users').set(auth('client'))).status).toBe(403);
    expect((await request(app).get('/api/users').set(auth('tech'))).status).toBe(403);
  });

  it('ADMIN cambia el rol de un usuario', async () => {
    const res = await request(app).patch(`/api/users/${users.client2.id}/role`).set(auth('admin')).send({ role: 'TECH' });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('TECH');
  });

  it('no-ADMIN no puede cambiar roles (403)', async () => {
    const res = await request(app).patch(`/api/users/${users.client.id}/role`).set(auth('tech')).send({ role: 'ADMIN' });
    expect(res.status).toBe(403);
  });

  it('rol inválido 400, usuario inexistente 404, rol propio 409', async () => {
    const bad = await request(app).patch(`/api/users/${users.tech.id}/role`).set(auth('admin')).send({ role: 'ROOT' });
    expect(bad.status).toBe(400);
    const missing = await request(app).patch('/api/users/00000000-0000-4000-8000-000000000000/role').set(auth('admin')).send({ role: 'TECH' });
    expect(missing.status).toBe(404);
    const self = await request(app).patch(`/api/users/${users.admin.id}/role`).set(auth('admin')).send({ role: 'CLIENT' });
    expect(self.status).toBe(409);
  });
});
