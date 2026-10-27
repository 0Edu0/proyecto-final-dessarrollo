import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { BOARD_PATH, boardRouter } from './config/bullBoard.js';
import { authenticateBoard } from './middlewares/authenticateBoard.js';
import routes from './routes/index.js';
import { notFound } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api', routes);
app.use(BOARD_PATH, authenticateBoard, boardRouter);

app.use(notFound);
app.use(errorHandler);
