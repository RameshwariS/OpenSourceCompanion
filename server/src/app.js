import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(helmet()); // secure HTTP headers
app.use(cors({ origin: env.CLIENT_URL, credentials: true })); // only our frontend, cookies allowed
app.use(express.json({ limit: '10kb' })); // reject huge bodies
app.use(cookieParser());

app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later' },
  }),
);

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;