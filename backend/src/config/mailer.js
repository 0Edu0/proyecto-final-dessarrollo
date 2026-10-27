import nodemailer from 'nodemailer';
import { env } from './env.js';

// Mailpit: SMTP local sin TLS ni autenticación
export const mailer = nodemailer.createTransport({ host: env.SMTP_HOST, port: env.SMTP_PORT, secure: false });
