import express from 'express';
import { getMyNotifications, markAsRead } from '../controllers/notificationController.js';
import { verifyUserToken } from '../middleware/verifyUserToken.js';

const router = express.Router();

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get my notifications
 *     security:
 *       - BearerAuth: []
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: List of notifications
 */
router.get('/', verifyUserToken, getMyNotifications);

/**
 * @swagger
 * /api/notifications/read:
 *   put:
 *     summary: Mark notifications as read
 *     security:
 *       - BearerAuth: []
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Notifications marked as read
 */
router.put('/read', verifyUserToken, markAsRead);

export default router;
