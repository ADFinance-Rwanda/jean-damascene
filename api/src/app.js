import express from 'express';
import cors from 'cors';
import userRoutes from './routes/users.js';
import taskRoutes from './routes/tasks.js';
import errorHandler from './middleware/errorHandler.js';
import corsConfig from './config/cors.js';
import swaggerSpec from './config/swagger.js';
import swaggerUi from 'swagger-ui-express';
import { initSocket } from './config/socket.js';
import http from "http";

const app = express();

app.use(cors(corsConfig));
app.use(express.json());

// Swagger
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);

const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// io.on('connection', socket => {
//     const user = socket.user;

//     socket.join(`user_${user.id}`);
//     socket.join('tasks');

//     socket.on('disconnect', () => {
//         socket.leave(`user_${user.id}`);
//         socket.leave('tasks');
//     });
// });


app.use(errorHandler);
export default app;