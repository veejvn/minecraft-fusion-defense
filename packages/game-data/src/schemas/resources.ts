import { z } from 'zod';
import { nonNegativeIntegerSchema, positiveNumberSchema } from './shared';

export const resourceConfigurationSchema = z.strictObject({
  initialEnergy: nonNegativeIntegerSchema.optional(),
  passiveEnergyAmount: nonNegativeIntegerSchema.optional(),
  passiveEnergyIntervalSeconds: positiveNumberSchema.optional(),
  maxEnergy: z.literal('unlimited').optional(),
  initialPowerCrystals: nonNegativeIntegerSchema.optional(),
  maxPowerCrystals: nonNegativeIntegerSchema.optional(),
  energyItemLifetimeSeconds: positiveNumberSchema.optional(),
  powerCrystalItemLifetimeSeconds: positiveNumberSchema.optional(),
});

export type ResourceConfiguration = z.infer<typeof resourceConfigurationSchema>;
