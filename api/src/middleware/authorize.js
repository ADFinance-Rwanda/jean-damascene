import { sendError } from "../utils/response.js";

export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return sendError(res, "Forbidden", 403);
        }
        next();
    };
};
