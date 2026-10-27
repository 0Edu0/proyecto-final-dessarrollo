import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const hash = (token) => crypto.createHash('sha256').update(token).digest('hex');

export function signAccessToken(user) {
  return jwt.sign({ role: user.role }, env.JWT_ACCESS_SECRET, { subject: user.id, expiresIn: '15m' });
}

// Crea un refresh token opaco; en BD solo se guarda su hash
export async function issueRefreshToken(userId, familyId = crypto.randomUUID(), db = prisma) {
  const token = crypto.randomBytes(64).toString('hex');
  const record = await db.refreshToken.create({
    data: { tokenHash: hash(token), familyId, userId, expiresAt: new Date(Date.now() + REFRESH_TTL_MS) },
  });
  return { token, record };
}

// Rota el refresh token: invalida el actual y emite uno nuevo en la misma familia
export async function rotateRefreshToken(token) {
  const current = await prisma.refreshToken.findUnique({
    where: { tokenHash: hash(token) },
    include: { user: true },
  });
  if (!current || current.expiresAt < new Date()) {
    throw new AppError(401, 'UNAUTHORIZED', 'Sesión inválida o expirada');
  }
  if (current.revokedAt) {
    // Reuso de un token ya rotado: se asume robo y se mata toda la familia
    await revokeFamily(current.familyId);
    throw new AppError(401, 'TOKEN_REUSE', 'Sesión inválida');
  }
  if (!current.user.isActive) {
    throw new AppError(401, 'UNAUTHORIZED', 'Usuario desactivado');
  }

  const next = await prisma.$transaction(async (tx) => {
    // updateMany condicional evita que dos refresh concurrentes roten el mismo token
    const { count } = await tx.refreshToken.updateMany({
      where: { id: current.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (count === 0) throw new AppError(401, 'TOKEN_REUSE', 'Sesión inválida');
    const issued = await issueRefreshToken(current.userId, current.familyId, tx);
    await tx.refreshToken.update({ where: { id: current.id }, data: { replacedById: issued.record.id } });
    return issued;
  });

  return { user: current.user, refreshToken: next.token };
}

export const revokeFamily = (familyId) =>
  prisma.refreshToken.updateMany({ where: { familyId, revokedAt: null }, data: { revokedAt: new Date() } });

export async function revokeByToken(token) {
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash: hash(token) } });
  if (record) await revokeFamily(record.familyId);
}

export const REFRESH_COOKIE = 'rt';

export const refreshCookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: env.NODE_ENV === 'production',
  path: '/api/auth',
  maxAge: REFRESH_TTL_MS,
};

// bull-board se abre desde el navegador (sin header Authorization): el ADMIN canjea su access token
// por una cookie de corta duración limitada a /admin/queues
export const BOARD_COOKIE = 'bb_token';
const BOARD_TTL_MS = 60 * 60 * 1000;

export const boardCookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: env.NODE_ENV === 'production',
  path: '/admin/queues',
  maxAge: BOARD_TTL_MS,
};

export const signBoardToken = (user) =>
  jwt.sign({ role: user.role, scope: 'bull-board' }, env.JWT_ACCESS_SECRET, { subject: user.id, expiresIn: '1h' });

export function verifyBoardToken(token) {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
  if (payload.scope !== 'bull-board' || payload.role !== 'ADMIN') throw new Error('Token no válido para bull-board');
  return payload;
}
