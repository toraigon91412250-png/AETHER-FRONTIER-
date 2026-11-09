import assert from 'node:assert/strict';
import {test} from 'node:test';
import {TEAM_IDS,TEAM_REGISTRY,teamId,moduleQuality,importTeamFactory,createAetherCompat} from '../aether-compat.mjs';

class V3 {
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;this.isVector3=true;}
  clone(){return new V3(this.x,this.y,this.z);}
}
class Group {
  constructor(){this.position=new V3();this.parent=null;}
  updateWorldMatrix(){}
  worldToLocal(p){let node=this;while(node){p.x-=node.position.x;p.y-=node.position.y;p.z-=node.position.z;node=node.parent;}return p;}
  localToWorld(p){let node=this;while(node){p.x+=node.position.x;p.y+=node.position.y;p.z+=node.position.z;node=node.parent;}return p;}
}
const THREE={Vector3:V3,Group};
function mockFactory(extend=()=>({}),track={}) {
  return (_T,options)=>{
    track.initialQuality=options.quality;
    track.onEvent=options.onEvent;
    track.qualities=[];track.updates=[];track.disposals=0;
    const root=new Group();
    return {root,
      update(dt,ctx){track.updates.push({dt,ctx});},
      setQuality(q){track.qualities.push(q);return q;},
      dispose(){track.disposals++;},...extend(root,options,track)};
  };
}
test('20 distinct IDs, quality normalized per source setQuality implementation',()=>{
  assert.equal(TEAM_IDS.length,20);
  assert.equal(new Set(TEAM_IDS).size,20);
  assert.equal(teamId('No.04'),'04');
  assert.equal(teamId(7),'07');
  assert.throws(()=>teamId('21'),RangeError);
  assert.throws(()=>moduleQuality('07','ultra'),RangeError);
  for(const id of TEAM_IDS){
    const trace={}; const m=createAetherCompat({THREE,id,factory:mockFactory(()=>({}),trace),quality:'lite'});
    assert.equal(trace.initialQuality,TEAM_REGISTRY[id].quality,id);
    assert.equal(m.quality,'lite');
    assert.equal(m.setQuality('high'),'high');assert.equal(trace.qualities.at(-1),'high');
    assert.equal(m.setQuality('lite'),'lite');assert.equal(trace.qualities.at(-1),TEAM_REGISTRY[id].quality,id);
    m.update(.2,{quality:'lite',playerPosition:{x:1}});
    assert.equal(trace.updates[0].dt,.1);
    assert.equal(trace.updates[0].ctx.quality,TEAM_REGISTRY[id].quality);
    m.dispose();m.dispose();assert.equal(trace.disposals,1);
    m.update(.04);assert.equal(trace.updates.length,1);
  }
});
test('event bridge, preserved native onEvent, bounded queue',()=>{
  const seen=[],native=[];const track={};
  const m=createAetherCompat({THREE,id:'16',factory:mockFactory(()=>({}),track),
    options:{onEvent:x=>native.push(x)},onEvent:x=>seen.push(x)});
  track.onEvent({type:'attackWindup',value:1});
  assert.equal(seen[0].teamId,'16');assert.equal(seen[0].type,'attackWindup');
  assert.equal(native.length,1);
  for(let i=0;i<80;i++)track.onEvent({type:'tick',i});
  assert.equal(m.drainEvents().length,64);assert.equal(m.drainEvents().length,0);
  m.dispose();
});
test('translated No04 temple floor/blockers do not lose root Y (even with a parent translation)',()=>{
  const m=createAetherCompat({THREE,id:'04',factory:mockFactory(root=>({
    metadata:{bounds:{min:[-49,-7,-97],max:[49,31,60]}},
    getFloorHeight(x,z){return 2;},
    isBlocked(x,z,y,radius){return y===2&&radius===.5&&x===12&&z===33;},
    getSpawnPoint(){return new V3(root.position.x,root.position.y+1.8,root.position.z);}
  }))});
  m.root.position=new V3(10,20,30);
  const parent=new Group(); parent.position=new V3(-5,40,0);m.root.parent=parent;
  assert.equal(m.sampleGroundWorld(7,33,62),62);
  assert.equal(m.sampleGroundWorld(500,500,62),null);
  assert.equal(m.isBlockedWorld(7,33,62,.5),true);
  assert.deepEqual([m.getSpawnWorld().x,m.getSpawnWorld().y,m.getSpawnWorld().z],[5,61.8,30]);
});
test('navigation world-space mapping for plant, wilderness and battleship',()=>{
  const cases=[
    ['06',r=>({navigation:{sampleGround:(x,z,y)=>x===2&&z===3&&y===8?5:null,collides:()=>true}}),15],
    ['07',r=>({surfaceHeight:(x,z)=>x===2&&z===3?5:null}),15],
    ['09',r=>({sampleWalkable:(x,z,y)=>x===2&&z===3&&y===8?5:null}),15]
  ];
  for(const [id,ex,expected] of cases){
    const m=createAetherCompat({THREE,id,factory:mockFactory(ex)});
    m.root.position=new V3(10,10,30);
    assert.equal(m.sampleGroundWorld(12,33,18),expected,id);
  }
});
test('legacy IIFE ESM wrappers export factories without mutating globalThis',async()=>{
  const saved=globalThis.createAetherModule;
  for(const name of ['no02-district.mjs','no04-temple.mjs','no17-performance.mjs']){
    const mod=await import('../normalized/'+name);
    assert.equal(typeof mod.createAetherModule,'function',name);
  }
  assert.equal(globalThis.createAetherModule,saved);
});
test('reject missing contract and invalid factory',()=>{
  assert.throws(()=>createAetherCompat({THREE,id:'01',factory:()=>({})}),/missing API/);
  assert.throws(()=>createAetherCompat({THREE,id:'01',factory:null}),/factory must/);
});

test('No04/05 interaction positions are mapped to world coordinates',()=>{
  const temple=createAetherCompat({THREE,id:'04',factory:mockFactory(root=>({
    nearest(pos){return pos.x===13&&pos.y===22&&pos.z===33?{id:'west',position:new V3(15,21,32)}:null;},
    interact(pos){return {ok:pos.x===13&&pos.y===22&&pos.z===33};}
  }))});
  temple.root.position=new V3(10,20,30);
  assert.equal(temple.nearestWorld({x:13,y:22,z:33}).position.x,15);
  assert.equal(temple.interactWorld({x:13,y:22,z:33}).ok,true);
  const lab=createAetherCompat({THREE,id:'05',factory:mockFactory(root=>({
    getNearestInteractable(pos){return pos.x===2?{id:'valveA',position:new V3(2,1,3)}:null;},
    interact(pos){return {ok:pos.x===2};}
  }))});
  lab.root.position=new V3(10,10,30);
  assert.equal(lab.nearestWorld({x:12,y:11,z:33}).position.y,11);
  assert.equal(lab.interactWorld({x:12,y:11,z:33}).ok,true);
});
