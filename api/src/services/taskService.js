import { getIO } from '../config/socket.js';
import pool from '../db/pool.js';
import { emitNotification } from '../sockets/notificationEmitter.js';
import { emitTaskEvent } from '../sockets/taskEmitter.js';
import { AppError } from '../utils/response.js';
import { createNotification } from './notificationService.js';


/* ================= Create Task =============== */
export const createTask = async (
    title,
    description,
    created_by,
    assigned_user_id = null,
    deadline,
    initialComment = null,
    currentUser = null
) => {
    const client = await pool.connect();
    let task;

    try {
        await client.query('BEGIN');

        // Prepare comments array
        const commentsArray = [];
        if (initialComment) {
            commentsArray.push({
                user: currentUser?.name || 'System',
                message:
                    typeof initialComment === 'string'
                        ? initialComment
                        : initialComment.message,
                createdAt: new Date().toISOString(),
            });
        }

        // Insert task
        const { rows } = await client.query(
            `INSERT INTO tasks(title, description, created_by, assigned_user_id, deadline, comment)
       VALUES($1, $2, $3, $4, $5, $6)
       RETURNING *`,
            [title, description, created_by, assigned_user_id, deadline, commentsArray]
        );

        task = rows[0];

        // Log activity
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

    // Re-fetch the task with formatted fields like getAllTasks
    const { rows: formattedRows } = await pool.query(
        `
    SELECT 
      t.id,
      t.title,
      t.description,
      t.status,
      t.version,
      t.deadline,
      t.created_at,
      t.updated_at,
      CASE 
        WHEN t.comment IS NULL THEN '[]'::json
        ELSE (
          SELECT json_agg(c::json)
          FROM unnest(t.comment) AS c
        )
      END AS comments,
      json_build_object('id', cu.id, 'name', cu.name, 'email', cu.email) AS "createdBy",
      CASE 
        WHEN au.id IS NULL THEN NULL
        ELSE json_build_object('id', au.id, 'name', au.name, 'email', au.email)
      END AS "assignedUser"
    FROM tasks t
    LEFT JOIN users au ON t.assigned_user_id = au.id
    LEFT JOIN users cu ON t.created_by = cu.id
    WHERE t.id=$1
    `,
        [task.id]
    );

    const formattedTask = formattedRows[0];

    // Send notification if task is assigned
    if (assigned_user_id) {
        const notif = await createNotification(
            assigned_user_id,
            'task_assigned',
            `You have been assigned to task "${formattedTask.title}"`,
            formattedTask.id
        );

        emitNotification({ userId: assigned_user_id, notification: notif });
    }

    // 6️⃣ Emit socket event to assigned user + broadcast to admins
    emitTaskEvent({
        type: 'task_created',
        taskId: formattedTask.id,
        actor: { id: created_by },
        payload: formattedTask,
        targetUsers: assigned_user_id ? [assigned_user_id] : [],
        broadcastAdmins: true,
    });

    return formattedTask;
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
        t.deadline,
        t.created_at,
        t.updated_at,

         -- convert TEXT[] of JSON strings to JSON array
        CASE 
          WHEN t.comment IS NULL THEN '[]'::json
          ELSE (
            SELECT json_agg(c::json)
            FROM unnest(t.comment) AS c
          )
        END AS comments,

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
            'deadline', td.deadline,
            'comments', td.comments,
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
export const getTaskById = async (id, user) => {
    const isAdmin = user.role === 'ADMIN';

    const { rows: taskRows } = await pool.query(
        `
        SELECT 
          t.*,
          u.name AS assigned_user_name,
          u.email AS assigned_user_email
        FROM tasks t
        LEFT JOIN users u ON t.assigned_user_id = u.id
        WHERE t.id=$1
          AND ($2::boolean = TRUE OR t.assigned_user_id = $3)
        `,
        [id, isAdmin, user.id]
    );

    if (!taskRows.length) throw new AppError('Task not found', 404);

    const task = taskRows[0];

    // Ensure comment field is always an array of objects
    task.comment = (task.comment || []).map(c => {
        try {
            return typeof c === 'string' ? JSON.parse(c) : c;
        } catch {
            return c;
        }
    });

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

            task.activity_logs = activityLogs.map(log => {
                if (log.action_type === 'ASSIGN_USER') {
                    return {
                        ...log,
                        old_value: log.old_value
                            ? (userMap.get(log.old_value) || `User #${log.old_value}`)
                            : 'Unassigned',
                        new_value: log.new_value
                            ? (userMap.get(log.new_value) || `User #${log.new_value}`)
                            : 'Unassigned'
                    };
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
 * Update task details (title, description, deadline, comments) with activity logging
 */
export const updateTask = async (
    id,
    { title, description, newComment, deadline },
    version,
    currentUser
) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Fetch current task
        const { rows: currentRows } = await client.query(
            'SELECT * FROM tasks WHERE id=$1',
            [id]
        );
        if (!currentRows.length) throw new AppError('Task not found', 404);

        const current = currentRows[0];

        // Version check
        if (version !== current.version) throw new AppError('Conflict detected', 409);

        // Update comments
        const updatedComments = [...(current.comment || [])];
        if (newComment) {
            updatedComments.push({
                user: currentUser?.name || 'System',
                message: newComment,
                createdAt: new Date().toISOString(),
            });
        }

        // Partial update
        const updatedTitle = title ?? current.title;
        const updatedDescription = description ?? current.description;
        const updatedDeadline = deadline ?? current.deadline;

        // Update task
        await client.query(
            `UPDATE tasks
       SET title=$1, description=$2, deadline=$3, comment=$4, version=version+1, updated_at=NOW()
       WHERE id=$5`,
            [updatedTitle, updatedDescription, updatedDeadline, updatedComments, id]
        );

        // Log activity
        await client.query(
            `INSERT INTO activity_logs(task_id, action_type, old_value, new_value)
       VALUES($1, 'UPDATE_TASK', $2, $3)`,
            [id, JSON.stringify(current), JSON.stringify({ ...current, title: updatedTitle, description: updatedDescription, comment: updatedComments, deadline: updatedDeadline })]
        );

        await client.query('COMMIT');

        // Re-fetch task in formatted structure like getAllTasks
        const { rows: formattedRows } = await pool.query(
            `
      SELECT 
        t.id,
        t.title,
        t.description,
        t.status,
        t.version,
        t.deadline,
        t.created_at,
        t.updated_at,
        CASE 
          WHEN t.comment IS NULL THEN '[]'::json
          ELSE (
            SELECT json_agg(c::json)
            FROM unnest(t.comment) AS c
          )
        END AS comments,
        json_build_object('id', cu.id, 'name', cu.name, 'email', cu.email) AS "createdBy",
        CASE 
          WHEN au.id IS NULL THEN NULL
          ELSE json_build_object('id', au.id, 'name', au.name, 'email', au.email)
        END AS "assignedUser"
      FROM tasks t
      LEFT JOIN users au ON t.assigned_user_id = au.id
      LEFT JOIN users cu ON t.created_by = cu.id
      WHERE t.id=$1
      `,
            [id]
        );

        const updatedTask = formattedRows[0];

        // Notify assigned user if exists
        if (updatedTask.assignedUser?.id) {
            const notif = await createNotification(
                updatedTask.assignedUser.id,
                'task_updated',
                `Task "${updatedTask.title}" updated by ${currentUser?.name}`,
                updatedTask.id
            );

            emitNotification({ userId: updatedTask.assignedUser.id, notification: notif });
        }

        // Emit task update event (assigned user + broadcast admins)
        emitTaskEvent({
            type: 'task_updated',
            taskId: updatedTask.id,
            actor: { id: currentUser?.id },
            payload: updatedTask,
            targetUsers: updatedTask.assignedUser ? [updatedTask.assignedUser.id] : [],
            broadcastAdmins: true,
        });

        return updatedTask;
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

        // Fetch current task
        const { rows: currentRows } = await client.query(
            `SELECT * FROM tasks WHERE id=$1`,
            [id]
        );

        if (!currentRows.length) throw new AppError('Task not found', 404);

        const current = currentRows[0];

        if (!current.assigned_user_id) {
            throw new AppError('Task must be assigned before changing status', 400);
        }

        if (current.status === 'OPEN' && status === 'DONE') {
            throw new AppError('Invalid status transition', 400);
        }

        // Version check
        if (current.version !== version) throw new AppError('Conflict detected', 409);

        // Update status
        await client.query(
            `UPDATE tasks
             SET status=$1, version=version+1, updated_at=NOW()
             WHERE id=$2`,
            [status, id]
        );

        // Activity log
        await client.query(
            `INSERT INTO activity_logs(task_id, action_type, old_value, new_value)
             VALUES($1, 'STATUS_CHANGE', $2, $3)`,
            [id, current.status, status]
        );

        await client.query('COMMIT');

        // Re-fetch formatted task (same as updateTask)
        const { rows: formattedRows } = await pool.query(
            `
            SELECT 
              t.id,
              t.title,
              t.description,
              t.status,
              t.version,
              t.deadline,
              t.created_at,
              t.updated_at,
              CASE 
                WHEN t.comment IS NULL THEN '[]'::json
                ELSE (
                  SELECT json_agg(c::json)
                  FROM unnest(t.comment) AS c
                )
              END AS comments,
              json_build_object('id', cu.id, 'name', cu.name, 'email', cu.email) AS "createdBy",
              CASE 
                WHEN au.id IS NULL THEN NULL
                ELSE json_build_object('id', au.id, 'name', au.name, 'email', au.email)
              END AS "assignedUser"
            FROM tasks t
            LEFT JOIN users au ON t.assigned_user_id = au.id
            LEFT JOIN users cu ON t.created_by = cu.id
            WHERE t.id=$1
            `,
            [id]
        );

        const updatedTask = formattedRows[0];

        // Notify assigned user
        if (updatedTask.assignedUser?.id) {
            const notif = await createNotification(
                updatedTask.assignedUser.id,
                'task_status_updated',
                `Task "${updatedTask.title}" status changed to "${status}" by ${currentUser?.name}`,
                updatedTask.id
            );

            emitNotification({
                userId: updatedTask.assignedUser.id,
                notification: notif
            });
        }

        // Emit socket event (task room + admins + assigned)
        emitTaskEvent({
            type: 'task_status_updated',
            taskId: updatedTask.id,
            actor: { id: currentUser?.id },
            payload: updatedTask,
            targetUsers: updatedTask.assignedUser ? [updatedTask.assignedUser.id] : [],
            broadcastAdmins: true
        });

        return updatedTask;

    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};


/**
 * Assign task to user
 */

export const assignTaskToUser = async (taskId, userId, version, currentUser) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const { rows: currentRows } = await client.query(
            'SELECT * FROM tasks WHERE id=$1',
            [taskId]
        );
        if (!currentRows.length) throw new AppError('Task not found', 404);

        const current = currentRows[0];
        if (current.version !== version) throw new AppError('Conflict detected', 409);

        // Update assignment
        await client.query(
            `UPDATE tasks
             SET assigned_user_id=$1, version=version+1, updated_at=NOW()
             WHERE id=$2`,
            [userId, taskId]
        );

        // Re-fetch WITH joined user (important!)
        const { rows } = await client.query(
            `
            SELECT 
              t.*,
              json_build_object(
                'id', u.id,
                'name', u.name,
                'email', u.email
              ) AS "assignedUser"
            FROM tasks t
            LEFT JOIN users u ON t.assigned_user_id = u.id
            WHERE t.id=$1
            `,
            [taskId]
        );

        const updatedTask = rows[0];

        await client.query(
            `INSERT INTO activity_logs(task_id, action_type, old_value, new_value)
             VALUES($1, 'ASSIGN_USER', $2, $3)`,
            [taskId, current.assigned_user_id, userId]
        );

        await client.query('COMMIT');

        // 🔔 Notification
        if (userId) {
            const notif = await createNotification(
                userId,
                'task_assigned',
                `You were assigned to "${updatedTask.title}" by ${currentUser.name}`,
                taskId
            );

            emitNotification({ userId, notification: notif });
        }

        // 📡 Socket event (NOW includes assignedUser object)
        emitTaskEvent({
            type: 'task_assigned',
            taskId,
            actor: { id: currentUser.id },
            payload: updatedTask,
            targetUsers: [
                ...(current.assigned_user_id ? [current.assigned_user_id] : []),
                ...(userId ? [userId] : [])
            ],
            broadcastAdmins: true
        });

        return updatedTask;
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
                'task_deleted',
                `Task "${task.title}" has been deleted by ${currentUser?.name || 'System'}`,
                id
            );
            try {
                emitTaskEvent({
                    type: 'task_deleted',
                    taskId: task.id,
                    actor: { id: currentUser?.id },
                    payload: task,
                    targetUsers: task.assigned_user_id ? [task.assigned_user_id] : [],
                    broadcastAdmins: true
                });

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

