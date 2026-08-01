/**
 * mulberry32 — tiny seeded PRNG. Same seed, same sequence, forever; the whole
 * run-generation stack (maps, encounters, shops) derives from the run seed.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Derive a child seed from a parent seed and a stream tag. */
export function deriveSeed(seed: number, tag: number): number {
  return (Math.imul(seed ^ 0x9E3779B9, 0x85EBCA6B) + Math.imul(tag + 1, 0xC2B2AE35)) >>> 0;
}
