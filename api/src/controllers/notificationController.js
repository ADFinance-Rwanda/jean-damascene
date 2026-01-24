import asyncHandler from 'express-async-handler';
import { getNotificationsByUser, markNotificationsRead } from '../services/notificationService.js';
import { sendSuccess } from '../utils/response.js';

/* Get notifications for logged-in user */
export const getMyNotifications = asyncHandler(async (req, res) => {
    const notifications = await getNotificationsByUser(req.user.id);
    return sendSuccess(res, notifications, 'Notifications retrieved');
});

/* Mark notifications as read */
export const markAsRead = asyncHandler(async (req, res) => {
    const { ids } = req.body; // array of notification IDs
    const updated = await markNotificationsRead(ids);
    return sendSuccess(res, updated, 'Notifications marked as read');
});
