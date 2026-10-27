import IORedis from 'ioredis';
import { env } from '../config/env.js';

// Conexión compartida por colas y workers. BullMQ exige maxRetriesPerRequest: null
export const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
