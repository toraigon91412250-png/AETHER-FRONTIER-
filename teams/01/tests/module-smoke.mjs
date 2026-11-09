/** Pure API smoke test with a lightweight Three.js shape mock. Does not verify WebGL rendering. */
import { createAetherModule } from '../src/aether-module.js';
import assert from 'node:assert/strict';
class V3 {
  constructor(x=0,y=0,z=0){this.set(x,y,z)}
  set(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;return this}
  clone(){return new V3(this.x,this.y,this.z)}
  sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this}
  add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this}
  multiplyScalar(s){this.x*=s;this.y*=s;this.z*=s;return this}
  length(){return Math.hypot(this.x,this.y,this.z)}
  normalize(){return this.multiplyScalar(1/(this.length()||1))}
  copy(v){return this.set(v.x,v.y,v.z)}
  setScalar(s){this.set(s,s,s);return this}
}
let uuidCounter=0;
class M4 {copy(){return this}invert(){return this}multiplyMatrices(){return this}}
class Obj {
  constructor(){this.children=[];this.position=new V3();this.rotation=new V3();this.scale=new V3(1,1,1);this.quaternion={setFromUnitVectors(){}};this.userData={};this.matrixWorld=new M4();this.isMesh=false;this.instanceMatrix={needsUpdate:false};}
  add(o){this.children.push(o);o.parent=this}
  remove(o){this.children=this.children.filter(x=>x!==o);o.parent=null}
  traverse(fn){fn(this);for(const c of this.children)c.traverse(fn)}
  clear(){this.children=[]}
  updateMatrix(){this.matrix=new M4()}
  updateMatrixWorld(){this.traverse(x=>{x.matrixWorld=new M4()})}
}
class Mesh extends Obj {constructor(g,m){super();this.geometry=g;this.material=m;this.isMesh=true;}}
class InstancedMesh extends Mesh {constructor(g,m,count){super(g,m);this.count=count;this.isInstancedMesh=true;}setMatrixAt(){}setColorAt(){}}
class Group extends Obj {}
class Geometry {constructor(){this.attributes={};this.uuid='g-'+(++uuidCounter)}dispose(){}setAttribute(k,v){this.attributes[k]=v}}
class BufferGeometry extends Geometry {}
class Material {constructor(p){Object.assign(this,p);this.uuid='m-'+(++uuidCounter)}dispose(){}}
class Color {constructor(hex){this.hex=hex;this.r=0;this.g=0;this.b=0}clone(){return new Color(this.hex)}lerp(){return this}}
const THREE={Group,Mesh,InstancedMesh,Points:Mesh,Object3D:Obj,Vector3:V3,Color,
  Matrix4:M4,MeshStandardMaterial:Material,MeshBasicMaterial:Material,PointsMaterial:Material,
  BoxGeometry:Geometry,CylinderGeometry:Geometry,TorusGeometry:Geometry,OctahedronGeometry:Geometry,
  TubeGeometry:Geometry,PlaneGeometry:Geometry,BufferGeometry,BufferAttribute:class {constructor(){}},
  CatmullRomCurve3:class {constructor(){}},DoubleSide:2,AdditiveBlending:2,RepeatWrapping:1,SRGBColorSpace:'srgb'};
const af=createAetherModule(THREE,{quality:'lite'});
for(const k of ['root','update','setQuality','dispose','getFloorHeight','resolveHorizontal','getNearbyInteraction','interact','getState','getPointsOfInterest']) assert.ok(af[k]);
assert.equal(af.getState().quality,'lite');
assert.equal(af.getFloorHeight(18,0,64.16),64.16);
assert.equal(af.getFloorHeight(45,0,64.16),.42);
assert.ok(af.resolveHorizontal(0,0,1,0,.42).x>=22);
assert.ok(af.getPointsOfInterest().length>=12);
assert.equal(af.getNearbyInteraction({x:0,y:.42,z:81})?.id,'ley-01');
assert.equal(af.interact('ley-01').activated,1);
assert.equal(af.interact('ley-02').activated,2);
assert.equal(af.interact('ley-03').activated,3);
assert.equal(af.getState().awakened,true);
assert.equal(af.interact('ley-03').changed,false);
assert.equal(af.interact('lift-up').warpTo.y,64.16);
assert.equal(af.interact('lift-down').warpTo.y,.42);
assert.equal(af.setQuality('high'),'high');
assert.equal(af.setQuality('lite'),'lite');
for(let i=0;i<400;i++)af.update(1/60,{playerPosition:{x:5,y:.42,z:82}});
assert.equal(af.getState().activated,3);
let n=0;af.root.traverse(()=>n++);
assert.ok(n>150,`scene object count unexpectedly low: ${n}`);
af.dispose();
assert.equal(af.root.children.length,0);
console.log('PASS: module factory, interaction, traversal, quality, elevator, collision, dispose');
console.log(`Scene object nodes: ${n}; landmarks: ${af.getPointsOfInterest().length}`);
