import express from 'express';
import {
    createUserController,
    getUsersController,
    getUserByIdController,
    updateUserController,
    deleteUserController,
    loginController,
    getMeController
} from '../controllers/userController.js';
import { validate } from '../middleware/validate.js';
import { verifyUserToken } from '../middleware/verifyUserToken.js';
import { authorize } from '../middleware/authorize.js';

const router = express.Router();

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post(
    "/login",
    validate(["email", "password"]),
    loginController
);


/**
 * @swagger
 * /api/users:
 *   post:
 *     security:
 *       - BearerAuth: []
 *     summary: Create a user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             required: [name, email]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created
 */
router.post('/',
    // authorize("ADMIN"),
    validate(['name', 'email', 'role']),
    createUserController);

router.use(verifyUserToken);


/**
 * @swagger
 * /api/users:
 *   get:
 *     security:
 *       - BearerAuth: []
 *     summary: Get all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of users
 */
router.get('/',
    // authorize("ADMIN"),
    getUsersController);

/**
* @swagger
* /api/users/me:
*   get:
*     security:
*       - BearerAuth: []
*     summary: Get current user from token
*     tags: [Users]
*     responses:
*       200:
*         description: Current user details
*       401:
*         description: Unauthorized or invalid token
*/
router.get('/me', getMeController);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     security:
 *       - BearerAuth: []
 *     summary: Get user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User details
 */
router.get('/:id',
    getUserByIdController);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     security:
 *       - BearerAuth: []
 *     summary: Update user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             required: [name, email]
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated
 */
router.put('/:id',
    // authorize("ADMIN"),
    validate(['name', 'email']),
    updateUserController);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     security:
 *       - BearerAuth: []
 *     summary: Delete user
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: User deleted
 */
router.delete('/:id',
    authorize("ADMIN"),
    deleteUserController);


export default router;
