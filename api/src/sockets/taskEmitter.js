import { getIO } from '../config/socket.js';

/**
 * Emit task events to:
 *  - Explicit users
 *  - Admin room
 */
export const emitTaskEvent = ({
    type,
    taskId,
    actor,
    payload,
    targetUsers = []
}) => {
    try {
        const io = getIO();

        // 🔔 Send to admins room
        io.to('admins').emit('task:event', {
            type,
            taskId,
            actor,
            payload
        });

        // 🔔 Send to specific users
        targetUsers.forEach(userId => {
            io.to(`user_${userId}`).emit('task:event', {
                type,
                taskId,
                actor,
                payload
            });
        });

    } catch (err) {
        console.error('emitTaskEvent failed:', err);
    }
};
