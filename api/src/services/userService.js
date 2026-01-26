import pool from '../db/pool.js';
import { AppError } from '../utils/response.js';
import bcrypt from "bcrypt";
import { generateToken } from '../utils/token.js';
import { verifyUserToken } from '../middleware/verifyUserToken.js';


// export const createUser = async (name, email) => {
//     // First check if email already exists
//     const { rows: existingUsers } = await pool.query(
//         'SELECT id FROM users WHERE email = $1',
//         [email]
//     );

//     if (existingUsers.length > 0) {
//         throw new AppError('Email already exists', 409); // 409 Conflict
//     }

//     // If email doesn't exist, create the user
//     const { rows } = await pool.query(
//         'INSERT INTO users(name, email) VALUES($1, $2) RETURNING *',
//         [name, email]
//     );
//     return rows[0];
// };

export const createUser = async (name, email, password, role = "USER") => {
    // Check if email exists
    const { rows: existingUsers } = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [email]
    );

    if (existingUsers.length) {
        throw new AppError("Email already exists", 409);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const { rows } = await pool.query(
        `INSERT INTO users(name, email, password, role)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, email, role, created_at`,
        [name, email, hashedPassword, role]
    );

    return rows[0];
};


export const getUsers = async () => {
    const { rows } = await pool.query(`
        SELECT 
            u.id,
            u.name,
            u.email,
            u.role,
            u.created_at,
            COUNT(t.id) AS total_tasks,
            COUNT(t.id) FILTER (WHERE t.status='IN_PROGRESS') AS in_progress_tasks,
            COUNT(t.id) FILTER (WHERE t.status='DONE') AS completed_tasks
        FROM users u
        LEFT JOIN tasks t ON t.assigned_user_id = u.id
        GROUP BY u.id
        ORDER BY u.created_at DESC
    `);
    return rows.map(r => ({
        ...r,
        total_tasks: Number(r.total_tasks),
        in_progress_tasks: Number(r.in_progress_tasks),
        completed_tasks: Number(r.completed_tasks)
    }));
};

export const getUserById = async (id) => {
    const { rows } = await pool.query('SELECT * FROM users WHERE id=$1', [id]);
    if (!rows.length) throw new AppError('User not found', 404);
    return rows[0];
};

export const updateUser = async (id, { name, email, role }) => {
    const { rows } = await pool.query(
        'UPDATE users SET name=$1, email=$2, role=$3 WHERE id=$4 RETURNING *',
        [name, email, role, id]
    );
    if (!rows.length) throw new AppError('User not found', 404);
    return rows[0];
};

export const deleteUser = async (id) => {
    const { rowCount } = await pool.query('DELETE FROM users WHERE id=$1', [id]);
    if (!rowCount) throw new AppError('User not found', 404);
    return true;
};

export const loginUser = async (email, password) => {
    // 1. Find user by email
    const { rows } = await pool.query(
        `SELECT id, name, email, password, role 
         FROM users 
         WHERE email = $1`,
        [email]
    );

    if (!rows.length) {
        throw new AppError("Invalid credentials", 401);
    }

    const user = rows[0];

    // 2. Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        throw new AppError("Invalid credentials", 401);
    }

    // 3. Create session payload (what goes into JWT)
    const session = {
        userId: user.id,
        role: user.role,
        email: user.email
    };

    // 4. Generate encrypted JWT
    const token = await generateToken(session);

    // 5. Return safe user data
    return {
        token
    };
};
