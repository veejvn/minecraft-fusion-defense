import { z } from 'zod';
import { nonNegativeIntegerSchema, nonNegativeNumberSchema, stableIdSchema } from './shared';

export const abilityDefinitionSchema = z.strictObject({
  id: stableIdSchema,
  ownerDefenderId: stableIdSchema,
  powerCrystalCost: nonNegativeIntegerSchema.optional(),
  cooldownSeconds: nonNegativeNumberSchema.optional(),
});

export type AbilityDefinition = z.infer<typeof abilityDefinitionSchema>;
