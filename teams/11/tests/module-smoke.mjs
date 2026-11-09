/** Runtime API smoke test without network or WebGL (Three namespace mock). */
import { strict as assert } from 'node:assert';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

class Vector3 {
  constructor(x=0,y=0,z=0){this.set(x,y,z)}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this}
  setScalar(s){return this.set(s,s,s)}
  copy(v){return this.set(v.x,v.y,v.z)}
  clone(){return new Vector3(this.x,this.y,this.z)}
  add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this}
  sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this}
  multiplyScalar(s){this.x*=s;this.y*=s;this.z*=s;return this}
  divideScalar(s){return this.multiplyScalar(1/s)}
  addScaledVector(v,s){return this.add(v.clone().multiplyScalar(s))}
  lerp(v,s){this.x+=(v.x-this.x)*s;this.y+=(v.y-this.y)*s;this.z+=(v.z-this.z)*s;return this}
  lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}
  length(){return Math.sqrt(this.lengthSq())}
  normalize(){return this.divideScalar(this.length()||1)}
}
class Object3D {
  constructor(){this.position=new Vector3;this.rotation=new Vector3;this.scale=new Vector3(1,1,1);this.children=[];this.userData={};this.visible=true;this.parent=null;this.matrix={}}
  add(o){this.children.push(o);o.parent=this;return this}
  remove(o){this.children=this.children.filter(x=>x!==o);o.parent=null}
  traverse(f){f(this);for(const c of this.children)c.traverse(f)}
  clear(){for(const c of this.children)c.parent=null;this.children=[]}
  updateMatrix(){}
}
class Mesh extends Object3D{constructor(geometry,material){super();this.geometry=geometry;this.material=material}}
class LineSegments extends Mesh{}
class InstancedMesh extends Mesh{constructor(g,m,n){super(g,m);this.instanceMatrix={needsUpdate:false};this.n=n;this.instances=[]}setMatrixAt(i,m){this.instances[i]=m}}
class Geo{constructor(...params){this.params=params;this.disposed=false}dispose(){this.disposed=true}setAttribute(){}setDrawRange(){}}
class Mat{constructor(params={}){Object.assign(this,params);this.color=new Color();this.emissive=new Color();this.disposed=false}dispose(){this.disposed=true}}
class Color{setHex(n){this.value=n;return this}}
class Shape{moveTo(){}lineTo(){}closePath(){}}
const geometryNames=['CylinderGeometry','SphereGeometry','TorusGeometry','DodecahedronGeometry','ConeGeometry','ExtrudeGeometry','OctahedronGeometry','IcosahedronGeometry','BoxGeometry','TubeGeometry','BufferGeometry'];
const THREE = {Vector3,Object3D,Group:Object3D,Mesh,LineSegments,InstancedMesh,Shape,
  MeshStandardMaterial:Mat,MeshBasicMaterial:Mat,LineBasicMaterial:Mat,
  PointLight:class extends Object3D{constructor(c,intensity,dist,decay){super();this.color=new Color;this.intensity=intensity}},
  Float32BufferAttribute:class {}, DoubleSide:2, AdditiveBlending:1,
  CatmullRomCurve3:class{constructor(points){this.points=points}}};
for(const name of geometryNames)THREE[name]=Geo;

const root=path.resolve('src');
const {createAetherModule,AETHER_DRONE_INFO}=await import(pathToFileURL(path.join(root,'aether-drone.js')));
const {createDronePilot}=await import(pathToFileURL(path.join(root,'drone-pilot.js')));
assert.equal(AETHER_DRONE_INFO.threeVersion,'0.160.0');
const module=createAetherModule(THREE,{mode:'friendly',quality:'high'});
assert.ok(module.root);
assert.equal(module.root.userData.aetherModule.localForward,'-Z');
assert.equal(module.getState().quality,'high');
let total=0;
module.root.traverse(()=>total++);
assert.ok(total>70,`Model likely incomplete: ${total} object nodes`);
const pilot=createDronePilot(THREE,{root:module.root,autopilot:true});
for(let i=0;i<450;i++){
  const r=pilot.update(1/60);
  module.update(1/60,{velocity:r.velocity,targetLocal:{x:.1,y:-.1}});
}
assert.ok(module.root.position.y>1.0);
assert.ok(module.getState().elapsed>7);
module.triggerScan();
module.update(.016,{});
assert.equal(module.getState().scanActive,true);
for(let i=0;i<100;i++)module.update(.016,{});
assert.equal(module.getState().scanActive,false);
module.setMode('hostile');
for(let i=0;i<80;i++)module.update(1/60,{mode:'hostile'});
assert.equal(module.getState().mode,'hostile');
assert.ok(module.getState().deployment>.8);
module.setQuality('low');
assert.equal(module.getState().quality,'low');
module.setDeployment(0);
for(let i=0;i<100;i++)module.update(1/60,{});
assert.ok(module.getState().deployment<.1);
pilot.setAutopilot(false);
for(let i=0;i<120;i++){
  const r=pilot.update(1/60,{x:1,y:0,z:-1,boost:true});
  module.update(1/60,{velocity:r.velocity});
}
assert.ok(Number.isFinite(pilot.speed));
assert.ok(Math.abs(module.root.position.x)<=5);
module.dispose();
pilot.dispose();
assert.equal(module.getState().disposed,true);
assert.equal(module.root.children.length,0);
module.update(1/60,{});
console.log(`PASS No.11 module API smoke test: ${total} nodes, 450 flight frames, manual control, 3 roles, quality switching, scan, geometry dispose.`);
