import bcrypt from 'bcrypt';
import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { issueRefreshToken, rotateRefreshToken, signAccessToken } from './token.service.js';

export const toPublicUser = ({ id, name, email, role }) => ({ id, name, email, role });

export async function register({ name, email, password }) {
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw new AppError(409, 'CONFLICT', 'El correo ya está registrado');
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { name, email, passwordHash, role: 'CLIENT' } });
  return toPublicUser(user);
}

export async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Mismo mensaje para usuario inexistente y contraseña errónea
  const valid = user && user.isActive && (await bcrypt.compare(password, user.passwordHash));
  if (!valid) throw new AppError(401, 'UNAUTHORIZED', 'Credenciales inválidas');
  const { token } = await issueRefreshToken(user.id);
  return { accessToken: signAccessToken(user), refreshToken: token, user: toPublicUser(user) };
}

export async function refresh(refreshToken) {
  const { user, refreshToken: newToken } = await rotateRefreshToken(refreshToken);
  return { accessToken: signAccessToken(user), refreshToken: newToken, user: toPublicUser(user) };
}

export async function getMe(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) throw new AppError(401, 'UNAUTHORIZED', 'Usuario no disponible');
  return toPublicUser(user);
}
