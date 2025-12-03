import { describe, it, expect } from 'vitest';
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  InsufficientBalanceError,
  MinimumAmountError,
  RateLimitError,
} from '../../src/utils/errors.js';

describe('Custom Errors', () => {
  describe('AppError', () => {
    it('should create error with all properties', () => {
      const error = new AppError(400, 'TEST_CODE', 'Test message', { extra: 'data' });
      
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('TEST_CODE');
      expect(error.message).toBe('Test message');
      expect(error.details).toEqual({ extra: 'data' });
      expect(error.name).toBe('AppError');
    });
  });

  describe('BadRequestError', () => {
    it('should have 400 status code', () => {
      const error = new BadRequestError('Bad request');
      
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('BAD_REQUEST');
    });

    it('should accept custom code', () => {
      const error = new BadRequestError('Custom error', 'CUSTOM_CODE');
      
      expect(error.code).toBe('CUSTOM_CODE');
    });
  });

  describe('UnauthorizedError', () => {
    it('should have 401 status code', () => {
      const error = new UnauthorizedError();
      
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.message).toBe('Unauthorized');
    });
  });

  describe('NotFoundError', () => {
    it('should have 404 status code', () => {
      const error = new NotFoundError('Resource not found');
      
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });
  });

  describe('InsufficientBalanceError', () => {
    it('should include currency in message', () => {
      const error = new InsufficientBalanceError('USDT');
      
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('INSUFFICIENT_BALANCE');
      expect(error.message).toBe('Insufficient USDT balance');
    });
  });

  describe('MinimumAmountError', () => {
    it('should include min amount and currency', () => {
      const error = new MinimumAmountError(10, 'USDT');
      
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('MINIMUM_AMOUNT');
      expect(error.message).toBe('Minimum amount is 10 USDT');
    });
  });

  describe('RateLimitError', () => {
    it('should have 429 status code', () => {
      const error = new RateLimitError();
      
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });
});

