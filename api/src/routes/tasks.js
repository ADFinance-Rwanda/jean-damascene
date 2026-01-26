import express from 'express';
import {
    createTaskController,
    getAllTasksController,
    getTaskByIdController,
    updateTaskController,
    updateTaskStatusController,
    assignTaskToUserController,
    deleteTaskController
} from '../controllers/taskController.js';
import { validate } from '../middleware/validate.js';
import { verifyUserToken } from '../middleware/verifyUserToken.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

router.use(verifyUserToken);

/**
 * @swagger
 * tags:
 *   name: Tasks
 *   description: Task management endpoints
 */

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     security:
 *       - BearerAuth: []
 *     summary: Create a new task
 *     tags: [Tasks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               assigned_user_id:
 *                 type: integer
 *                 nullable: true
 *               deadline:
 *                 type: string
 *                 format: date-time
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Task created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 */
router.post(
    '/',
    authorize("ADMIN"),
    validate(['title', 'description']),
    createTaskController
);

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     security:
 *       - BearerAuth: []
 *     summary: Get all tasks
 *     tags: [Tasks]
 *     responses:
 *       200:
 *         description: List of tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Task'
 */
router.get('/', getAllTasksController);

/**
 * @swagger
 * /api/tasks/{id}:
 *   get:
 *     security:
 *       - BearerAuth: []
 *     summary: Get task by ID
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *     responses:
 *       200:
 *         description: Task retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 */
router.get('/:id', getTaskByIdController);

/**
 * @swagger
 * /api/tasks/{id}:
 *   patch:
 *     security:
 *       - BearerAuth: []
 *     summary: Update task details
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               newComment:
 *                 type: string
 *               version:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Task updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 */
router.patch('/:id', updateTaskController);

/**
 * @swagger
 * /api/tasks/{id}/status:
 *   put:
 *     security:
 *       - BearerAuth: []
 *     summary: Update task status
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [OPEN, IN_PROGRESS, DONE]
 *               version:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 */
router.put('/:id/status', validate(['status', 'version']), updateTaskStatusController);

/**
 * @swagger
 * /api/tasks/{id}/assign:
 *   put:
 *     security:
 *       - BearerAuth: []
 *     summary: Assign task to user
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user_id:
 *                 type: integer
 *                 nullable: true
 *               version:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Task assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 */
router.put('/:id/assign', validate(['user_id', 'version']), assignTaskToUserController);

/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     security:
 *       - BearerAuth: []
 *     summary: Delete task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Task deleted successfully
 */
router.delete('/:id', authorize("ADMIN"), deleteTaskController);

export default router;
