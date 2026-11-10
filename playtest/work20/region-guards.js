/** Shared boss-arena ownership, independent of Three.js. */
export const ARENA_CENTER=Object.freeze({x:345,z:-445});
export const ARENA_RADIUS=45.5;
export function isArenaFootprint(x,z){
  return Number.isFinite(x)&&Number.isFinite(z)&&Math.hypot(x-ARENA_CENTER.x,z-ARENA_CENTER.z)<ARENA_RADIUS;
}
