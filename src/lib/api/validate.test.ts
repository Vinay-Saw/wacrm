import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { parseBody, ValidationError } from './validate';

describe('parseBody', () => {
  const schema = z.object({
    name: z.string().min(1),
    age: z.number().int().positive().optional(),
  });

  it('parses valid body correctly', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ name: 'Alice', age: 30 }),
    });
    const result = await parseBody(req, schema);
    expect(result).toEqual({ name: 'Alice', age: 30 });
  });

  it('throws ValidationError with 400 status on invalid JSON', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: 'invalid-json{',
    });
    await expect(parseBody(req, schema)).rejects.toThrowError(ValidationError);
    try {
      await parseBody(req, schema);
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(ValidationError);
      if (err instanceof ValidationError) {
        expect(err.status).toBe(400);
        expect(err.message).toContain('Invalid JSON');
      }
    }
  });

  it('throws ValidationError with detailed message on schema failure', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ name: '', age: -5 }),
    });
    try {
      await parseBody(req, schema);
      expect.fail('Should have thrown');
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AssertionError') throw err;
      expect(err).toBeInstanceOf(ValidationError);
      if (err instanceof ValidationError) {
        expect(err.status).toBe(400);
        expect(err.message).toContain('name');
        expect(err.issues.length).toBeGreaterThan(0);
      }
    }
  });
});
