import { getIO } from '../config/socket.js';
import pool from '../db/pool.js';

export const emitNotification = async ({ userId, notification }) => {
    try {
        const io = getIO();

        // send single notification
        io.to(`user_${userId}`).emit('notification:new', notification);

        // 🔥 send updated unread count
        const { rows } = await pool.query(
            `SELECT COUNT(*) FROM notifications WHERE user_id=$1 AND is_read=false`,
            [userId]
        );

        io.to(`user_${userId}`).emit('notification:count', Number(rows[0].count));

    } catch (err) {
        console.error('Notification emit failed', err);
    }
};
