import { getIO } from '../config/socket.js';
import pool from '../db/pool.js';
import { AppError } from '../utils/response.js';
import { createNotification } from './notificationService.js';


/* ================= Create Task =============== */
export const createTask = async (title, description, created_by, assigned_user_id = null) => {
    const client = await pool.connect();
    let task;

    try {
        await client.query('BEGIN');

        const { rows } = await client.query(
            `INSERT INTO tasks(title, description, created_by, assigned_user_id)
             VALUES($1, $2, $3, $4)
             RETURNING *`,
            [title, description, created_by, assigned_user_id]
        );

        task = rows[0];

        await client.query(
            `INSERT INTO activity_logs(task_id, action_type, old_value, new_value)
             VALUES($1, 'CREATE_TASK', NULL, $2)`,
            [task.id, JSON.stringify({ title: task.title })]
        );

        await client.query('COMMIT');
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }


    if (assigned_user_id) {
        const notif = await createNotification(
            assigned_user_id,
            'TASK_ASSIGNED',
            `You have been assigned to task "${task.title}"`,
            task.id
        );

        try {
            const io = getIO();
            io.to(`user_${assigned_user_id}`).emit('new_notification', notif);
        } catch (err) {
            console.error('Socket.IO emit failed', err);
        }
    }

    return task;
};



/**
 * Get tasks with assigned user info, creator info, and metrics
 * - ADMIN → all tasks
 * - NON-ADMIN → only assigned tasks
 */
export const getAllTasks = async (user) => {
    const isAdmin = user.role === 'ADMIN';

    const { rows } = await pool.query(
        `
    WITH task_data AS (
      SELECT 
        t.id,
        t.title,
        t.description,
        t.status,
        t.version,
        t.created_at,
        t.updated_at,

        -- Assigned user
        au.id AS assigned_user_id,
        au.name AS assigned_user_name,
        au.email AS assigned_user_email,

        -- Creator
        cu.id AS created_by_id,
        cu.name AS created_by_name,
        cu.email AS created_by_email

      FROM tasks t
      LEFT JOIN users au ON t.assigned_user_id = au.id
      LEFT JOIN users cu ON t.created_by = cu.id

      -- 🔐 Role-based filtering
      WHERE ($1::boolean = TRUE OR t.assigned_user_id = $2)
    )
    SELECT 
      COALESCE(
        json_agg(
          json_build_object(
            'id', td.id,
            'title', td.title,
            'description', td.description,
            'status', td.status,
            'version', td.version,

            'assignedUser', CASE 
              WHEN td.assigned_user_id IS NULL THEN NULL
              ELSE json_build_object(
                'id', td.assigned_user_id,
                'name', td.assigned_user_name,
                'email', td.assigned_user_email
              )
            END,

            'createdBy', CASE
              WHEN td.created_by_id IS NULL THEN NULL
              ELSE json_build_object(
                'id', td.created_by_id,
                'name', td.created_by_name,
                'email', td.created_by_email
              )
            END,

            'created_at', td.created_at,
            'updated_at', td.updated_at
          )
          ORDER BY td.created_at DESC
        ),
        '[]'::json
      ) AS tasks,

      json_build_object(
        'total', COUNT(*),
        'open', COUNT(CASE WHEN td.status = 'OPEN' THEN 1 END),
        'in_progress', COUNT(CASE WHEN td.status = 'IN_PROGRESS' THEN 1 END),
        'done', COUNT(CASE WHEN td.status = 'DONE' THEN 1 END),
        'unassigned', COUNT(CASE WHEN td.assigned_user_id IS NULL THEN 1 END),
        'assigned', COUNT(CASE WHEN td.assigned_user_id IS NOT NULL THEN 1 END)
      ) AS metrics

    FROM task_data td
    `,
        [isAdmin, user.id]
    );

    return rows[0] || { tasks: [], metrics: {} };
};


/**
 * Get a single task by ID, including activity logs
 */

// export const getTaskById = async (id) => {
//     const { rows: taskRows } = await pool.query(
//         `SELECT t.*, u.name AS assigned_user_name, u.email AS assigned_user_email
//          FROM tasks t
//          LEFT JOIN users u ON t.assigned_user_id = u.id
//          WHERE t.id=$1`,
//         [id]
//     );
//     if (!taskRows.length) throw new AppError('Task not found', 404);

//     const task = taskRows[0];

//     // Get activity logs
//     const { rows: activityLogs } = await pool.query(
//         `SELECT id, action_type, old_value, new_value, created_at
//          FROM activity_logs 
//          WHERE task_id=$1 
//          ORDER BY created_at DESC`,
//         [id]
//     );

//     // If there are any ASSIGN_USER actions, fetch user names
//     const assignUserLogs = activityLogs.filter(log => log.action_type === 'ASSIGN_USER');

//     if (assignUserLogs.length > 0) {
//         // Extract all user IDs from old and new values
//         const userIds = new Set();
//         assignUserLogs.forEach(log => {
//             if (log.old_value) userIds.add(parseInt(log.old_value));
//             if (log.new_value) userIds.add(parseInt(log.new_value));
//         });

//         if (userIds.size > 0) {
//             const { rows: users } = await pool.query(
//                 `SELECT id, name FROM users WHERE id = ANY($1)`,
//                 [Array.from(userIds)]
//             );

//             const userMap = new Map(users.map(user => [user.id.toString(), user.name]));

//             // Update activity logs with user names
//             task.activity_logs = activityLogs.map(log => {
//                 if (log.action_type === 'ASSIGN_USER') {
//                     const transformedLog = { ...log };
//                     transformedLog.old_value = log.old_value ?
//                         (userMap.get(log.old_value) || `User #${log.old_value}`) : 'Unassigned';
//                     transformedLog.new_value = log.new_value ?
//                         (userMap.get(log.new_value) || `User #${log.new_value}`) : 'Unassigned';
//                     return transformedLog;
//                 }
//                 return log;
//             });
//         } else {
//             task.activity_logs = activityLogs;
//         }
//     } else {
//         task.activity_logs = activityLogs;
//     }

//     // Format status values for STATUS_CHANGE actions
//     task.activity_logs = task.activity_logs.map(log => {
//         if (log.action_type === 'STATUS_CHANGE') {
//             return {
//                 ...log,
//                 old_value: formatStatus(log.old_value),
//                 new_value: formatStatus(log.new_value)
//             };
//         }
//         return log;
//     });

//     return task;
// };

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

    // Ensure comment field is always an array
    task.comment = task.comment || [];

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
// export const updateTask = async (id, { title, description }, version = null, currentUser = null) => {
//     const client = await pool.connect();
//     try {
//         await client.query('BEGIN');

//         // Get current task for logging & concurrency
//         const { rows: currentRows } = await client.query(
//             'SELECT title, description, version, assigned_user_id FROM tasks WHERE id=$1',
//             [id]
//         );
//         if (!currentRows.length) throw new AppError('Task not found', 404);

//         const current = currentRows[0];

//         // Optimistic concurrency check
//         if (version !== null && version !== current.version) {
//             throw new AppError('Conflict detected', 409);
//         }

//         // Update task
//         const { rows } = await client.query(
//             `UPDATE tasks
//              SET title=$1, description=$2, version=version+1, updated_at=NOW()
//              WHERE id=$3 RETURNING *`,
//             [title, description, id]
//         );

//         // Log the update
//         await client.query(
//             `INSERT INTO activity_logs(task_id, action_type, old_value, new_value)
//              VALUES($1, $2, $3, $4)`,
//             [
//                 id,
//                 'UPDATE_TASK',
//                 JSON.stringify({ title: current.title, description: current.description }),
//                 JSON.stringify({ title, description })
//             ]
//         );

//         // Create notification for assigned user
//         if (current.assigned_user_id) {
//             const notif = await createNotification(
//                 current.assigned_user_id,
//                 'TASK_UPDATED',
//                 `Task "${title}" was updated by ${currentUser?.name || 'System'}`,
//                 id
//             );

//             // Emit via Socket.IO
//             try {
//                 const io = getIO();
//                 io.to(`user_${current.assigned_user_id}`).emit('new_notification', notif);
//             } catch (socketError) {
//                 console.error('Socket.IO emit failed', socketError);
//             }
//         }

//         await client.query('COMMIT');
//         return rows[0];
//     } catch (e) {
//         await client.query('ROLLBACK');
//         throw e;
//     } finally {
//         client.release();
//     }
// };

export const updateTask = async (id, { title, description, newComment }, version = null, currentUser = null) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get current task for logging & concurrency
        const { rows: currentRows } = await client.query(
            'SELECT title, description, comment, version, assigned_user_id FROM tasks WHERE id=$1',
            [id]
        );
        if (!currentRows.length) throw new AppError('Task not found', 404);

        const current = currentRows[0];

        // Optimistic concurrency check
        if (version !== null && version !== current.version) {
            throw new AppError('Conflict detected', 409);
        }

        // Build new comment array
        let updatedComments = current.comment || [];
        if (newComment) {
            const commentEntry = {
                user: currentUser?.name || 'System',
                message: newComment,
                createdAt: new Date().toISOString()
            };
            updatedComments.push(commentEntry);
        }

        // Update task
        const { rows } = await client.query(
            `UPDATE tasks
             SET title=$1, description=$2, comment=$3, version=version+1, updated_at=NOW()
             WHERE id=$4 RETURNING *`,
            [title, description, updatedComments, id]
        );

        // Log the update
        await client.query(
            `INSERT INTO activity_logs(task_id, action_type, old_value, new_value)
             VALUES($1, $2, $3, $4)`,
            [
                id,
                'UPDATE_TASK',
                JSON.stringify({ title: current.title, description: current.description, comment: current.comment }),
                JSON.stringify({ title, description, comment: updatedComments })
            ]
        );

        // Create notification for assigned user
        if (current.assigned_user_id) {
            const notif = await createNotification(
                current.assigned_user_id,
                'TASK_UPDATED',
                `Task "${title}" was updated by ${currentUser?.name || 'System'}`,
                id
            );

            // Emit via Socket.IO
            try {
                const io = getIO();
                io.to(`user_${current.assigned_user_id}`).emit('new_notification', notif);
            } catch (socketError) {
                console.error('Socket.IO emit failed', socketError);
            }
        }

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
export const updateTaskStatus = async (id, status, version, currentUser = null) => {
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

        if (current.assigned_user_id) {
            const notif = await createNotification(
                current.assigned_user_id,
                'TASK_STATUS_UPDATED',
                `Task "${current.title}" status changed from "${current.status}" to "${status}" by ${currentUser?.name || 'System'}`,
                id
            );

            try {
                const io = getIO();
                io.to(`user_${current.assigned_user_id}`).emit('new_notification', notif);
            } catch (socketError) {
                console.error('Socket.IO emit failed', socketError);
            }
        }

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
export const assignTaskToUser = async (taskId, userId, version, currentUser = null) => {
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

        // Create notification in DB
        if (userId) {
            const notif = await createNotification(
                userId,
                'TASK_ASSIGNED',
                `You have been assigned to task "${rows[0].title}" by ${currentUser.name}`,
                taskId
            );

            // Emit real-time notification via Socket.IO
            try {
                const io = getIO();
                io.to(`user_${userId}`).emit('new_notification', notif);
            } catch (socketError) {
                console.error('Socket.IO emit failed', socketError);
            }
        }

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

export const deleteTask = async (id, currentUser = null) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { rows } = await client.query(
            'SELECT id, title, assigned_user_id FROM tasks WHERE id=$1',
            [id]
        );
        if (!rows.length) throw new AppError('Task not found', 404);
        const task = rows[0];

        // Log deletion BEFORE deleting the task
        await client.query(
            `INSERT INTO activity_logs(task_id, action_type, old_value, new_value)
             VALUES($1, 'DELETE_TASK', $2, NULL)`,
            [id, JSON.stringify({ title: task.title })]
        );

        // Notify assigned user BEFORE deleting the task
        if (task.assigned_user_id) {
            const notif = await createNotification(
                task.assigned_user_id,
                'TASK_DELETED',
                `Task "${task.title}" has been deleted by ${currentUser?.name || 'System'}`,
                id
            );
            try {
                const io = getIO();
                io.to(`user_${task.assigned_user_id}`).emit('new_notification', notif);
            } catch (err) {
                console.error('Socket.IO emit failed', err);
            }
        }

        // Delete task
        await client.query('DELETE FROM tasks WHERE id=$1', [id]);

        await client.query('COMMIT');
        return true;
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

