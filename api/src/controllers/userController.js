import { toCreateUserDto, toUpdateUserDto } from '../dtos/user.dto.js';
import { createUser, getUsers, getUserById, updateUser, deleteUser } from '../services/userService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';

/* ================= Create a new user ===============*/
export const createUserController = asyncHandler(async (req, res) => {
    const { name, email } = toCreateUserDto(req.body);
    const user = await createUser(name, email);
    return sendSuccess(res, user, 'User created successfully', 201);
});

/* ================= Get all users ===============*/
export const getUsersController = asyncHandler(async (_req, res) => {
    const users = await getUsers();
    return sendSuccess(res, users, 'Users retrieved successfully');
});

/* ================= Get single user by ID ===============*/
export const getUserByIdController = asyncHandler(async (req, res) => {
    const user = await getUserById(req.params.id);
    return sendSuccess(res, user, 'User retrieved successfully');
});

/* ================= Update user by ID ===============*/
export const updateUserController = asyncHandler(async (req, res) => {
    const { name, email } = toUpdateUserDto(req.body);
    const user = await updateUser(req.params.id, { name, email });
    return sendSuccess(res, user, 'User updated successfully');
});

/* ================= Delete user by ID ===============*/
export const deleteUserController = asyncHandler(async (req, res) => {
    await deleteUser(req.params.id);
    return sendSuccess(res, null, 'User deleted successfully', 200);
});
