import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';

const publicSelect = { id: true, name: true, email: true, role: true, isActive: true };

export const list = ({ role }) =>
  prisma.user.findMany({ where: role ? { role } : {}, select: publicSelect, orderBy: { name: 'asc' } });

export async function updateRole(actor, id, role) {
  if (actor.id === id) throw new AppError(409, 'CONFLICT', 'No puedes cambiar tu propio rol');
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError(404, 'NOT_FOUND', 'Usuario no encontrado');
  return prisma.user.update({ where: { id }, data: { role }, select: publicSelect });
}
