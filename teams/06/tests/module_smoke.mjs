// Lightweight API simulation to exercise the module factory without browser/network/WebGL.
import { createAetherModule } from '../src/aether_plant.js';
import assert from 'node:assert/strict';
class Vec {
 constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;this.isVector3=true;}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
 copy(v){return this.set(v.x,v.y,v.z)}
 clone(){return new Vec(this.x,this.y,this.z)}
 sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this}
 add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this}
 multiplyScalar(n){this.x*=n;this.y*=n;this.z*=n;return this}
 length(){return Math.hypot(this.x,this.y,this.z)}
 normalize(){let l=this.length()||1;return this.multiplyScalar(1/l)}
}
class Euler{constructor(){this.x=0;this.y=0;this.z=0}set(x,y,z){this.x=x;this.y=y;this.z=z}}
class Obj {
 constructor(){this.position=new Vec();this.rotation=new Euler();this.scale=new Vec(1,1,1);this.quaternion={setFromUnitVectors:()=>{}};this.matrix={clone(){return {};}};this.userData={};this.children=[];this.visible=true}
 add(...things){this.children.push(...things);return this}
 updateMatrix(){}
 updateWorldMatrix(){}
 worldToLocal(v){return v}
 removeFromParent(){}
 clear(){this.children=[]}
}
class Mat{constructor(o={}){Object.assign(this,o);this.color={setHex(){}}}dispose(){}}
class Geo{constructor(){this.attributes={};}dispose(){}setAttribute(name,a){this.attributes[name]=a}}
class Mesh extends Obj {constructor(geometry,material){super();this.geometry=geometry;this.material=material}}
class InstancedMesh extends Mesh {constructor(g,m,n){super(g,m);this.count=n;this.instanceMatrix={needsUpdate:false}}setMatrixAt(){}}
class PtLight extends Obj {constructor(c,intensity){super();this.intensity=intensity}}
class BufAttr {constructor(a,n){this.array=a;this.itemSize=n;this.needsUpdate=false}}
const THREE={Group:Obj,Mesh,InstancedMesh,Points:Mesh,Object3D:Obj,Vector3:Vec,
 MeshBasicMaterial:Mat,MeshStandardMaterial:Mat,PointsMaterial:Mat,PointLight:PtLight,
 BoxGeometry:Geo,CylinderGeometry:Geo,IcosahedronGeometry:Geo,TorusGeometry:Geo,PlaneGeometry:Geo,
 BufferGeometry:Geo,BufferAttribute:BufAttr,DoubleSide:2,AdditiveBlending:4,
 SRGBColorSpace:'srgb',Color:class{constructor(v){this.value=v}}
};
let events=[];
const a=createAetherModule(THREE,{quality:'high',onEvent:e=>events.push(e)});
assert.equal(a.root.name,'AF06_AETHER_FOUNDRY');
assert.equal(a.getState().quality,'high');
assert(a.root.children.length>=3);
for(let i=0;i<120;i++) a.update(1/60,{timeScale:1});
assert.equal(a.getState().activeCount,0);
assert.equal(a.interact('FINAL').ok,false);
for(const id of ['01','02','03']) assert.equal(a.interact(id).ok,true);
assert.equal(a.getState().activeCount,3);
assert.equal(a.interact('FINAL').ok,true);
assert.equal(a.getState().overdrive,true);
assert.equal(events.length,4);
assert.equal(a.navigation.sampleGround(-36,-26,10),10);
assert(a.navigation.sampleGround(-36,2,5)>4);
assert.equal(a.navigation.sampleGround(0,0,0),0);
assert.equal(a.navigation.collides(0,-9,.5,0),true);
assert.equal(a.navigation.collides(0,42,.5,0),false);
assert.equal(a.navigation.collides(0,-9,.5,10),false);
assert.equal(a.getNearestInteraction(new Vec(6,1,34),4.2).id,'03');
assert.equal(a.getNearestInteraction(new Vec(0,11,29),4.2).id,'FINAL');
assert.equal(a.setQuality('low'),'low');
a.update(.05);
a.dispose();
console.log('PASS: scene factory, animations, navigation, controls, quality, disposal');
