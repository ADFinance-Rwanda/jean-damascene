import { Server } from "socket.io";
import { decodeToken } from "../utils/token.js";
import pool from "../db/pool.js";

let io; // <- store Socket.IO instance globally

export const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: "*", // Replace with your Angular URL: http://localhost:4200
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

    io.on("connection", (socket) => {
        console.log(`User connected: ${socket.user?.id} (${socket.user?.name})`);

        // Join personal room for notifications
        if (socket.user) {
            socket.join(`user_${socket.user.id}`);
        }

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
