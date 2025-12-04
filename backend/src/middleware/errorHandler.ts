import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';
import { env } from '../config/env.js';
import { hashForLogging } from '../utils/crypto.js';

interface ErrorResponse {
  error: string;
  code: string;
  details?: unknown;
  stack?: string;
  requestId?: string;
}

// Sensitive fields to redact from logs
const SENSITIVE_FIELDS = ['password', 'token', 'apiKey', 'secret', 'mnemonic', 'privateKey'];

/**
 * Sanitize request body for logging (redact sensitive data)
 */
function sanitizeForLogging(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  
  const sanitized = { ...body as Record<string, unknown> };
  
  for (const field of SENSITIVE_FIELDS) {
    if (field in sanitized && sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  // Hash initData if present (contains user info)
  if ('initData' in sanitized && typeof sanitized.initData === 'string') {
    sanitized.initData = `[HASH:${hashForLogging(sanitized.initData)}]`;
  }
  
  return sanitized;
}

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  // Generate request ID for tracking
  const requestId = request.id || crypto.randomUUID?.() || Date.now().toString(36);
  
  // Log error with sanitized body (M6 fix)
  request.log.error({
    err: error,
    url: request.url,
    method: request.method,
    body: sanitizeForLogging(request.body),
    requestId,
    ip: request.ip,
    userId: (request.user as any)?.userId,
  });

  // Build response
  const response: ErrorResponse = {
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    requestId, // Include for support reference
  };

  let statusCode = 500;

  // Handle AppError (our custom errors)
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    response.error = error.message;
    response.code = error.code;
    if (error.details) {
      response.details = error.details;
    }
  }
  // Handle Zod validation errors
  else if (error instanceof ZodError) {
    statusCode = 422;
    response.error = 'Validation failed';
    response.code = 'VALIDATION_ERROR';
    response.details = error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  }
  // Handle Fastify validation errors
  else if (error.validation) {
    statusCode = 400;
    response.error = 'Validation error';
    response.code = 'VALIDATION_ERROR';
  }
  // Handle JWT errors
  else if (error.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER' || 
           error.code === 'FST_JWT_AUTHORIZATION_TOKEN_INVALID') {
    statusCode = 401;
    response.error = 'Unauthorized';
    response.code = 'UNAUTHORIZED';
  }
  // H6 FIX: Generic error - don't leak internal details in production
  else {
    // In production, use generic message
    // In development, show actual error for debugging
    if (env.NODE_ENV === 'production') {
      response.error = 'An unexpected error occurred';
      // Log the actual error for debugging
      request.log.error({
        requestId,
        actualError: error.message,
        stack: error.stack,
      }, 'Internal error details (not sent to client)');
    } else {
      response.error = error.message || 'Internal server error';
    }
  }

  // Include stack trace only in development
  if (env.NODE_ENV === 'development' && error.stack) {
    response.stack = error.stack;
  }

  reply.status(statusCode).send(response);
}

// Not found handler
export function notFoundHandler(
  request: FastifyRequest,
  reply: FastifyReply
): void {
  // Don't leak full URL structure in production
  const path = env.NODE_ENV === 'production' 
    ? request.routerPath || request.url.split('?')[0]
    : request.url;
    
  reply.status(404).send({
    error: `Route ${request.method} ${path} not found`,
    code: 'NOT_FOUND',
  });
}
