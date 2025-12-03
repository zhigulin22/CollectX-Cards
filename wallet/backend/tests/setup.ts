import { beforeAll, afterAll } from 'vitest';

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-at-least-32-characters-long';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

beforeAll(() => {
  console.log('🧪 Starting tests...');
});

afterAll(() => {
  console.log('✅ Tests complete');
});

