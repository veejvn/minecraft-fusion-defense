import { z } from 'zod';
import { nonNegativeIntegerSchema, nonNegativeNumberSchema, positiveNumberSchema, stableIdSchema } from './shared';

export const enemyDefinitionSchema = z.strictObject({
  id: stableIdSchema,
  classification: z.literal('enemy'),
  stats: z.strictObject({
    maxHp: positiveNumberSchema,
    moveSpeed: positiveNumberSchema, // cells/second
    damage: nonNegativeNumberSchema.optional(),
  }).optional(),
  rewards: z.strictObject({
    energy: nonNegativeIntegerSchema,
    powerCrystals: nonNegativeIntegerSchema,
  }).optional(),
});

export type EnemyDefinition = z.infer<typeof enemyDefinitionSchema>;
