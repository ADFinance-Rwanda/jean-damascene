import {
    createTask,
    updateTaskStatus,
    assignTaskToUser,
    getAllTasks,
    getTaskById,
    updateTask,
    deleteTask
} from '../services/taskService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError, sendError, sendSuccess } from '../utils/response.js';
import {
    toCreateTaskDto,
    toUpdateTaskDto,
    toAssignTaskDto,
    toUpdateTaskByIdDto
} from '../dtos/task.dto.js';

/* ================= Create a new task ===============*/
export const createTaskController = asyncHandler(async (req, res) => {
    const { title, description, assigned_user_id } = toCreateTaskDto(req.body);

    const task = await createTask(title, description, assigned_user_id);
    return sendSuccess(res, task, 'Task created successfully', 201);
});

/* ================= Get all tasks ===============*/
export const getAllTasksController = asyncHandler(async (_req, res) => {
    const tasks = await getAllTasks();
    return sendSuccess(res, tasks, 'Tasks retrieved successfully');
});

/* ================= Get single task by ID ===============*/
export const getTaskByIdController = asyncHandler(async (req, res) => {
    const task = await getTaskById(req.params.id);
    return sendSuccess(res, task, 'Task retrieved successfully');
});

/* ================= Update task details (title, description)===============*/
export const updateTaskController = asyncHandler(async (req, res) => {
    const { title, description } = toUpdateTaskByIdDto(req.body);
    const task = await updateTask(req.params.id, { title, description });
    return sendSuccess(res, task, 'Task updated successfully');
});

/* ================= Update task status ===============*/
export const updateTaskStatusController = asyncHandler(async (req, res) => {
    const { status, version } = toUpdateTaskDto(req.body);
    const task = await updateTaskStatus(req.params.id, status, version);
    if (task instanceof AppError) {
        return sendError(res, task, task.status);
    }
    return sendSuccess(res, task, 'Task status updated successfully');
});


/* ================= Assign task to user ===============*/
export const assignTaskToUserController = asyncHandler(async (req, res) => {
    const { user_id, version } = toAssignTaskDto(req.body);
    const task = await assignTaskToUser(req.params.id, user_id, version);
    return sendSuccess(res, task, 'Task assigned to user successfully');
});

/* ================= Delete task ===============*/
export const deleteTaskController = asyncHandler(async (req, res) => {
    await deleteTask(req.params.id);
    return sendSuccess(res, null, 'Task deleted successfully');
});
