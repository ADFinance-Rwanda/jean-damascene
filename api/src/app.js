import express from 'express';
import cors from 'cors';
import userRoutes from './routes/users.js';
import taskRoutes from './routes/tasks.js';
import errorHandler from './middleware/errorHandler.js';
import corsConfig from './config/cors.js';

const app = express();

app.use(cors(corsConfig));
app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);


app.use(errorHandler);
export default app;