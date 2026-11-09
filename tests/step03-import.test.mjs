import assert from 'node:assert/strict';
import { TEAM_IDS, TEAM_REGISTRY, importTeamFactory } from '../integration/team-registry.mjs';
assert.equal(TEAM_IDS.length,20);
let ok=0;
for(const id of TEAM_IDS){
 const factory=await importTeamFactory(id);
 assert.equal(typeof factory,'function','No.'+id+' exported factory');
 console.log('No.'+id+' : imported '+TEAM_REGISTRY[id].entry);
 ok++;
}
console.log(`PASS: ${ok}/20 team factories can be imported`);
