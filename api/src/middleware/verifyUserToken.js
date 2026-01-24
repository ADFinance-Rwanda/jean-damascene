import { decodeToken } from "../utils/token.js";
import pool from "../db/pool.js";
import { sendError } from "../utils/response.js";

export const verifyUserToken = async (req, res, next) => {
    try {
        const token =
            req.headers.authorization?.split(" ")[1] ||
            req.cookies?.authToken ||
            req.query?.authToken;

        if (!token) {
            return sendError(res, "Unauthorized. Please login.", 401);
        }

        const session = decodeToken(token);

        const { rows } = await pool.query(
            `SELECT id, name, email, role FROM users WHERE id=$1`,
            [session.userId]
        );

        if (!rows.length) {
            return sendError(res, "Invalid token: user not found", 401);
        }

        req.user = rows[0];
        req.session = session;
        req.token = token;

        return next();
    } catch (error) {
        if (error.message === "jwt expired") {
            return sendError(res, "Session expired. Please login again.", 401);
        }

        return sendError(res, "Failed to verify token.", 401);
    }
};
