import { z } from 'zod';
import { nonNegativeIntegerSchema, nonNegativeNumberSchema, positiveIntegerSchema, positiveNumberSchema, stableIdSchema } from './shared';

export const defenderDefinitionSchema = z.strictObject({
  id: stableIdSchema,
  classification: z.enum(['base', 'fusion']),
  tier: positiveIntegerSchema,
  abilityId: stableIdSchema.optional(),
  stats: z.strictObject({
    maxHp: positiveNumberSchema,
    damage: nonNegativeNumberSchema,
    attackSpeed: positiveNumberSchema, // attacks/second
    attackRange: nonNegativeNumberSchema, // cells
  }).optional(),
  summonEnergyCost: nonNegativeIntegerSchema.optional(),
});

export type DefenderDefinition = z.infer<typeof defenderDefinitionSchema>;
