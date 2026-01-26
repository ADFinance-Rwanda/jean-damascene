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
    const { title, description, assigned_user_id, deadline, comment } = toCreateTaskDto(req.body);

    const created_by = req.user.id;

    const task = await createTask(
        title,
        description,
        created_by,
        assigned_user_id,
        deadline,
        comment,
        req.user
    );

    return sendSuccess(res, task, 'Task created successfully', 201);
});


/* ================= Get all tasks ===============*/
export const getAllTasksController = asyncHandler(async (req, res) => {
    const result = await getAllTasks(req.user);
    return sendSuccess(res, result, 'Tasks retrieved successfully');
});


/* ================= Get single task by ID ===============*/
export const getTaskByIdController = asyncHandler(async (req, res) => {
    const task = await getTaskById(req.params.id, req.user);
    return sendSuccess(res, task, 'Task retrieved successfully');
});

/* ================= Update task details (title, description)===============*/

export const updateTaskController = asyncHandler(async (req, res) => {
    const { title, description, newComment, deadline } = toUpdateTaskByIdDto(req.body);
    const task = await updateTask(
        req.params.id,
        { title, description, newComment, deadline },
        req.body.version,
        req.user
    );
    return sendSuccess(res, task, 'Task updated successfully');
});


/* ================= Update task status ===============*/
export const updateTaskStatusController = asyncHandler(async (req, res) => {
    const { status, version } = toUpdateTaskDto(req.body);
    const task = await updateTaskStatus(req.params.id, status, version, req.user);
    if (task instanceof AppError) {
        return sendError(res, task, task.status);
    }
    return sendSuccess(res, task, 'Task status updated successfully');
});


/* ================= Assign task to user ===============*/
export const assignTaskToUserController = asyncHandler(async (req, res) => {
    const { user_id, version } = toAssignTaskDto(req.body);
    const task = await assignTaskToUser(req.params.id, user_id, version, req.user);
    return sendSuccess(res, task, 'Task assigned to user successfully');
});

/* ================= Delete task ===============*/
export const deleteTaskController = asyncHandler(async (req, res) => {
    await deleteTask(req.params.id, req.user);
    return sendSuccess(res, null, 'Task deleted successfully');
});
