export const ASSIGNMENT_QUEUE = 'ticket-assignment';
export const NOTIFICATIONS_QUEUE = 'notifications';

export const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 }, // 2s, 4s
  removeOnComplete: { count: 100 },
  removeOnFail: false, // los fallidos se conservan para poder reintentarlos
};

// En BullMQ un número menor se procesa antes
export const JOB_PRIORITY = { URGENT: 1, HIGH: 2, MEDIUM: 5, LOW: 10 };
