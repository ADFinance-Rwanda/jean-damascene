import pool from '../db/pool.js';
import { AppError } from '../utils/response.js';

/**
 * Create a new task
 */
export const createTask = async (title, description, assigned_user_id = null) => {
    const { rows } = await pool.query(
        `
        INSERT INTO tasks(title, description, assigned_user_id)
        VALUES($1, $2, $3)
        RETURNING *
        `,
        [title, description, assigned_user_id]
    );
    return rows[0];
};


/**
 * Get all tasks with assigned user info and task metrics
 */
export const getAllTasks = async () => {
    const { rows } = await pool.query(`
        WITH task_data AS (
            SELECT 
                t.*, 
                u.name AS assigned_user_name, 
                u.email AS assigned_user_email
            FROM tasks t
            LEFT JOIN users u ON t.assigned_user_id = u.id
        )
        SELECT 
            -- Task data
            json_agg(
                json_build_object(
                    'id', td.id,
                    'title', td.title,
                    'description', td.description,
                    'status', td.status,
                    'version', td.version,
                    'assigned_user_id', td.assigned_user_id,
                    'assigned_user_name', td.assigned_user_name,
                    'assigned_user_email', td.assigned_user_email,
                    'created_at', td.created_at,
                    'updated_at', td.updated_at
                ) ORDER BY td.created_at DESC
            ) AS tasks,
            -- Metrics
            json_build_object(
                'total', COUNT(*),
                'open', COUNT(CASE WHEN status = 'OPEN' THEN 1 END),
                'in_progress', COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END),
                'done', COUNT(CASE WHEN status = 'DONE' THEN 1 END),
                'unassigned', COUNT(CASE WHEN assigned_user_id IS NULL THEN 1 END),
                'assigned', COUNT(CASE WHEN assigned_user_id IS NOT NULL THEN 1 END)
            ) AS metrics
        FROM task_data td
    `);

    return rows[0] || { tasks: [], metrics: {} };
};


/**
 * Get a single task by ID, including activity logs
 */

export const getTaskById = async (id) => {
    const { rows: taskRows } = await pool.query(
        `SELECT t.*, u.name AS assigned_user_name, u.email AS assigned_user_email
         FROM tasks t
         LEFT JOIN users u ON t.assigned_user_id = u.id
         WHERE t.id=$1`,
        [id]
    );
    if (!taskRows.length) throw new AppError('Task not found', 404);

    const task = taskRows[0];

    // Get activity logs
    const { rows: activityLogs } = await pool.query(
        `SELECT id, action_type, old_value, new_value, created_at
         FROM activity_logs 
         WHERE task_id=$1 
         ORDER BY created_at DESC`,
        [id]
    );

    // If there are any ASSIGN_USER actions, fetch user names
    const assignUserLogs = activityLogs.filter(log => log.action_type === 'ASSIGN_USER');

    if (assignUserLogs.length > 0) {
        // Extract all user IDs from old and new values
        const userIds = new Set();
        assignUserLogs.forEach(log => {
            if (log.old_value) userIds.add(parseInt(log.old_value));
            if (log.new_value) userIds.add(parseInt(log.new_value));
        });

        if (userIds.size > 0) {
            const { rows: users } = await pool.query(
                `SELECT id, name FROM users WHERE id = ANY($1)`,
                [Array.from(userIds)]
            );

            const userMap = new Map(users.map(user => [user.id.toString(), user.name]));

            // Update activity logs with user names
            task.activity_logs = activityLogs.map(log => {
                if (log.action_type === 'ASSIGN_USER') {
                    const transformedLog = { ...log };
                    transformedLog.old_value = log.old_value ?
                        (userMap.get(log.old_value) || `User #${log.old_value}`) : 'Unassigned';
                    transformedLog.new_value = log.new_value ?
                        (userMap.get(log.new_value) || `User #${log.new_value}`) : 'Unassigned';
                    return transformedLog;
                }
                return log;
            });
        } else {
            task.activity_logs = activityLogs;
        }
    } else {
        task.activity_logs = activityLogs;
    }

    // Format status values for STATUS_CHANGE actions
    task.activity_logs = task.activity_logs.map(log => {
        if (log.action_type === 'STATUS_CHANGE') {
            return {
                ...log,
                old_value: formatStatus(log.old_value),
                new_value: formatStatus(log.new_value)
            };
        }
        return log;
    });

    return task;
};

const formatStatus = (status) => {
    if (!status) return 'N/A';
    return status
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};

/**
 * Update task details (title, description) with activity logging
 */
export const updateTask = async (id, { title, description }, version = null) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get current task for logging & concurrency
        const { rows: currentRows } = await client.query(
            'SELECT title, description, version FROM tasks WHERE id=$1',
            [id]
        );
        if (!currentRows.length) throw new AppError('Task not found', 404);

        const current = currentRows[0];

        // Optimistic concurrency check (optional)
        if (version !== null && version !== current.version) {
            throw new AppError('Conflict detected', 409);
        }

        // Update task
        const { rows } = await client.query(
            `UPDATE tasks
             SET title=$1, description=$2, version=version+1, updated_at=NOW()
             WHERE id=$3 RETURNING *`,
            [title, description, id]
        );

        // Log the update
        await client.query(
            `INSERT INTO activity_logs(task_id, action_type, old_value, new_value)
             VALUES($1, $2, $3, $4)`,
            [id, 'UPDATE_TASK', JSON.stringify({ title: current.title, description: current.description }), JSON.stringify({ title, description })]
        );

        await client.query('COMMIT');
        return rows[0];
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

/**
 * Update task status
 */
export const updateTaskStatus = async (id, status, version) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { rows: currentRows } = await client.query(
            'SELECT status, assigned_user_id, version FROM tasks WHERE id=$1',
            [id]
        );

        if (!currentRows.length) {
            await client.query('ROLLBACK');
            return new AppError('Task not found', 404);
            // 👆 No client.release() here - finally block will do it
        }

        const current = currentRows[0];

        if (!current.assigned_user_id) {
            await client.query('ROLLBACK');
            return new AppError('Task must be assigned to someone before changing status', 400);
            // 👆 No client.release() here
        }

        if (current.status === 'OPEN' && status === 'DONE') {
            await client.query('ROLLBACK');
            return new AppError('Invalid status transition', 400);
            // 👆 No client.release() here
        }

        if (current.version !== version) {
            await client.query('ROLLBACK');
            return new AppError('Conflict detected', 409);
            // 👆 No client.release() here
        }

        const { rows } = await client.query(
            `UPDATE tasks
             SET status=$1, version=version+1, updated_at=NOW()
             WHERE id=$2 AND version=$3 RETURNING *`,
            [status, id, version]
        );

        await client.query(
            `INSERT INTO activity_logs(task_id, action_type, old_value, new_value)
             VALUES($1, 'STATUS_CHANGE', $2, $3)`,
            [id, current.status, status]
        );

        await client.query('COMMIT');
        return rows[0];

    } catch (e) {
        await client.query('ROLLBACK');
        return new AppError(e.message || 'Internal Server Error', 500);
        // 👆 No client.release() here - finally block will do it
    } finally {
        client.release();  // 👈 ONLY RELEASE HERE, ONCE
    }
};

/**
 * Assign task to user
 */
export const assignTaskToUser = async (taskId, userId, version) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get current assignment
        const { rows: currentRows } = await client.query(
            'SELECT assigned_user_id, version FROM tasks WHERE id=$1',
            [taskId]
        );
        if (!currentRows.length) throw new AppError('Task not found', 404);

        const current = currentRows[0];

        // Optimistic concurrency
        if (current.version !== version) throw new AppError('Conflict detected', 409);

        const { rows } = await client.query(
            `UPDATE tasks
             SET assigned_user_id=$1, version=version+1, updated_at=NOW()
             WHERE id=$2 AND version=$3 RETURNING *`,
            [userId, taskId, version]
        );

        // Log assignment
        await client.query(
            `INSERT INTO activity_logs(task_id, action_type, old_value, new_value)
             VALUES($1, 'ASSIGN_USER', $2, $3)`,
            [taskId, current.assigned_user_id, userId]
        );

        await client.query('COMMIT');
        return rows[0];
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

/**
 * Delete task
 */
export const deleteTask = async (id) => {
    const { rowCount } = await pool.query('DELETE FROM tasks WHERE id=$1', [id]);
    if (!rowCount) throw new AppError('Task not found', 404);
    return true;
};
