import { z } from 'zod';

export const stableIdSchema = z.string().min(1).regex(/^[a-z][a-z0-9_]*$/, 'Expected a stable snake_case ID');
export const nonNegativeNumberSchema = z.number().finite().nonnegative();
export const positiveNumberSchema = z.number().finite().positive();
export const nonNegativeIntegerSchema = z.number().int().nonnegative();
export const positiveIntegerSchema = z.number().int().positive();
