import { toCreateUserDto, toUpdateUserDto } from '../dtos/user.dto.js';
import { createUser, getUsers, getUserById, updateUser, deleteUser, loginUser } from '../services/userService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';

/* ================= Create a new user ===============*/
export const createUserController = asyncHandler(async (req, res) => {
    const { name, email, password, role } = toCreateUserDto(req.body);
    const user = await createUser(name, email, password, role);
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


/* ================= Login ===============*/

export const loginController = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new AppError("Invalid credentials", 400);
    }

    const result = await loginUser(email, password);

    return sendSuccess(res, result, "Login successful");
});

export const getMeController = asyncHandler(async (req, res) => {
    // req.user is already populated by verifyUserToken
    return sendSuccess(res, req.user, 'User retrieved successfully');
});
