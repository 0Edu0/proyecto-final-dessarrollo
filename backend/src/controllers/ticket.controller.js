import * as ticketService from '../services/ticket.service.js';
import * as jobLogService from '../services/jobLog.service.js';

export const list = async (req, res) => res.json(await ticketService.list(req.user, req.query));

export const getById = async (req, res) => res.json({ ticket: await ticketService.getById(req.user, req.params.id) });

export async function create(req, res) {
  res.status(201).json({ ticket: await ticketService.create(req.user, req.body) });
}

export async function update(req, res) {
  res.json({ ticket: await ticketService.update(req.user, req.params.id, req.body) });
}

export async function remove(req, res) {
  await ticketService.remove(req.user, req.params.id);
  res.status(204).end();
}

export async function changeStatus(req, res) {
  res.json({ ticket: await ticketService.changeStatus(req.user, req.params.id, req.body.status) });
}

export async function jobs(req, res) {
  await ticketService.getById(req.user, req.params.id); // valida que el usuario tenga acceso al ticket
  res.json({ jobs: await jobLogService.listByTicket(req.params.id) });
}
