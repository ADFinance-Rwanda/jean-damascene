import asyncHandler from 'express-async-handler';
import { getNotificationsByUser, markNotificationsRead } from '../services/notificationService.js';
import { sendSuccess } from '../utils/response.js';

/* Get notifications for logged-in user */
export const getMyNotifications = asyncHandler(async (req, res) => {
    const notifications = await getNotificationsByUser(req.user.id);
    return sendSuccess(res, notifications, 'Notifications retrieved');
});

/* Mark notifications as read */
export const markAsReadx = asyncHandler(async (req, res) => {
    const { ids } = req.body; // array of notification IDs
    const updated = await markNotificationsRead(ids, req.user.id);
    return sendSuccess(res, updated, 'Notifications marked as read');
});

export const markAsRead = asyncHandler(async (req, res) => {
    const { ids } = req.body;
    const updated = await markNotificationsRead(ids.map(Number), req.user.id);

    // emit updated unread count
    const io = getIO();
    const { rows } = await pool.query(
        `SELECT COUNT(*) FROM notifications WHERE user_id=$1 AND is_read=false`,
        [req.user.id]
    );
    io.to(`user_${req.user.id}`).emit('notification:count', Number(rows[0].count));

    return sendSuccess(res, updated, 'Notifications marked as read');
});
