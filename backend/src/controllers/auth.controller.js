import * as authService from '../services/auth.service.js';
import { REFRESH_COOKIE, refreshCookieOptions, revokeByToken } from '../services/token.service.js';
import { AppError } from '../utils/AppError.js';

const clearOptions = { ...refreshCookieOptions, maxAge: undefined };

export async function register(req, res) {
  const user = await authService.register(req.body);
  res.status(201).json({ user });
}

export async function login(req, res) {
  const { accessToken, refreshToken, user } = await authService.login(req.body);
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions);
  res.json({ accessToken, user });
}

export async function refresh(req, res) {
  const token = req.cookies[REFRESH_COOKIE];
  if (!token) throw new AppError(401, 'UNAUTHORIZED', 'Falta el refresh token');
  try {
    const { accessToken, refreshToken, user } = await authService.refresh(token);
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions);
    res.json({ accessToken, user });
  } catch (err) {
    res.clearCookie(REFRESH_COOKIE, clearOptions);
    throw err;
  }
}

export async function logout(req, res) {
  const token = req.cookies[REFRESH_COOKIE];
  if (token) await revokeByToken(token);
  res.clearCookie(REFRESH_COOKIE, clearOptions);
  res.status(204).end();
}

export async function me(req, res) {
  res.json({ user: await authService.getMe(req.user.id) });
}
