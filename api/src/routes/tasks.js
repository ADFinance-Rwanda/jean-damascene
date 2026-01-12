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

const router = express.Router();

/* ================= Create a new task ===============*/
router.post(
    '/',
    validate(['title', 'description']),
    createTaskController
);

/* ================= Get all tasks ===============*/
router.get('/', getAllTasksController);

/* ================= Get single task by ID ===============*/
router.get(
    '/:id',
    getTaskByIdController
);

/* ================= Update task details (title, description) ===============*/
router.put(
    '/:id',
    validate(['title', 'description']),
    updateTaskController
);

/* ================= Update task status ===============*/
router.put(
    '/:id/status',
    validate(['status', 'version']),
    updateTaskStatusController
);

/* ================= Assign task to user ===============*/
router.put(
    '/:id/assign',
    validate(['user_id', 'version']),
    assignTaskToUserController
);

/* ================= Delete task ===============*/
router.delete(
    '/:id',
    deleteTaskController
);

export default router;
