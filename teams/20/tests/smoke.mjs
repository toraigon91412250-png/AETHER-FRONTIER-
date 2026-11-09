import assert from 'node:assert/strict';
import { createAetherModule } from '../source/aether-interactions.js';
class Vec {
 constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this}
 setScalar(s){this.x=this.y=this.z=s;return this}
 copy(p){this.x=p.x;this.y=p.y;this.z=p.z;return this}
 clone(){return new Vec(this.x,this.y,this.z)}
 add(a){this.x+=a.x;this.y+=a.y;this.z+=a.z;return this}
 sub(a){this.x-=a.x;this.y-=a.y;this.z-=a.z;return this}
 multiplyScalar(s){this.x*=s;this.y*=s;this.z*=s;return this}
 addScaledVector(a,s){return this.add(a.clone().multiplyScalar(s))}
 length(){return Math.hypot(this.x,this.y,this.z)}
 normalize(){return this.multiplyScalar(1/(this.length()||1))}
 distanceTo(a){return this.clone().sub(a).length()}
 dot(a){return this.x*a.x+this.y*a.y+this.z*a.z}
 toArray(){return [this.x,this.y,this.z]}
}
class Obj {
 constructor(){this.children=[];this.position=new Vec();this.scale=new Vec(1,1,1);this.rotation={x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z;}};this.quaternion={copy(){return this}};this.userData={};this.parent=null;this.visible=true;this.matrix={};}
 add(...cs){for(const c of cs){this.children.push(c);c.parent=this;}return this}
 remove(c){this.children=this.children.filter(x=>x!==c);c.parent=null;}
 clear(){for(const c of this.children)c.parent=null;this.children=[];}
 updateWorldMatrix(){}
 updateMatrix(){}
 localToWorld(v){return v.add(this.position)}
 worldToLocal(v){return v.sub(this.position)}
}
class Mesh extends Obj {constructor(g,m){super();this.geometry=g;this.material=m;this.isMesh=true;}}
class InstancedMesh extends Mesh {constructor(g,m,n){super(g,m);this.count=n;this.instanceMatrix={needsUpdate:false};}setMatrixAt(){}}
class Mat {constructor(opts={}){Object.assign(this,opts)}dispose(){this.disposed=true}}
class Shape {moveTo(){}lineTo(){}closePath(){}}
class Quat {setFromUnitVectors(){return this}copy(){return this}}
class Ray {constructor(origin,dir){this.o=origin;this.d=dir;}distanceToPoint(p){const v=p.clone().sub(this.o);const along=Math.max(0,v.dot(this.d));return this.o.clone().addScaledVector(this.d,along).distanceTo(p)}}
class Geo {constructor(){this.type=this.constructor.name}dispose(){this.disposed=true}}
const GEO_NAMES=['BoxGeometry','CylinderGeometry','TorusGeometry','IcosahedronGeometry','SphereGeometry','ExtrudeGeometry','CircleGeometry'];
const mock={
 Vector3:Vec,Object3D:Obj,Group:Obj,Mesh,InstancedMesh,
 MeshStandardMaterial:Mat,MeshBasicMaterial:Mat,MeshPhysicalMaterial:Mat,ShaderMaterial:Mat,
 Shape,Quaternion:Quat,Ray,Color:class{constructor(c){this.c=c}},
 HemisphereLight:Obj,DirectionalLight:Obj,PointLight:Obj,
 AdditiveBlending:1,DoubleSide:2
};
for(const name of GEO_NAMES) mock[name]=class extends Geo {constructor(...args){super();this.type=name;this.args=args}};
const emitted=[];
const m=createAetherModule(mock,{quality:'low',onEvent:e=>emitted.push(e)});
assert.equal(m.root.name,'AF20_MeridianVault');
assert.equal(m.getInteractables().length,10);
assert.equal(m.getProgress().aligned,0);
assert.equal(m.getProgress().coreHeld,false);
assert.equal(m.getProgress().unlocked,false);
assert.equal(m.interact('gate_main').ok,false,'initial gate must stay locked');
assert.equal(m.getQuality(),'low');
assert.equal(m.getColliders().some(x=>x.id==='iris_closed'),true);
let t=m.findInteractable({origin:new Vec(-8.1,2.2,1),direction:new Vec(0,0,-1),playerPosition:new Vec(-8.1,0,1),maxPlayerDistance:4.3});
assert.equal(t?.id,'relay_azur');
assert.equal(m.isWalkable(0,0),true);
assert.equal(m.isWalkable(0,-23),true);
assert.equal(m.isWalkable(0,-40),true);
assert.equal(m.isWalkable(0,-30.5),false,'no walk path to overlook');
assert.equal(m.isPassageClear(0,-11.8,0,-12),false,'closed door blocks host movement');
assert.equal(m.isPassageClear(3.9,-11.8,3.9,-12),false,'cannot bypass door at the side');
assert.equal(m.interact('cell').type,'pickup');
assert.equal(m.getProgress().coreHeld,true);
assert.equal(m.interact('socket').type,'insert');
assert.equal(m.getProgress().coreDocked,true);
const targets={azur:2,ember:4,lumen:1};
for(const [key,goal] of Object.entries(targets)){
 for(let i=0;i<6;i++) {
  if(m.getState().relays[key]===goal)break;
  const action=m.interact('relay_'+key);
  assert.equal(action.ok,true);
 }
 assert.equal(m.getState().relays[key],goal);
}
assert.equal(m.getProgress().aligned,3);
assert.equal(m.getProgress().unlocked,true);
assert.equal(emitted.some(e=>e.type==='vault_unlocked'),true);
for(let i=0;i<140;i++) m.update(1/60,{});
assert.equal(m.getProgress().doorOpen>.88,true);
assert.equal(m.getColliders().some(x=>x.id==='iris_closed'),false);
assert.equal(m.isPassageClear(0,-11.8,0,-12),true);
const warp=m.interact('gate_main');
assert.equal(warp.type,'teleport');assert.equal(warp.position.z,-39.1);
assert.equal(m.interact('gate_return').position.z,9.5);
assert.equal(m.getProgress().transfers,2);
const saved=m.getState();
const restored=createAetherModule(mock,{includeStage:false,includeLights:false});
restored.setState(saved);assert.equal(restored.getProgress().unlocked,true);
restored.setQuality('high');restored.update(1/60);
assert.equal(restored.getQuality(),'high');
assert.equal(restored.interact('reset').ok,true);
assert.equal(restored.getProgress().unlocked,false);
assert.equal(restored.getProgress().aligned,0);
restored.dispose();m.dispose();
console.log('PASS: 34 checks + 3 relay cycles, stage collision, save/restore, events, gate transfer, quality, dispose.');
