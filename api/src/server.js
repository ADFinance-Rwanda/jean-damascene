import http from 'http';
import app from './app.js';
import { setupSockets } from './sockets/index.js';

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Attach Socket.IO
setupSockets(server);

// Start server
server.listen(PORT, () => {
    console.log(`🚀 API + Socket running on port ${PORT}`);
});
