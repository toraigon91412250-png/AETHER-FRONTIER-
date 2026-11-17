/** Requires the full Work20 GitHub checkout and its local Three.js vendor.
 * This intentionally uses genuine Three.js modules rather than mocks.
 */
import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from '../playtest/work20/vendor/three.module.js';
import {createWorld,arenaSpawn,arena} from '../playtest/work20/world.js';
import {captureModuleProgress,restoreModuleProgress} from '../playtest/work20/module-progress.js';

function dispose(world) {
  world.exploration.dispose();
  world.vehicles.dispose();
  world.encounters.dispose();
  world.atmosphere.dispose();
}

test('actual Three.js puzzles survive save -> fresh world -> restore',async()=>{
  const first=await createWorld(new THREE.Scene());
  let restored;
  try {
    const areas=first.exploration.areas;
    const temple=areas.get('temple').module.instance;
    for(const id of ['west','east']){
      const entry=temple.getInteractables().find(e=>e.id===id);
      assert.ok(temple.interact(entry.position).ok);
    }
    const lab=areas.get('lab').module.instance;
    lab.interact({x:-57,y:1.5,z:-46},1.9);
    lab.interact({x:-57,y:1.5,z:-25},1.9);
    lab.interact({x:59,y:1.5,z:-46},1.9);
    const plant=areas.get('plant').module.instance;
    assert.ok(plant.interact('02').ok);
    const snapshot=captureModuleProgress(areas);
    assert.equal(snapshot.temple.gate,false);
    assert.equal(snapshot.lab.cooling,true);
    assert.equal(snapshot.lab.tuning,1);
    assert.deepEqual(snapshot.plant.activeSectors,['02']);
    restored=await createWorld(new THREE.Scene());
    const result=restoreModuleProgress(restored.exploration.areas,snapshot);
    assert.deepEqual(result.errors,[]);
    assert.deepEqual(captureModuleProgress(restored.exploration.areas),snapshot);
    assert.equal(restored.zoneAt(arenaSpawn.x,arenaSpawn.z,arenaSpawn.y),'arena');
    assert.equal(restored.ground(arenaSpawn.x,arenaSpawn.z,arenaSpawn.y),arena.y);
  } finally {dispose(first);if(restored)dispose(restored);}
});
