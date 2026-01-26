import { getIO } from '../config/socket.js';

export const emitTaskEvent = ({
    type,
    actor,
    payload = {}
}) => {
    try {
        const io = getIO();

        const event = {
            type,            // e.g., task_created, task_updated
            actor,           // who did it
            payload,         // task data
            timestamp: new Date().toISOString()
        };

        // 🔔 Emit to ALL connected clients
        io.emit('task:event', event);

    } catch (err) {
        console.error('❌ Task socket emit failed:', err.message);
    }
};
