import test from 'node:test';
import assert from 'node:assert/strict';
import {createAetherModule} from '../integration/updates/2026-11-17/no18/aether-atmosphere.js';

class MockColor {
  constructor(value=0xffffff){this.value=value;}
  copy(v){this.value=v.value;return this;}
  lerp(v,alpha){this.value=`mix:${this.value}:${v.value}:${alpha}`;return this;}
  clone(){const c=new MockColor();c.value=this.value;return c;}
}
class MockVector2 {constructor(x=0,y=0){this.x=x;this.y=y;}set(x,y){this.x=x;this.y=y;return this;}}
class MockVector3 {
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
  copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this;}
  clone(){return new MockVector3(this.x,this.y,this.z);}
  normalize(){const d=Math.hypot(this.x,this.y,this.z)||1;this.x/=d;this.y/=d;this.z/=d;return this;}
}
class Object3D {
  constructor(){this.children=[];this.position=new MockVector3();this.rotation=new MockVector3();this.scale=new MockVector3(1,1,1);this.visible=true;this.matrix={};this.parent=null;}
  add(...parts){for(const p of parts){p.parent=this;this.children.push(p);}return this;}
  remove(p){this.children=this.children.filter(x=>x!==p);p.parent=null;}
  clear(){for(const p of this.children)p.parent=null;this.children=[];}
  updateWorldMatrix(){}
  worldToLocal(v){return v;}
  updateMatrix(){this.matrix={position:this.position.clone(),scale:this.scale.clone()};}
}
class Group extends Object3D{}
class Geometry {constructor(){this.attributes={};this.disposals=0;}setAttribute(k,v){this.attributes[k]=v;}setDrawRange(start,count){this.drawRange={start,count};}dispose(){this.disposals++;}}
class Material {constructor(args){Object.assign(this,args);this.disposals=0;}dispose(){this.disposals++;}}
class Mesh extends Object3D {constructor(geometry,material){super();this.geometry=geometry;this.material=material;}}
class InstancedMesh extends Mesh {constructor(g,m,count){super(g,m);this.count=count;this.instanceMatrix={needsUpdate:false,setUsage(){}};this.matrices=new Map();}setMatrixAt(i,m){this.matrices.set(i,m);}}
class Points extends Mesh {}
class Attribute {constructor(array,itemSize){this.array=array;this.itemSize=itemSize;this.needsUpdate=false;}}
const THREE={Group,ShaderMaterial:Material,InstancedMesh,Mesh,Points,Color:MockColor,
  Vector2:MockVector2,Vector3:MockVector3,Object3D,
  SphereGeometry:Geometry,PlaneGeometry:Geometry,IcosahedronGeometry:Geometry,BufferGeometry:Geometry,
  BufferAttribute:Attribute,InstancedBufferAttribute:Attribute,
  BackSide:1,DoubleSide:2,FrontSide:0,DynamicDrawUsage:35048};
function makeCamera(x=0,y=60,z=0){return {isCamera:true,position:new MockVector3(x,y,z),updateWorldMatrix(){},getWorldPosition(o){return o.copy(this.position);}};}
function setup(){const camera=makeCamera();const mod=createAetherModule(THREE,{camera,cloudSeaLevel:-25,quality:'lite'});return {mod,camera};}

test('required contract and legacy extras remain',()=>{
 const {mod}=setup();
 for(const name of ['update','setQuality','dispose','setWeather','setTimeOfDay','setAutoCycle','setCloudSeaLevel','setCloudSeaEnabled','setWindSpeed','getState','getLightingHint','getPerformanceBudget'])
   assert.equal(typeof mod[name],'function',name);
 assert.ok(mod.root instanceof Group);mod.dispose();
});
test('mode budgets are distinct and transition without reallocating geometry',()=>{
 const {mod,camera}=setup();
 let b=mod.getPerformanceBudget();assert.equal(b.activeRainParticles,320);assert.equal(b.cloudInstancesPerLayer,147);
 const names=mod.root.children.map(o=>o.name);
 mod.setQuality('high');mod.update(.03,{camera});b=mod.getPerformanceBudget();
 assert.equal(b.activeRainParticles,1120);assert.equal(b.cloudInstancesPerLayer,363);
 assert.equal(b.cloudInstancesTotal,726);
 assert.deepEqual(mod.root.children.map(o=>o.name),names);
 mod.setQuality('lite');mod.update(.1,{camera});assert.equal(mod.getPerformanceBudget().cloudInstancesTotal,294);
 mod.dispose();
});
test('camera movement within same cell does not rebuild cloud placement',()=>{
 const {mod,camera}=setup();let b=mod.getPerformanceBudget().cloudGridRebuilds;
 camera.position.set(115,125,112);mod.update(.10,{camera});
 assert.equal(mod.getPerformanceBudget().cloudGridRebuilds,b);
 camera.position.set(290,125,112);mod.update(.2,{camera});
 assert.equal(mod.getPerformanceBudget().cloudGridRebuilds,b+1);
 mod.dispose();
});
test('original six weather presets and invalid weather handling',()=>{
 const {mod,camera}=setup();
 for(const weather of ['clear','cloudy','mist','rain','storm','aurora']){
   assert.equal(mod.setWeather(weather,0),true);mod.update(.1,{camera});
   assert.equal(mod.getState().weather,weather);
 }
 assert.equal(mod.setWeather('hail'),false);assert.equal(mod.getState().weather,'aurora');mod.dispose();
});
test('time wrapping, continuous day cycle and context priority',()=>{
 const {mod,camera}=setup();
 mod.setTimeOfDay(25.5);assert.equal(mod.getState().timeOfDay,1.5);
 mod.setAutoCycle(true,60);mod.update(.1,{camera});assert.ok(mod.getState().timeOfDay>1.5);
 mod.update(.05,{camera,timeOfDay:8});assert.equal(mod.getState().timeOfDay,8);
 mod.dispose();
});
test('camera position is observed, not mutated',()=>{
 const {mod,camera}=setup();camera.position.set(130,143,-45);
 const before=camera.position.clone();mod.update(.2,{camera});
 assert.deepEqual(camera.position,before);mod.dispose();
});
test('world owner scene renderer fog and lighting remain untouched',()=>{
 const scene={fog:{density:.02},background:0x123456},renderer={pixelRatio:2},lighting={intensity:3};
 const {mod,camera}=setup();mod.update(.2,{camera,scene,renderer,lighting});
 assert.equal(scene.fog.density,.02);assert.equal(scene.background,0x123456);
 assert.equal(renderer.pixelRatio,2);assert.equal(lighting.intensity,3);mod.dispose();
});
test('hints are finite and returned by value',()=>{
 const {mod}=setup();const a=mod.getLightingHint(),b=mod.getLightingHint();
 assert.notStrictEqual(a.sunDirection,b.sunDirection);assert.notStrictEqual(a.suggestedFogColor,b.suggestedFogColor);
 assert.ok(Number.isFinite(a.suggestedFogDensity));assert.ok(a.suggestedSunIntensity>0);mod.dispose();
});
test('cloud sea world height and enable state',()=>{
 const {mod,camera}=setup();mod.setCloudSeaEnabled(false);
 assert.equal(mod.getState().cloudSeaEnabled,false);
 mod.setCloudSeaLevel(200);mod.update(.1,{camera});
 assert.equal(mod.getState().cloudSeaLevel,200);
 assert.equal(mod.getPerformanceBudget().cloudGridRebuilds,2);
 mod.setCloudSeaEnabled(true);assert.equal(mod.getState().cloudSeaEnabled,true);mod.dispose();
});
test('NaN/negative dt and unknown quality do not crash',()=>{
 const {mod,camera}=setup();mod.update(NaN,{camera});mod.update(-100,{camera});
 mod.setQuality('garbage');assert.equal(mod.getState().quality,'lite');mod.dispose();
});
test('dispose can be repeated and prevents future updates',()=>{
 const {mod,camera}=setup();const resources=mod.root.children.flatMap(o=>[o.geometry,o.material]).filter(Boolean);
 mod.dispose();mod.dispose();assert.equal(mod.root.children.length,0);
 for(const r of resources)assert.equal(r.disposals,1);
 const b=mod.getPerformanceBudget().atmosphereEvaluations;
 mod.update(.1,{camera});assert.equal(mod.getPerformanceBudget().atmosphereEvaluations,b);
});
