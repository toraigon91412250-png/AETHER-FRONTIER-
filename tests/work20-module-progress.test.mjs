import assert from 'node:assert/strict';
import {test} from 'node:test';
import {captureModuleProgress,restoreModuleProgress,MODULE_PROGRESS_VERSION} from '../playtest/work20/module-progress.js';

function createMocks() {
  const templeState={west:false,east:false,heart:false,gate:false,archive:false};
  const temple={getState:()=>({...templeState}),getInteractables:()=>['west','east','heart','archive'].map((id,n)=>({id,position:{x:n,y:0,z:0}})),
    interact(pos){const id=['west','east','heart','archive'][pos.x];if(id==='archive'&&!templeState.gate)return {ok:false};if(templeState[id])return {ok:false};templeState[id]=true;
      if(templeState.west&&templeState.east&&templeState.heart)templeState.gate=true;return {ok:true};}};
  const labState={valveA:false,valveB:false,cooling:false,tuning:0,archive:false,gateOpen:false,awakened:false,secret:false};
  const commands=[];
  const lab={getState:()=>({...labState}),interact({x,z}){
    let id= x===-57?(z===-46?'valveA':'valveB'):
      x===59?`tone${Math.round((z+46)/10+1)}`:
      x===0?(z===-99?'archive':z===-156.6?'core':'invalid'):
      x===-29?'secret':x===3.8?'gate':'invalid';
    commands.push(id);
    if(id==='valveA')labState.valveA=true;
    else if(id==='valveB'&&labState.valveA){labState.valveB=true;labState.cooling=true;}
    else if(id.startsWith('tone')&&Number(id.slice(-1))===labState.tuning+1)labState.tuning++;
    else if(id==='archive')labState.archive=true;
    else if(id==='secret')labState.secret=true;
    else if(id==='gate'&&labState.cooling&&labState.archive&&labState.tuning===3)labState.gateOpen=true;
    else if(id==='core'&&labState.gateOpen)labState.awakened=true;
    return {ok:true};}};
  const sectors=new Set();let overdrive=false;
  const plant={getState:()=>({activeSectors:[...sectors],overdrive,quality:'high'}),interact(id){
    if(id==='FINAL'){if(sectors.size!==3)return {ok:false};overdrive=true;return {ok:true};}
    if(!['01','02','03'].includes(id)||sectors.has(id))return {ok:false};sectors.add(id);return {ok:true};}};
  const areas=new Map([['temple',{module:{instance:temple}}],['lab',{module:{instance:lab}}],['plant',{module:{instance:plant}}]]);
  return {areas,templeState,labState,plant,commands};
}

test('round trip save restores three puzzle areas and gate visuals via public API',()=>{
 const src=createMocks();
 for(const p of src.areas.get('temple').module.instance.getInteractables())src.areas.get('temple').module.instance.interact(p.position);
 const l=src.areas.get('lab').module.instance;
 for(const [x,z] of [[-57,-46],[-57,-25],[59,-46],[59,-36],[59,-26],[0,-99],[3.8,-108.2],[0,-156.6]])l.interact({x,z});
 const p=src.areas.get('plant').module.instance;
 for(const id of ['01','02','03','FINAL'])p.interact(id);
 const stored=captureModuleProgress(src.areas);
 assert.equal(stored.version,MODULE_PROGRESS_VERSION);
 assert.equal(stored.lab.awakened,true);assert.equal(stored.temple.archive,true);assert.equal(stored.plant.overdrive,true);
 const dest=createMocks();const result=restoreModuleProgress(dest.areas,stored);
 assert.equal(result.errors.length,0,JSON.stringify(result.errors));
 assert.deepEqual(captureModuleProgress(dest.areas),stored);
 assert.equal(dest.templeState.gate,true);assert.equal(dest.labState.gateOpen,true);
});
test('partially completed quests can resume without unlocking later steps',()=>{
 const src=createMocks();
 src.areas.get('temple').module.instance.interact({x:0});
 src.areas.get('lab').module.instance.interact({x:-57,z:-46});
 src.areas.get('lab').module.instance.interact({x:59,z:-46});
 src.areas.get('plant').module.instance.interact('02');
 const stored=captureModuleProgress(src.areas);
 const dest=createMocks();const report=restoreModuleProgress(dest.areas,stored);
 assert.equal(report.errors.length,0);assert.deepEqual(captureModuleProgress(dest.areas),stored);
 assert.equal(dest.labState.gateOpen,false);assert.equal(dest.templeState.gate,false);
});
test('restore is idempotent and never re-triggers completed terminals',()=>{
 const src=createMocks();src.areas.get('plant').module.instance.interact('01');
 const stored=captureModuleProgress(src.areas);const dest=createMocks();
 restoreModuleProgress(dest.areas,stored);
 const second=restoreModuleProgress(dest.areas,stored);
 assert.equal(second.errors.length,0);
 assert.ok(second.restored.every(x=>x.operations.length===0));
});
test('malformed and future-version saves are ignored safely',()=>{
 const dest=createMocks();
 for(const data of [null,[],{version:50,temple:{west:true}},{version:1,temple:'broken',lab:[],plant:null}]){
   assert.equal(restoreModuleProgress(dest.areas,data).errors.length,0);
 }
 const states=captureModuleProgress(dest.areas);
 assert.equal(states.temple.west,false);assert.equal(states.plant.overdrive,false);
});
test('unknown plant IDs and quality fields are ignored and not saved',()=>{
 const dest=createMocks();
 const report=restoreModuleProgress(dest.areas,{version:1,plant:{activeSectors:['01','hack','01'],overdrive:false,quality:'ultra'}});
 assert.equal(report.errors.length,0);
 assert.deepEqual(captureModuleProgress(dest.areas).plant,{activeSectors:['01'],overdrive:false});
});
test('future team update with native setState is preferred to replay',()=>{
 let calls=0;let live={west:false,east:false,heart:false,gate:false,archive:false};
 const area=new Map([['temple',{module:{instance:{getState:()=>live,setState(state){calls++;live={...state};return true;},interact(){throw new Error('must not replay');}}}}]]);
 const r=restoreModuleProgress(area,{version:1,temple:{west:true,east:false,heart:false,gate:false,archive:false}});
 assert.equal(calls,1);assert.equal(r.errors.length,0);assert.equal(live.west,true);
});
test('a malformed area does not prevent other areas from restoring',()=>{
 const dest=createMocks();
 const malformed={version:1,temple:{west:true,east:true,heart:true,gate:true,archive:true},lab:{tuning:2,gateOpen:true},plant:{activeSectors:['03'],overdrive:false}};
 const r=restoreModuleProgress(dest.areas,malformed);
 assert.equal(r.errors.length,1);
 assert.equal(r.errors[0].area,'lab');
 assert.equal(dest.templeState.gate,true);
 assert.deepEqual(dest.plant.getState().activeSectors,['03']);
});
