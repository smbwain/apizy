export class ApiError extends Error {
    public statusCode: number;
    constructor(statusCode: number, name: string, message?: string) {
        super(message);
        this.name = name;
        Object.setPrototypeOf(this, ApiError.prototype);
        this.statusCode = statusCode;
    }
}

export class BadReqError extends ApiError {
    constructor(message?: string) {
        super(400, 'Bad Request', message);
        Object.setPrototypeOf(this, UnauthenticatedError.prototype);
    }
}

export class UnauthenticatedError extends ApiError {
    constructor(message?: string) {
        super(401, 'Unauthenticated', message);
        Object.setPrototypeOf(this, UnauthenticatedError.prototype);
    }
}

export class ForbiddenError extends ApiError {
    constructor(message?: string) {
        super(403, 'Forbidden', message);
        Object.setPrototypeOf(this, UnauthenticatedError.prototype);
    }
}

export class NotFoundError extends ApiError {
    constructor(message?: string) {
        super(404, 'Not Found', message);
        Object.setPrototypeOf(this, UnauthenticatedError.prototype);
    }
}

export class ConflictError extends ApiError {
    constructor(message?: string) {
        super(409, 'Conflict', message);
        Object.setPrototypeOf(this, UnauthenticatedError.prototype);
    }
}

export class ServerError extends ApiError {
    constructor(message?: string) {
        super(500, 'Server error', message);
        Object.setPrototypeOf(this, UnauthenticatedError.prototype);
    }
}

// export function handleValidationError(err: any, res: Response) {
//     if (err instanceof ValidationError) {
//         res.status(400).json({
//             error: 'Input data error',
//             message: err.message,
//         });
//     }
//     handleError(err, res);
// }

