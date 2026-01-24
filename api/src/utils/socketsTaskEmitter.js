import { getIO } from "../config/socket";

export const emitTaskEvent = ({
    type,
    taskId,
    actor,
    payload = {},
    targetUsers = []
}) => {
    try {
        const io = getIO();

        const event = {
            type,
            taskId,
            actor,
            payload,
            timestamp: new Date().toISOString()
        };

        // Global task listeners (dashboards, admin views)
        io.to('tasks').emit('task:event', event);

        // Targeted user listeners
        targetUsers.forEach(userId => {
            io.to(`user_${userId}`).emit('task:event', event);
        });

    } catch (err) {
        console.error('Socket emit failed:', err);
    }
};
