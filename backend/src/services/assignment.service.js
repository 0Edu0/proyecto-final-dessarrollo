import { prisma } from '../config/prisma.js';

const ACTIVE_STATUSES = ['OPEN', 'IN_PROGRESS'];

// TECH activo con menos tickets OPEN/IN_PROGRESS; en empate, el más antiguo
async function pickTech() {
  const techs = await prisma.user.findMany({
    where: { role: 'TECH', isActive: true },
    select: {
      id: true,
      createdAt: true,
      _count: { select: { ticketsAssigned: { where: { status: { in: ACTIVE_STATUSES } } } } },
    },
  });
  techs.sort((a, b) => a._count.ticketsAssigned - b._count.ticketsAssigned || a.createdAt - b.createdAt);
  return techs[0] ?? null;
}

// Devuelve { techId } si asignó, o { skipped } si no había nada que hacer
export async function assignTicket(ticketId) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return { skipped: 'ticket-not-found' };
  if (ticket.assignedToId) return { skipped: 'already-assigned' }; // idempotente

  const tech = await pickTech();
  if (!tech) throw new Error('No hay técnicos activos disponibles'); // BullMQ reintenta

  // Condicional: si alguien asignó a mano entre medias, no se pisa
  const { count } = await prisma.ticket.updateMany({
    where: { id: ticketId, assignedToId: null },
    data: { assignedToId: tech.id },
  });
  return count ? { techId: tech.id } : { skipped: 'already-assigned' };
}
