import { env } from '../config/env.js';

// Lanza un error aleatorio según SIMULATE_FAILURE_RATE (demo de reintentos)
export function simulateFailure() {
  if (Math.random() < env.SIMULATE_FAILURE_RATE) {
    throw new Error('Fallo simulado (SIMULATE_FAILURE_RATE)');
  }
}
