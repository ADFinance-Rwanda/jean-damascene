import pool from '../db/pool.js';
import { AppError } from '../utils/response.js';


export const createUser = async (name, email) => {
    // First check if email already exists
    const { rows: existingUsers } = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
    );

    if (existingUsers.length > 0) {
        throw new AppError('Email already exists', 409); // 409 Conflict
    }

    // If email doesn't exist, create the user
    const { rows } = await pool.query(
        'INSERT INTO users(name, email) VALUES($1, $2) RETURNING *',
        [name, email]
    );
    return rows[0];
};

export const getUsers = async () => {
    const { rows } = await pool.query(`
        SELECT 
            u.id,
            u.name,
            u.email,
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

export const updateUser = async (id, { name, email }) => {
    const { rows } = await pool.query(
        'UPDATE users SET name=$1, email=$2 WHERE id=$3 RETURNING *',
        [name, email, id]
    );
    if (!rows.length) throw new AppError('User not found', 404);
    return rows[0];
};

export const deleteUser = async (id) => {
    const { rowCount } = await pool.query('DELETE FROM users WHERE id=$1', [id]);
    if (!rowCount) throw new AppError('User not found', 404);
    return true;
};
