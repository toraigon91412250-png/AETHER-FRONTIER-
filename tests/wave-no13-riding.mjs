import {createAetherModule} from '../integration/updates/2026-11-17/no13/aether-dragon.js';
import {createAetherRidingModule} from '../integration/updates/2026-11-17/no13/aether-riding.js';
import assert from 'node:assert/strict';
let geoDisposed=0, matDisposed=0;
class Vector3 {
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
  clone(){return new Vector3(this.x,this.y,this.z)}
  copy(v){return this.set(v.x,v.y,v.z)}
  add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this;}
  sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this;}
  multiplyScalar(n){this.x*=n;this.y*=n;this.z*=n;return this;}
  normalize(){const l=Math.hypot(this.x,this.y,this.z);return l?this.multiplyScalar(1/l):this;}
  length(){return Math.hypot(this.x,this.y,this.z);}
  toArray(){return [this.x,this.y,this.z]}
  setScalar(n){return this.set(n,n,n)}
  applyEuler(e){const x=this.x,y=this.y,z=this.z;const cx=Math.cos(e.x),sx=Math.sin(e.x);const nx=x,ny=y*cx-z*sx,nz=y*sx+z*cx;const cy=Math.cos(e.y),sy=Math.sin(e.y);this.x=nx*cy+nz*sy;this.y=ny;this.z=-nx*sy+nz*cy;return this;}
}
class Quat{setFromUnitVectors(){return this;}}
class Euler{constructor(){this.x=0;this.y=0;this.z=0;this.order='XYZ';}set(x,y,z){this.x=x;this.y=y;this.z=z;return this}}
class Obj{
 constructor(){this.position=new Vector3();this.scale=new Vector3(1,1,1);this.rotation=new Euler();this.quaternion=new Quat();this.children=[];this.visible=true;this.name='';this.userData={};}
 add(c){c.parent=this;this.children.push(c)}
 traverse(fn){fn(this);for(const c of this.children)c.traverse(fn)}
 removeFromParent(){if(this.parent){this.parent.children.splice(this.parent.children.indexOf(this),1);this.parent=null;}}
 getObjectByName(name){if(this.name===name)return this;for(const c of this.children){const found=c.getObjectByName(name);if(found)return found;}return null;}
 getWorldPosition(out){out.set(0,0,0);let n=this;while(n){out.add(n.position);n=n.parent;}return out;}
 getWorldQuaternion(out){return out;}
 updateMatrix(){this.matrix={}}
}
class G{constructor(){}setAttribute(){}setIndex(){}computeVertexNormals(){}dispose(){geoDisposed++}}
class M{constructor(o){Object.assign(this,o)}dispose(){matDisposed++}}
class Mesh extends Obj{constructor(g,m){super();this.geometry=g;this.material=m;this.isMesh=true;}}
class InstancedMesh extends Mesh{constructor(g,m,c){super(g,m);this.isInstancedMesh=true;this.count=c;this.instanceMatrix={needsUpdate:false};}setMatrixAt(){}dispose(){}}
class Color{constructor(hex){this.r=.4;this.g=.7;this.b=.9;}clone(){return new Color()}lerp(){return this}}
const THREE={Vector3,Quaternion:Quat,Group:Obj,Mesh,InstancedMesh,MeshStandardMaterial:M,Color,
 SphereGeometry:G,OctahedronGeometry:G,TetrahedronGeometry:G,BoxGeometry:G,CylinderGeometry:G,TorusGeometry:G,IcosahedronGeometry:G,BufferGeometry:G,Float32BufferAttribute:G,Object3D:Obj,DoubleSide:2};
const dragon=createAetherModule(THREE,{quality:'low'});
const events=[];
const ride=createAetherRidingModule(THREE,dragon,{quality:'low',showPreviewRider:true});
ride.onEvent(e=>events.push(e.type));
const frame=(n,ctx)=>{for(let i=0;i<n;i++)ride.update(1/60,ctx||{});};
assert.equal(ride.getState().state,'locked');assert.equal(ride.mount(),false);
assert.equal(ride.getMountWorldPosition().y,12.25);
assert.equal(ride.setCombatPhase('roar'),true);frame(50);assert.equal(dragon.phase,'roar');
assert.equal(ride.unlock(),true);assert.equal(ride.mount(),true);frame(110);
assert.equal(ride.getState().state,'ready');assert.equal(ride.takeoff(),true);frame(155);
assert.equal(ride.getState().state,'flying');assert.ok(dragon.root.position.y>=14);
ride.setInput({forward:1,turn:.8,climb:1,boost:true});const lastZ=dragon.root.position.z;
frame(120);assert.ok(ride.getState().speed>20);assert.ok(dragon.root.position.y>15);assert.ok(dragon.root.position.z!==lastZ);
assert.ok(Math.abs(dragon.anchors.wingLeft.rotation.z)>0.001);
assert.equal(ride.setCombatPhase('breath'),false);assert.equal(dragon.phase,'flight');
const riderPos=ride.getRiderWorldPose();assert.ok(riderPos.position.y>ride.getState().altitude);
assert.equal(ride.land(),true);ride.setInput({});for(let i=0;i<1800&&ride.getState().state==='landing';i++)ride.update(1/60);
assert.equal(ride.getState().state,'ready');assert.equal(ride.dismount(),true);frame(100);
assert.equal(ride.getState().state,'grounded');assert.ok(events.includes('mountComplete')&&events.includes('takeoffComplete')&&events.includes('landingComplete')&&events.includes('dismountComplete'));
assert.equal(ride.setCombatPhase('charge'),true);frame(10);assert.equal(dragon.phase,'charge');
assert.equal(ride.setQuality('high'),'high');assert.equal(dragon.quality,'high');
ride.dispose();ride.dispose();assert.ok(geoDisposed>0);assert.equal(dragon.root.children.some(x=>x.name==='AF13_RiderEquipment'),false);
assert.equal(dragon.metadata.version,'1.0.0'); // Original model remains intact!
dragon.dispose();
console.log(JSON.stringify({pass:true,events,finalBossPhase:'charge',dragonVersion:dragon.metadata.version,geometryDisposals:geoDisposed,materialDisposals:matDisposed}));
