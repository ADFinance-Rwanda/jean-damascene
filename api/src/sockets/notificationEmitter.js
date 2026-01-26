import { getIO } from '../config/socket.js';

export const emitNotification = ({ userId, notification }) => {
    try {
        const io = getIO();
        io.to(`user_${userId}`).emit('notification:new', notification);
    } catch (err) {
        console.error('Notification emit failed', err);
    }
};
