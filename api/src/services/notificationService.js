import pool from '../db/pool.js';
import { AppError } from '../utils/response.js';

/**
 * Create a notification
 * @param {number} userId - recipient user ID
 * @param {string} type - notification type (task_assigned, task_updated, etc.)
 * @param {string} message - content of the notification
 * @param {number} taskId - optional, related task
 */
export const createNotification = async (userId, type, message, taskId = null) => {
    const { rows } = await pool.query(
        `INSERT INTO notifications(user_id, task_id, type, message)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [userId, taskId, type, message]
    );
    return rows[0];
};

/**
 * Get notifications for a user
 * @param {number} userId
 * @param {boolean} onlyUnread
 */
export const getNotificationsByUser = async (userId, onlyUnread = false) => {
    const { rows } = await pool.query(
        `SELECT *
         FROM notifications
         WHERE user_id = $1
         ${onlyUnread ? 'AND is_read = FALSE' : ''}
         ORDER BY created_at DESC`,
        [userId]
    );
    return rows;
};

/**
 * Mark notifications as read
 * @param {number[]} notificationIds
 */
export const markNotificationsRead = async (notificationIds) => {
    if (!notificationIds.length) return [];
    const { rows } = await pool.query(
        `UPDATE notifications
         SET is_read = TRUE
         WHERE id = ANY($1::int[])
         RETURNING *`,
        [notificationIds]
    );
    return rows;
};
