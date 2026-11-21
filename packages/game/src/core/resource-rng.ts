export interface ResourceRng {
  seed: number;
}

function mulberry32(rng: ResourceRng): number {
  rng.seed = (rng.seed + 0x6d2b79f5) >>> 0;
  let value = Math.imul(rng.seed ^ (rng.seed >>> 15), rng.seed | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return (value ^ (value >>> 14)) >>> 0;
}

export function uniformIndex(rng: ResourceRng, size: number): number {
  // Rejection sampling avoids modulo bias and supports safe integer tick ranges.
  const domain = size <= 0x100000000 ? 0x100000000 : 0x20000000000000;
  const limit = domain - domain % size;
  let sample: number;
  do {
    sample = mulberry32(rng);
    if (domain > 0x100000000) sample = (sample & 0x1fffff) * 0x100000000 + mulberry32(rng);
  } while (sample >= limit);
  return sample % size;
}
