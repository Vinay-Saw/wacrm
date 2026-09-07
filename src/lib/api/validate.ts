import { type ZodSchema } from 'zod';

export class ValidationError extends Error {
  readonly status = 400 as const;
  readonly issues: unknown[];

  constructor(message: string, issues: unknown[] = []) {
    super(message);
    this.name = 'ValidationError';
    this.issues = issues;
  }
}

/**
 * Parses and validates a JSON request body using a Zod schema.
 * Throws a ValidationError (HTTP 400) if parsing or schema validation fails.
 */
export async function parseBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ValidationError('Invalid JSON in request body');
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    const issues = result.error.issues ?? [];
    const formattedError = issues
      .map((e) => `${e.path.length ? e.path.join('.') + ': ' : ''}${e.message}`)
      .join('; ');
    throw new ValidationError(formattedError || 'Validation failed', issues);
  }

  return result.data;
}
