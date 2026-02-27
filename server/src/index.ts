import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import levelsRoutes from './routes/levels';
import lessonsRoutes from './routes/lessons';
import quizRoutes from './routes/quiz';
import practiceRoutes from './routes/practice';
import drillsRoutes from './routes/drills';
import journalRoutes from './routes/journal';
import dashboardRoutes from './routes/dashboard';
import progressRoutes from './routes/progress';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: ['http://localhost:5173', 'https://trading-academy-dun.vercel.app'], credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/levels', levelsRoutes);
app.use('/api/lessons', lessonsRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/practice', practiceRoutes);
app.use('/api/drills', drillsRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/progress', progressRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Trading Academy server running on http://localhost:${PORT}`);
});

export default app;
