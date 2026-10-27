import * as userService from '../services/user.service.js';

export const list = async (req, res) => res.json({ users: await userService.list(req.query) });

export async function updateRole(req, res) {
  res.json({ user: await userService.updateRole(req.user, req.params.id, req.body.role) });
}
