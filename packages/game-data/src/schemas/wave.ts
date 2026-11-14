import { z } from 'zod';
import { nonNegativeNumberSchema, positiveIntegerSchema, stableIdSchema } from './shared';

export const waveDefinitionSchema = z.strictObject({
  id: stableIdSchema,
  spawns: z.array(z.strictObject({
    enemyId: stableIdSchema,
    count: positiveIntegerSchema,
    atSeconds: nonNegativeNumberSchema,
  })).optional(),
});

export type WaveDefinition = z.infer<typeof waveDefinitionSchema>;
