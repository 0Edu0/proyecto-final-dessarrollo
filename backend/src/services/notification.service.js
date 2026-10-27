import { env } from '../config/env.js';
import { mailer } from '../config/mailer.js';
import { prisma } from '../config/prisma.js';

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const STATUS_LABEL = { OPEN: 'Abierto', IN_PROGRESS: 'En progreso', RESOLVED: 'Resuelto', CLOSED: 'Cerrado' };

// Plantilla HTML mínima compartida por todos los correos
const layout = (title, body, ticket) => `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #ddd;border-radius:8px;overflow:hidden">
  <div style="background:#1e3a8a;color:#fff;padding:16px 24px"><h2 style="margin:0">HelpDesk Galacticos</h2></div>
  <div style="padding:24px">
    <h3 style="margin-top:0">${escapeHtml(title)}</h3>
    ${body}
    <table style="margin-top:16px;border-collapse:collapse;width:100%">
      <tr><td style="padding:4px 0;color:#666">Ticket</td><td>${escapeHtml(ticket.title)}</td></tr>
      <tr><td style="padding:4px 0;color:#666">Prioridad</td><td>${ticket.priority}</td></tr>
      <tr><td style="padding:4px 0;color:#666">Estado</td><td>${STATUS_LABEL[ticket.status]}</td></tr>
    </table>
  </div>
</div>`;

const send = (user, subject, html) => mailer.sendMail({ from: env.MAIL_FROM, to: user.email, subject, html });

// Un manejador por tipo de job de la cola `notifications`; devuelven la cantidad de correos enviados
const handlers = {
  async 'ticket-created'(ticket) {
    const html = layout('Recibimos tu ticket', `<p>Hola ${escapeHtml(ticket.createdBy.name)}, registramos tu solicitud y la asignaremos a un técnico en breve.</p>`, ticket);
    await send(ticket.createdBy, `Ticket creado: ${ticket.title}`, html);
    return 1;
  },

  async 'ticket-assigned'(ticket) {
    const tech = ticket.assignedTo;
    if (!tech) return 0; // el ticket quedó sin técnico, no hay a quién avisar
    const toClient = layout('Tu ticket fue asignado', `<p>Hola ${escapeHtml(ticket.createdBy.name)}, <b>${escapeHtml(tech.name)}</b> atenderá tu solicitud.</p>`, ticket);
    const toTech = layout('Nuevo ticket asignado', `<p>Hola ${escapeHtml(tech.name)}, se te asignó un ticket de ${escapeHtml(ticket.createdBy.name)}:</p><p>${escapeHtml(ticket.description)}</p>`, ticket);
    await send(ticket.createdBy, `Ticket asignado: ${ticket.title}`, toClient);
    await send(tech, `Nuevo ticket asignado: ${ticket.title}`, toTech);
    return 2;
  },

  async 'status-changed'(ticket, { from, to }) {
    const html = layout('Cambió el estado de tu ticket', `<p>Hola ${escapeHtml(ticket.createdBy.name)}, el estado pasó de <b>${STATUS_LABEL[from]}</b> a <b>${STATUS_LABEL[to]}</b>.</p>`, ticket);
    await send(ticket.createdBy, `Ticket ${STATUS_LABEL[to].toLowerCase()}: ${ticket.title}`, html);
    return 1;
  },
};

// Alerta a los ADMIN, al cliente y al técnico del ticket cuando un job agota sus reintentos
async function sendJobFailedAlert({ queue, jobName, jobId, ticketId, attempts, error }) {
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
  const ticket = ticketId
    ? await prisma.ticket.findUnique({ where: { id: ticketId }, include: { createdBy: true, assignedTo: true } })
    : null;
  // Sin duplicados por correo (un admin puede ser también el creador del ticket)
  const recipients = [...new Map([...admins, ticket?.createdBy, ticket?.assignedTo].filter(Boolean).map((u) => [u.email, u])).values()];
  const html = `
<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #ddd;border-radius:8px;overflow:hidden">
  <div style="background:#991b1b;color:#fff;padding:16px 24px"><h2 style="margin:0">HelpDesk Galacticos — Job fallido</h2></div>
  <div style="padding:24px">
    <p>Un job agotó sus reintentos y quedó en estado FAILED.</p>
    <table style="border-collapse:collapse;width:100%">
      <tr><td style="padding:4px 0;color:#666">Cola</td><td>${escapeHtml(queue)}</td></tr>
      <tr><td style="padding:4px 0;color:#666">Job</td><td>${escapeHtml(jobName)} (${escapeHtml(jobId)})</td></tr>
      <tr><td style="padding:4px 0;color:#666">Ticket</td><td>${escapeHtml(ticketId ?? '—')}</td></tr>
      <tr><td style="padding:4px 0;color:#666">Intentos</td><td>${attempts}</td></tr>
      <tr><td style="padding:4px 0;color:#666">Error</td><td>${escapeHtml(error)}</td></tr>
    </table>
    <p>Puedes reintentarlo desde el panel de jobs.</p>
  </div>
</div>`;
  for (const user of recipients) await send(user, `Job fallido: ${jobName} (${queue})`, html);
  return { sent: recipients.length };
}

export async function sendNotification(name, data) {
  if (name === 'job-failed-alert') return sendJobFailedAlert(data); // no depende de un ticket
  const handler = handlers[name];
  if (!handler) throw new Error(`Tipo de notificación desconocido: ${name}`);

  const ticket = await prisma.ticket.findUnique({
    where: { id: data.ticketId },
    include: { createdBy: true, assignedTo: true },
  });
  if (!ticket) return { skipped: 'ticket-not-found' }; // se borró antes de procesar: reintentar no sirve
  return { sent: await handler(ticket, data) };
}
