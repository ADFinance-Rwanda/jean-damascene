export const sendSuccess = (res, data, message = 'Success', status = 200) => {
    return res.status(status).json({
        success: true,
        message,
        data
    });
};

export const sendError = (res, error, status = 500) => {
    return res.status(status).json({
        success: false,
        message: error.message || 'Internal Server Error',
        errors: error.errors || null
    });
};

export class AppError extends Error {
    constructor(message, status = 500, errors = null) {
        super(message);
        this.status = status;
        this.errors = errors;
    }
}
