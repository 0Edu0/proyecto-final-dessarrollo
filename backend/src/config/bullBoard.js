import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { queues } from '../queues/index.js';

export const BOARD_PATH = '/admin/queues';

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath(BOARD_PATH);
createBullBoard({ queues: Object.values(queues).map((q) => new BullMQAdapter(q)), serverAdapter });

export const boardRouter = serverAdapter.getRouter();
