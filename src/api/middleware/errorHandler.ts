import { Request, Response, NextFunction } from 'express';
import { ValidationError } from 'joi';
import logger from '@/utils/logger';

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
    let status = err.status || 500;
    let code = err.code || 'internal_error';
    let message = err.message || 'Internal server error';
    let details = err.details;

    // Handle Joi validation errors
    if (err.isJoi || err instanceof ValidationError) {
        status = 400;
        code = 'validation_error';
        message = 'Input validation failed';
        details = err.details?.map((detail: any) => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
        })) || [{ message: err.message }];
    }

    // Handle MongoDB errors
    if (err.name === 'MongoError' || err.name === 'MongoServerError') {
        status = 500;
        code = 'database_error';
        message = 'Database operation failed';
        details = { mongoCode: err.code, mongoMessage: err.message };
    }

    // Handle Mongoose validation errors
    if (err.name === 'ValidationError' && err.errors) {
        status = 400;
        code = 'validation_error';
        message = 'Data validation failed';
        details = Object.keys(err.errors).map(field => ({
            field,
            message: err.errors[field].message,
            value: err.errors[field].value
        }));
    }

    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        status = 401;
        code = 'invalid_token';
        message = 'Invalid authentication token';
        details = undefined; // Don't expose token details
    }

    if (err.name === 'TokenExpiredError') {
        status = 401;
        code = 'token_expired';
        message = 'Authentication token has expired';
        details = undefined;
    }

    // Handle rate limit errors
    if (err.message && err.message.includes('rate limit')) {
        status = 429;
        code = 'rate_limit_exceeded';
        message = 'Too many requests. Please try again later.';
    }

    // Handle network/connection errors
    if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
        status = 503;
        code = 'service_unavailable';
        message = 'External service is temporarily unavailable';
        details = { networkError: err.code };
    }

    // Handle file system errors
    if (err.code === 'ENOENT') {
        status = 404;
        code = 'file_not_found';
        message = 'Requested file or resource not found';
    }

    if (err.code === 'EACCES' || err.code === 'EPERM') {
        status = 403;
        code = 'permission_denied';
        message = 'Insufficient permissions for this operation';
    }

    // Don't expose internal errors in production
    if (status === 500 && process.env['NODE_ENV'] === 'production') {
        message = 'An internal server error occurred';
        details = undefined;
    }

    // Log error with appropriate level
    const logLevel = status >= 500 ? 'error' : 'warn';
    logger[logLevel]('Request failed', {
        method: req.method,
        path: req.originalUrl,
        status,
        code,
        message: err.message || message, // Log original message
        stack: err.stack,
        details: err.details || details,
        userId: (req as any).user?.id,
        requestId: (req as any).requestId,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
    });

    // Send error response
    const response: any = {
        error: { 
            code, 
            message,
            ...(details && { details })
        },
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
    };

    // Add request ID if available for debugging
    if ((req as any).requestId) {
        response.requestId = (req as any).requestId;
    }

    res.status(status).json(response);
}

export default errorHandler;


