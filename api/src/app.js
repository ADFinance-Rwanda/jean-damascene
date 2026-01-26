import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import userRoutes from './routes/users.js';
import taskRoutes from './routes/tasks.js';
import errorHandler from './middleware/errorHandler.js';
import corsConfig from './config/cors.js';
import swaggerSpec from './config/swagger.js';

const app = express();

app.use(cors(corsConfig));
app.use(express.json());

// Swagger
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);

app.use(errorHandler);
export default app;