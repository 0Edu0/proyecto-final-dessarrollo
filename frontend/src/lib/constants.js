export const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
export const ROLES = ['CLIENT', 'TECH', 'ADMIN'];

export const STATUS_LABEL = { OPEN: 'Abierto', IN_PROGRESS: 'En progreso', RESOLVED: 'Resuelto', CLOSED: 'Cerrado' };
export const PRIORITY_LABEL = { LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta', URGENT: 'Urgente' };
export const ROLE_LABEL = { CLIENT: 'Cliente', TECH: 'Técnico', ADMIN: 'Administrador' };
export const JOB_STATUS_LABEL = {
  WAITING: 'En espera',
  ACTIVE: 'Procesando',
  RETRYING: 'Reintentando',
  COMPLETED: 'Completado',
  FAILED: 'Fallido',
};
export const QUEUE_LABEL = { 'ticket-assignment': 'Asignación', notifications: 'Notificaciones' };

// Igual que STATUS_TRANSITIONS del backend
export const STATUS_TRANSITIONS = {
  OPEN: ['IN_PROGRESS'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: ['IN_PROGRESS', 'CLOSED'],
  CLOSED: [],
};

export const formatDate = (iso) =>
  new Date(iso).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' });

// Quién puede cambiar el estado / editar un ticket (el backend lo vuelve a validar)
export const canChangeStatus = (user, ticket) =>
  user.role === 'ADMIN' || (user.role === 'TECH' && ticket.assignedTo?.id === user.id);

export const canManage = (user, ticket) =>
  user.role === 'ADMIN' || (ticket.createdBy.id === user.id && ticket.status === 'OPEN');
