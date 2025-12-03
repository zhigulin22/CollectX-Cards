// Custom Application Errors

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// 400 Bad Request
export class BadRequestError extends AppError {
  constructor(message: string, code = 'BAD_REQUEST', details?: unknown) {
    super(400, code, message, details);
  }
}

// 401 Unauthorized
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', code = 'UNAUTHORIZED') {
    super(401, code, message);
  }
}

// 403 Forbidden
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', code = 'FORBIDDEN') {
    super(403, code, message);
  }
}

// 404 Not Found
export class NotFoundError extends AppError {
  constructor(message = 'Not found', code = 'NOT_FOUND') {
    super(404, code, message);
  }
}

// 409 Conflict
export class ConflictError extends AppError {
  constructor(message: string, code = 'CONFLICT') {
    super(409, code, message);
  }
}

// 422 Unprocessable Entity (validation errors)
export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(422, 'VALIDATION_ERROR', message, details);
  }
}

// 429 Too Many Requests
export class RateLimitError extends AppError {
  constructor(message = 'Too many requests, please try again later') {
    super(429, 'RATE_LIMIT_EXCEEDED', message);
  }
}

// 500 Internal Server Error
export class InternalError extends AppError {
  constructor(message = 'Internal server error') {
    super(500, 'INTERNAL_ERROR', message);
  }
}

// Business logic errors
export class InsufficientBalanceError extends BadRequestError {
  constructor(currency: string) {
    super(`Insufficient ${currency} balance`, 'INSUFFICIENT_BALANCE');
  }
}

export class MinimumAmountError extends BadRequestError {
  constructor(min: number, currency: string) {
    super(`Minimum amount is ${min} ${currency}`, 'MINIMUM_AMOUNT');
  }
}

export class UserNotFoundError extends NotFoundError {
  constructor() {
    super('User not found', 'USER_NOT_FOUND');
  }
}

export class WalletNotFoundError extends NotFoundError {
  constructor() {
    super('Wallet not found', 'WALLET_NOT_FOUND');
  }
}


