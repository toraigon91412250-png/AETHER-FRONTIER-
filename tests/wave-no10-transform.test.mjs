import test from 'node:test';
import assert from 'node:assert/strict';
import { createAetherModule } from '../integration/updates/2026-11-17/no10/aether_no10_robot.js';

// Headless structural fixture, not a substitute for GPU/WebGL rendering.
class Vec3 {
  constructor(x=0,y=0,z=0){this.set(x,y,z)}
  set(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;return this}
  setScalar(n){this.set(n,n,n);return this}
  clone(){return new Vec3(this.x,this.y,this.z)}
  add(a){this.x+=a.x;this.y+=a.y;this.z+=a.z;return this}
  sub(a){this.x-=a.x;this.y-=a.y;this.z-=a.z;return this}
  multiplyScalar(n){this.x*=n;this.y*=n;this.z*=n;return this}
  length(){return Math.hypot(this.x,this.y,this.z)}
  normalize(){const n=this.length()||1;return this.multiplyScalar(1/n)}
  toArray(){return [this.x,this.y,this.z]}
}
class Obj {
  constructor(){this.name='';this.position=new Vec3();this.rotation=new Vec3();this.scale=new Vec3(1,1,1);this.quaternion={setFromUnitVectors(){}};this.children=[];this.parent=null;this.visible=true;this.userData={}}
  add(o){if(o.parent)o.parent.remove(o);o.parent=this;this.children.push(o);return this}
  remove(o){const i=this.children.indexOf(o);if(i>=0)this.children.splice(i,1);o.parent=null;return this}
  clear(){for(const c of this.children)c.parent=null;this.children=[]}
  traverse(f){f(this);for(const c of this.children)c.traverse(f)}
}
class Geometry {
  constructor(...args){this.args=args;this.disposed=false}
  translate(){return this}
  computeVertexNormals(){return this}
  dispose(){this.disposed=true}
}
class Mat {
  constructor(data){Object.assign(this,data);this.disposed=false}
  dispose(){this.disposed=true}
}
class Shape {moveTo(){} lineTo(){} quadraticCurveTo(){} closePath(){}}
class Mesh extends Obj {constructor(geometry,material){super();this.geometry=geometry;this.material=material;this.isMesh=true}}
const THREE={Group:class extends Obj{},Mesh,MeshStandardMaterial:Mat,Shape,Vector3:Vec3};
for(const name of ['ExtrudeGeometry','CylinderGeometry','SphereGeometry','TorusGeometry','BoxGeometry','ConeGeometry','IcosahedronGeometry'])THREE[name]=class extends Geometry {};
function create(opts={}){return createAetherModule(THREE,opts)}
function named(root,name){let found;root.traverse(o=>{if(o.name===name)found=o});assert.ok(found,'Expected node '+name);return found}
function meshCount(root,visibleOnly=true){let n=0;root.traverse(o=>{if(o.isMesh&&(!visibleOnly||o.visible))n++});return n}
const move=(m,n,context)=>{for(let i=0;i<n;i++)m.update(.05,context)};

test('legacy contract, anchor isolation, form/quality and stable hierarchy',()=>{
  const m=create();
  for(const n of ['root','update','setQuality','dispose','transformTo','setTransformProgress','setMotion','getState'])assert.ok(n in m);
  assert.equal(m.root.userData.moduleId,'AF-No10');
  const firstCount=meshCount(m.root);
  assert.ok(firstCount>240);
  assert.equal(m.setQuality('lite'),'lite');
  const liteCount=meshCount(m.root);
  assert.ok(liteCount<firstCount);
  assert.equal(firstCount,255);
  assert.equal(liteCount,195);
  assert.equal(m.setQuality('high'),'high');
  assert.equal(meshCount(m.root),firstCount);
  m.root.position.set(40,8,-20);m.root.rotation.set(0,.3,0);
  m.setMotion('walk');m.update(.05);
  assert.deepEqual(m.root.position.toArray(),[40,8,-20]);
  assert.deepEqual([m.root.rotation.x,m.root.rotation.y,m.root.rotation.z],[0,.3,0]);
  const coords={x:m.root.position.x,z:m.root.position.z};m.transformTo('flight',2.8);move(m,80);
  assert.equal(m.getState().form,'flight');assert.equal(m.getState().progress,1);
  assert.equal(m.root.position.x,coords.x);assert.equal(m.root.position.z,coords.z);
  m.dispose();m.dispose();assert.equal(m.root.children.length,0);
});

test('pause / restart from EXACT progress, no jump; reverse without joint discontinuity',()=>{
 const m=create();m.transformTo('flight',2.8);move(m,23);
 const p=m.getState().progress;assert.ok(p>.3&&p<.6);
 const wing=named(m.root,'Port wing unfolding');const r0=wing.rotation.z;
 m.pauseTransform();move(m,50);assert.equal(m.getState().progress,p);
 assert.equal(wing.rotation.z,r0);assert.equal(m.getState().paused,true);
 m.resumeTransform();m.update(.05);
 assert.ok(m.getState().progress>p);
 const beforeReverse=m.getState().progress;
 m.transformTo('robot',1.5);m.update(.05);
 assert.ok(m.getState().progress<beforeReverse);
 move(m,90);assert.equal(m.getState().form,'robot');m.dispose();
});

test('scrub then resume remembers last requested flight form',()=>{
 const m=create();m.transformTo('flight',4);move(m,25);m.setTransformProgress(.47);
 assert.equal(m.getState().progress,.47);assert.equal(m.getState().target,.47);assert.equal(m.getState().paused,true);
 const pose=named(m.root,'Port wing unfolding').rotation.z;
 move(m,30);assert.equal(m.getState().progress,.47);assert.equal(named(m.root,'Port wing unfolding').rotation.z,pose);
 m.resumeTransform();move(m,120);assert.equal(m.getState().form,'flight');m.dispose();
});

test('staged wing root / panel geometry is symmetric and finite across range',()=>{
 const m=create();
 const port=named(m.root,'Port wing unfolding'),starboard=named(m.root,'Starboard wing unfolding');
 const portCover=named(m.root,'Wing-root sliding fairing');
 const snapshots=[];
 for(let i=0;i<=100;i++){
  m.setTransformProgress(i/100);
  m.update(0);
  for(const node of [port,starboard,portCover]){
    for(const v of [node.position.x,node.position.y,node.position.z,node.rotation.x,node.rotation.y,node.rotation.z])assert.ok(Number.isFinite(v));
  }
  assert.ok(Math.abs(port.position.x+starboard.position.x)<1e-8);
  snapshots.push(port.position.x);
 }
 // Port wing is negative X, rail extends OUTWARD monotonically.
 for(let i=1;i<snapshots.length;i++)assert.ok(snapshots[i]<=snapshots[i-1]+1e-10);
 assert.ok(snapshots[0]>snapshots.at(-1));
 m.dispose();
});

test('forward context, external progress, thrust and independent simultaneous instances',()=>{
 const a=create({quality:'lite'}),b=create({quality:'high',initialForm:'flight'});
 a.update(.05,{transformTo:'flight',motion:'thrust'});
 assert.equal(a.getState().target,1);assert.equal(a.getState().motion,'thrust');
 a.update(.05,{transformProgress:.32});assert.equal(a.getState().progress,.32);
 assert.equal(b.getState().form,'flight');
 b.setMotion('thrust');b.update(.05);
 const exhaust=named(b.root,'Retractable ion stream');
 assert.ok(exhaust.scale.z>.08);
 assert.equal(a.getState().quality,'lite');assert.equal(b.getState().quality,'high');
 a.dispose();assert.equal(b.getState().form,'flight');
 b.dispose();
});

test('frame stepping ignores invalid progress/delta and clamps large deltas',()=>{
 const m=create();m.transformTo('flight',.5);m.setTransformProgress(Number.NaN);
 assert.equal(m.getState().progress,0);
 m.update(Infinity);assert.equal(m.getState().progress,0);
 m.update(100);assert.ok(m.getState().progress<=.200001);
 m.dispose();
});

test('direction switches never snap joints on the same progress frame',()=>{
 const m=create();m.transformTo('flight',2);move(m,24);
 const wing=named(m.root,'Port wing unfolding');
 const chassis=named(m.root,'TRANSFORM / main chassis');
 const before=[wing.rotation.z,wing.position.x,chassis.rotation.x,m.getState().progress];
 m.transformTo('robot',2);m.update(0);
 const after=[wing.rotation.z,wing.position.x,chassis.rotation.x,m.getState().progress];
 assert.deepEqual(after,before);
 m.update(.05);assert.ok(m.getState().progress<before[3]);
 m.dispose();
});
