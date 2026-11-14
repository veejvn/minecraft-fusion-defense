import { z } from 'zod';
import { stableIdSchema } from './shared';

export const fusionRecipeSchema = z.strictObject({
  id: stableIdSchema,
  inputDefenderIds: z.tuple([stableIdSchema, stableIdSchema]),
  outputDefenderId: stableIdSchema,
});

export type FusionRecipe = z.infer<typeof fusionRecipeSchema>;
