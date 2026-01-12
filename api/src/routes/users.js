import express from 'express';
import {
    createUserController,
    getUsersController,
    getUserByIdController,
    updateUserController,
    deleteUserController
} from '../controllers/userController.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

/* ================= Create ['title', 'description']===============*/
router.post(
    '/',
    validate(['name', 'email']),
    createUserController
);

/* ================= Read all===============*/
router.get('/', getUsersController);

/* ================= Read one ===============*/
router.get('/:id', getUserByIdController);

/* ================= Update===============*/
router.put(
    '/:id',
    validate(['name', 'email']),
    updateUserController
);

/* ================= Delete===============*/
router.delete('/:id', deleteUserController);

export default router;
