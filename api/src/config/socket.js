import { Server } from "socket.io";
import { decodeToken } from "../utils/token.js";
import pool from "../db/pool.js";

let io; // global Socket.IO instance

export const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: "*", // change to http://localhost:4200
            methods: ["GET", "POST"],
        },
    });

    // 🔐 Socket middleware for JWT auth
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token;

            if (!token) {
                return next(new Error("Unauthorized"));
            }

            const session = decodeToken(token);

            const { rows } = await pool.query(
                `SELECT id, name, email, role FROM users WHERE id=$1`,
                [session.userId]
            );

            if (!rows.length) {
                return next(new Error("Invalid token: user not found"));
            }

            socket.user = rows[0];
            socket.session = session;

            next();
        } catch (error) {
            if (error.message === "jwt expired") {
                return next(new Error("Session expired"));
            }
            return next(new Error("Failed to verify token"));
        }
    });

    io.on("connection", async (socket) => {
        console.log(`User connected: ${socket.user?.id} (${socket.user?.name})`);

        // 👤 Personal room
        socket.join(`user_${socket.user.id}`);

        // 🔐 Admin room
        if (socket.user.role === 'ADMIN') {
            socket.join('admins');
            console.log(`Admin joined admins room: ${socket.user.id}`);
        }

        try {
            // 🔥 Initial notifications
            const { rows } = await pool.query(
                `SELECT *
                 FROM notifications
                 WHERE user_id=$1
                 ORDER BY created_at DESC`,
                [socket.user.id]
            );

            socket.emit("notification:init", rows);

            // 🔢 Initial unread count
            const unread = await pool.query(
                `SELECT COUNT(*) 
                 FROM notifications 
                 WHERE user_id=$1 AND is_read=false`,
                [socket.user.id]
            );

            socket.emit("notification:count", Number(unread.rows[0].count));
        } catch (err) {
            console.error("Notification init failed", err);
        }

        // ✅ Mark notifications as read

        socket.on('notification:read', async (ids) => {
            try {
                if (!Array.isArray(ids)) ids = [ids];

                const { rows } = await pool.query(
                    `UPDATE notifications
       SET is_read = TRUE
       WHERE id = ANY($1::int[])
         AND user_id = $2
       RETURNING *`,
                    [ids, socket.user.id]
                );

                if (rows.length) {
                    // emit updated unread count
                    const { rows: countRows } = await pool.query(
                        `SELECT COUNT(*) FROM notifications WHERE user_id=$1 AND is_read=false`,
                        [socket.user.id]
                    );
                    io.to(`user_${socket.user.id}`).emit('notification:count', Number(countRows[0].count));
                }
            } catch (err) {
                console.error('Failed to mark notifications read:', err);
            }
        });


        socket.on("disconnect", () => {
            console.log(`User disconnected: ${socket.user?.id}`);
        });
    });

    return io;
};

// 🔌 Return the global instance anywhere in the app
export const getIO = () => {
    if (!io) throw new Error("Socket.io not initialized");
    return io;
};
