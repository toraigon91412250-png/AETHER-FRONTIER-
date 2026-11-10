import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as THREE from '../playtest/work20/vendor/three.module.js';
import {createWorld,arena,arenaSpawn} from '../playtest/work20/world.js';
import {createSword} from '../playtest/work20/sword.js';

test('real Three.js module instances expose reachable floors and legal spawns',async()=>{
  const world=await createWorld(new THREE.Scene());
  const {exploration,vehicles,encounters,atmosphere}=world;
  try {
    // Regression: portal exit lies inside the STARVEIN WILDS rectangle.
    assert.equal(world.zoneAt(arenaSpawn.x,arenaSpawn.z,arenaSpawn.y),'arena');
    assert.equal(exploration.zoneAt(arenaSpawn.x,arenaSpawn.z,arenaSpawn.y),null);
    assert.equal(world.ground(arenaSpawn.x,arenaSpawn.z,arenaSpawn.y),arena.y);
    assert.equal(world.zoneAt(345,-401,39),'arena');
    assert.equal(world.zoneAt(345,-390,39),'wilds');
    const source=arenaSpawn.clone(),step=source.clone().add(new THREE.Vector3(0,0,.5));
    world.resolve({previous:source,proposed:step,radius:.4,height:1.8});
    assert.ok(step.z>source.z+.2,'arena walk ignores wilderness collision');
    const wildsEdge=new THREE.Vector3(345,39,-395),enterArena=new THREE.Vector3(345,39,-401);
    world.resolve({previous:wildsEdge,proposed:enterArena,radius:.4,height:1.8});
    assert.equal(enterArena.z,-401,'the arena must be enterable from the wilderness');
    for(const [key,{spawn}] of exploration.areas){
      assert.equal(world.zoneAt(spawn.x,spawn.z,spawn.y),key);
      assert.equal(world.ground(spawn.x,spawn.z,spawn.y),spawn.y);
    }
    const lab=exploration.areas.get('lab').module;
    const inner=lab.toWorld({x:0,y:0,z:-156.6});
    assert.equal(world.zoneAt(inner.x,inner.z,inner.y),'lab');
    assert.equal(world.ground(inner.x,inner.z,inner.y),inner.y);
    const gate=lab.toWorld({x:0,y:0,z:-113.25});
    assert.equal(lab.isBlockedWorld(gate.x,gate.z,gate.y),true);
    const hangar=vehicles.carrier.toWorld({x:67,y:27.18,z:72});
    assert.equal(world.zoneAt(hangar.x,hangar.z,hangar.y),'carrier');
    assert.equal(world.ground(hangar.x,hangar.z,hangar.y),hangar.y);
    const start=vehicles.rover.root.position.clone();
    for(let i=0;i<90;i++)vehicles.drive(1/60,{moveX:0,moveY:1});
    assert.ok(vehicles.rover.root.position.distanceTo(start)>8);
    vehicles.robot.instance.transformTo('flight');
    for(let i=0;i<120;i++)vehicles.robot.update(1/30,{});
    assert.equal(vehicles.robot.instance.getState().form,'flight');
    atmosphere.module.instance.setWeather('storm',0);
    assert.equal(atmosphere.module.instance.getState().weather,'storm');
  }finally{exploration.dispose();vehicles.dispose();encounters.dispose();atmosphere.dispose();}
});

test('melee applies damage once during the active sweep and misses outside reach',()=>{
  const sword=createSword(THREE);
  let hits=0,misses=0;
  const run=(z)=>{
    assert.ok(sword.start());
    for(let i=0;i<55;i++)sword.update(1/60,new THREE.Vector3(),0,
      {position:new THREE.Vector3(0,1.4,z),radius:.4},()=>hits++,()=>misses++);
  };
  run(-12);assert.deepEqual([hits,misses],[0,1]);
  run(-2);assert.deepEqual([hits,misses],[1,1]);
});
