'use strict';
const assert = require('node:assert/strict');
let now = 0;
global.performance = { now: () => now };
class V3 {
  constructor(x=0,y=0,z=0){this.set(x,y,z);}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
  copy(v){return this.set(v.x,v.y,v.z);}
  distanceTo(v){return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z);}
}
class Group {
  constructor(){this.visible=true;this.position=new V3();this.children=[];}
  add(o){this.children.push(o);}
  getWorldPosition(out){return out.copy(this.position);}
  updateWorldMatrix(){}
  clear(){this.children=[];}
}
const THREE={Group, Vector3:V3};
const {createAetherModule}=require('./aether-performance.js');
let dpr=2;
const renderer={getPixelRatio(){return dpr;},setPixelRatio(v){dpr=v;},info:{render:{calls:700,triangles:12345},memory:{geometries:14,textures:7}}};
const camera=new Group();camera.position.set(0,0,20);
const perf=createAetherModule(THREE,{renderer,camera,quality:'lite',adaptive:true,managePixelRatio:true});
assert.equal(perf.root instanceof Group,true);
assert.equal(dpr,1.35);
assert.equal(perf.getMetrics().targetFPS,60);
let lastDetail=null, qualityCalls=[];
const unClient=perf.registerClient('fixture',{
  setQuality(mode){qualityCalls.push(mode);},
  setDetail(detail){lastDetail=detail;}
});
assert.deepEqual(qualityCalls,['lite']);
assert.equal(lastDetail,0.76);
const levels=[0,1,2].map(()=>new Group());
const anchor=new Group();
const unLOD=perf.registerLOD({id:'fixture-lod',anchor,levels:[
  {object:levels[0],maxDistance:30},
  {object:levels[1],maxDistance:90},
  {object:levels[2],maxDistance:Infinity}
]});
assert.deepEqual(levels.map(o=>o.visible),[true,false,false]);
camera.position.set(0,0,65);
for(let i=0;i<4;i++){now+=16;perf.update(0.016,{renderer,camera});}
assert.deepEqual(levels.map(o=>o.visible),[false,true,false]);
perf.beginFrame();now+=5;perf.endFrame();
assert.equal(perf.getMetrics().renderCpuMs,5);
assert.equal(perf.getMetrics().drawCalls,700);
assert.equal(perf.getMetrics().triangles,12345);
for(let i=0;i<170;i++){now+=34;perf.update(0.034,{renderer,camera});}
assert.ok(perf.getMetrics().fps<40,'slow-frame samples registered');
assert.ok(perf.getMetrics().detail<0.76,'draw-call-bound scene decreases detail');
const lowered=perf.getMetrics().detail;
assert.ok(lowered>=0.30);
perf.setAdaptive(false);
assert.equal(perf.getMetrics().detail,0.76);
perf.setQuality('high');
assert.equal(dpr,2);
assert.equal(perf.getMetrics().targetFPS,50);
assert.deepEqual(qualityCalls,['lite','high']);
assert.equal(lastDetail,1.0);
assert.equal(perf.getMetrics().registeredLODs,1);
assert.equal(perf.getMetrics().registeredClients,1);
assert.throws(()=>perf.registerLOD({levels:[{object:new Group(),maxDistance:20},{object:new Group(),maxDistance:40}]}),/Infinity/);
unLOD();
assert.deepEqual(levels.map(o=>o.visible),[true,true,true],'LOD unregister restores visibility');
unClient();
perf.dispose();
assert.equal(dpr,2,'renderer original DPR restored on disposal');
perf.dispose(); // idempotent
console.log('PASS: create, mode, adaptive, DPR, stats, render timing, LOD, registration, cleanup');
