import { z } from 'zod';
import { positiveIntegerSchema, stableIdSchema } from './shared';

export const levelDefinitionSchema = z.strictObject({
  id: stableIdSchema,
  rows: positiveIntegerSchema,
  columns: positiveIntegerSchema,
  waveIds: z.array(stableIdSchema),
});

export type LevelDefinition = z.infer<typeof levelDefinitionSchema>;
