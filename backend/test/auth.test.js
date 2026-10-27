import { jest } from '@jest/globals';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { closeQueues } from '../src/queues/index.js';
import { authenticate } from '../src/middlewares/authenticate.js';
import { authorize } from '../src/middlewares/authorize.js';

const email = `test-${Date.now()}@helpdesk.test`;
const password = 'Password123!';

// Extrae el valor de la cookie rt de la respuesta
const getRt = (res) => {
  const cookie = (res.headers['set-cookie'] ?? []).find((c) => c.startsWith('rt='));
  return cookie?.split(';')[0].slice(3);
};

afterAll(async () => {
  await closeQueues();
  await prisma.user.deleteMany({ where: { email: { endsWith: '@helpdesk.test' } } });
  await prisma.$disconnect();
});

describe('POST /api/auth/register', () => {
  it('crea un usuario CLIENT sin exponer el hash', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'Test', email, password });
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ email, role: 'CLIENT' });
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rechaza correo duplicado con 409', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'Test', email, password });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('rechaza datos inválidos con VALIDATION_ERROR', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'T', email: 'x', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toBeDefined();
  });
});

describe('POST /api/auth/login', () => {
  it('rechaza contraseña incorrecta', async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password: 'incorrecta' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('devuelve access token y cookie httpOnly', async () => {
    const res = await request(app).post('/api/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    const cookie = res.headers['set-cookie'].find((c) => c.startsWith('rt='));
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Path=\/api\/auth/);
  });
});

describe('GET /api/auth/me', () => {
  it('requiere token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('devuelve el usuario con token válido', async () => {
    const login = await request(app).post('/api/auth/login').send({ email, password });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(email);
  });
});

describe('refresh, rotación y logout', () => {
  it('rota el refresh token y detecta reuso revocando la familia', async () => {
    const login = await request(app).post('/api/auth/login').send({ email, password });
    const rt1 = getRt(login);

    const r1 = await request(app).post('/api/auth/refresh').set('Cookie', `rt=${rt1}`);
    expect(r1.status).toBe(200);
    expect(r1.body.accessToken).toEqual(expect.any(String));
    const rt2 = getRt(r1);
    expect(rt2).not.toBe(rt1);

    // Reusar el token ya rotado: 401 TOKEN_REUSE
    const reuse = await request(app).post('/api/auth/refresh').set('Cookie', `rt=${rt1}`);
    expect(reuse.status).toBe(401);
    expect(reuse.body.error.code).toBe('TOKEN_REUSE');

    // El token nuevo también quedó revocado (misma familia)
    const r2 = await request(app).post('/api/auth/refresh').set('Cookie', `rt=${rt2}`);
    expect(r2.status).toBe(401);
  });

  it('refresh sin cookie devuelve 401', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('logout revoca el refresh token', async () => {
    const login = await request(app).post('/api/auth/login').send({ email, password });
    const rt = getRt(login);

    const out = await request(app).post('/api/auth/logout').set('Cookie', `rt=${rt}`);
    expect(out.status).toBe(204);

    const res = await request(app).post('/api/auth/refresh').set('Cookie', `rt=${rt}`);
    expect(res.status).toBe(401);
  });
});

describe('authorize(...roles)', () => {
  const run = (role) => {
    const next = jest.fn();
    authorize('ADMIN')({ user: { role } }, {}, next);
    return next.mock.calls[0][0];
  };

  it('permite el rol indicado', () => {
    expect(run('ADMIN')).toBeUndefined();
  });

  it('bloquea otros roles con 403', () => {
    const err = run('CLIENT');
    expect(err.status).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('authenticate rechaza un token manipulado', () => {
    const next = jest.fn();
    authenticate({ headers: { authorization: 'Bearer basura' } }, {}, next);
    expect(next.mock.calls[0][0].status).toBe(401);
  });
});
