import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export function requireFields(fields: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        for (const field of fields) {
            if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
                res.status(400).json({
                    error: { code: 'validation_error', message: `Missing field: ${field}` },
                    timestamp: new Date().toISOString(),
                    path: req.originalUrl,
                });
                return;
            }
        }
        next();
    };
}

export function validateBody(schema: Joi.ObjectSchema) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
            convert: true,
        });

        if (error) {
            const details = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value,
            }));

            res.status(400).json({
                error: {
                    code: 'validation_error',
                    message: 'Request validation failed',
                    details,
                },
                timestamp: new Date().toISOString(),
                path: req.originalUrl,
            });
            return;
        }

        req.body = value;
        next();
    };
}

export function validateQuery(schema: Joi.ObjectSchema) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const { error, value } = schema.validate(req.query, {
            abortEarly: false,
            stripUnknown: true,
            convert: true,
        });

        if (error) {
            const details = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value,
            }));

            res.status(400).json({
                error: {
                    code: 'validation_error',
                    message: 'Query validation failed',
                    details,
                },
                timestamp: new Date().toISOString(),
                path: req.originalUrl,
            });
            return;
        }

        req.query = value;
        next();
    };
}

export function validateParams(schema: Joi.ObjectSchema) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const { error, value } = schema.validate(req.params, {
            abortEarly: false,
            stripUnknown: true,
            convert: true,
        });

        if (error) {
            const details = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value,
            }));

            res.status(400).json({
                error: {
                    code: 'validation_error',
                    message: 'Parameter validation failed',
                    details,
                },
                timestamp: new Date().toISOString(),
                path: req.originalUrl,
            });
            return;
        }

        req.params = value;
        next();
    };
}

export default { requireFields, validateBody, validateQuery, validateParams };


