import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { env } from './config/env.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

import { authRouter } from './routes/auth.routes.js';
import { userRouter } from './routes/user.routes.js';
import { enquiryRouter } from './routes/enquiry.routes.js';
import { planRouter } from './routes/plan.routes.js';
import { programPlanRouter } from './routes/programPlan.routes.js';
import { recipeRouter } from './routes/recipe.routes.js';
import { callRouter } from './routes/call.routes.js';
import { availabilityRouter } from './routes/availability.routes.js';
import { progressRouter } from './routes/progress.routes.js';
import { clientNoteRouter } from './routes/clientNote.routes.js';
import { messageRouter } from './routes/message.routes.js';
import { reportRouter } from './routes/report.routes.js';
import { insightsRouter } from './routes/insights.routes.js';

const uploadsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../uploads');

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(uploadsDir));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/enquiries', enquiryRouter);
app.use('/api/plans', planRouter);
app.use('/api/program-plans', programPlanRouter);
app.use('/api/recipes', recipeRouter);
app.use('/api/calls', callRouter);
app.use('/api/availability', availabilityRouter);
app.use('/api/progress', progressRouter);
app.use('/api/client-notes', clientNoteRouter);
app.use('/api/messages', messageRouter);
app.use('/api/reports', reportRouter);
app.use('/api/insights', insightsRouter);

app.use(notFoundHandler);
app.use(errorHandler);
