/** AETHER FRONTIER / No.00 team source registry, Three.js r160; no build tools. */
export const TEAM_REGISTRY = Object.freeze({
  '01': {entry:'teams/01/src/aether-module.js',quality:'lite',role:'city'},
  '02': {entry:'integration/normalized/no02-district.mjs',original:'teams/02/src/aether-district.js',quality:'low',role:'district',legacy:true},
  '03': {entry:'teams/03/aether-sky-islands.js',quality:'low',role:'islands'},
  '04': {entry:'integration/normalized/no04-temple.mjs',original:'teams/04/aether-temple.js',quality:'low',role:'temple',legacy:true},
  '05': {entry:'teams/05/aether_no05_lab.js',quality:'low',role:'lab'},
  '06': {entry:'teams/06/src/aether_plant.js',quality:'low',role:'plant'},
  '07': {entry:'teams/07/aether-nature.js',quality:'low',role:'wilderness'},
  '08': {entry:'teams/08/src/ship.js',quality:'low',role:'ship',companions:['teams/08/src/flight-controller.js']},
  '09': {entry:'teams/09/src/aether-no09.js',quality:'low',role:'battleship'},
  '10': {entry:'teams/10/src/aether_no10_robot.js',quality:'lite',role:'transformer'},
  '11': {entry:'teams/11/src/aether-drone.js',quality:'low',role:'drone',companions:['teams/11/src/drone-pilot.js']},
  '12': {entry:'teams/12/source/aether-vehicle.js',quality:'low',role:'ground-vehicle',companions:['teams/12/source/aether-driver.js']},
  '13': {entry:'teams/13/src/aether-dragon.js',quality:'low',role:'dragon'},
  '14': {entry:'teams/14/aether-golem.js',quality:'low',role:'golem'},
  '15': {entry:'teams/15/aether15_weapon.js',quality:'low',role:'weapon'},
  '16': {entry:'teams/16/enemyModule.js',quality:'low',role:'enemy-ai'},
  '17': {entry:'integration/normalized/no17-performance.mjs',original:'teams/17/aether-performance.js',quality:'lite',role:'performance',legacy:true},
  '18': {entry:'teams/18/aether-atmosphere.js',quality:'lite',role:'weather'},
  '19': {entry:'teams/19/src/aether-player-controller.js',quality:'low',role:'player',companions:['teams/19/src/aether-input-adapter.js']},
  '20': {entry:'teams/20/source/aether-interactions.js',quality:'low',role:'puzzles'}
});
export const TEAM_IDS = Object.freeze(Object.keys(TEAM_REGISTRY));
export function teamId(value) {
  const key=String(value).replace(/^No\.?/i,'').padStart(2,'0');
  if (!Object.hasOwn(TEAM_REGISTRY,key)) throw new RangeError('Unknown AETHER team: '+String(value));
  return key;
}
export function canonicalQuality(value='lite') {
  if(value==='lite'||value==='low'||value==='light'||value==='lightweight')return 'lite';
  if(value==='high'||value==='quality')return 'high';
  throw new RangeError('Quality must be lite or high: '+String(value));
}
export function moduleQuality(id,quality='lite') {
  const mode=canonicalQuality(quality);
  return mode==='high'?'high':TEAM_REGISTRY[teamId(id)].quality;
}
/** Import a team's factory after STEP03 has put the original sources at the registry paths. */
export async function importTeamFactory(id, baseUrl=new URL('../',import.meta.url)) {
  const spec=TEAM_REGISTRY[teamId(id)];
  const url=new URL(spec.entry,baseUrl);
  const mod=await import(url.href);
  if(typeof mod.createAetherModule!=='function')throw new TypeError('No factory in '+url.href);
  return mod.createAetherModule;
}
