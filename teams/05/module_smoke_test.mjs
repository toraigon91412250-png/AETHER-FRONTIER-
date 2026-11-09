import {createAetherModule} from './aether_no05_lab.js';
import assert from 'node:assert/strict';
class V3 {constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;} set(x,y,z){this.x=x;this.y=y;this.z=z;return this;} clone(){return new V3(this.x,this.y,this.z);}}
class O3 {constructor(){this.children=[];this.position=new V3();this.rotation={x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z;}};this.scale={x:1,y:1,z:1,set(x,y,z){this.x=x;this.y=y;this.z=z;},setScalar(v){this.x=this.y=this.z=v;}};}add(...xs){this.children.push(...xs);}remove(x){this.children=this.children.filter(y=>y!==x);}updateMatrix(){this.matrix={clone(){return {...this};}};}traverse(f){f(this);for(const o of this.children)o.traverse(f);}clear(){this.children=[];}}
class G extends O3 {}
class Mesh extends O3 {constructor(geometry,material){super();this.geometry=geometry;this.material=material;this.isMesh=true;}}
class InstancedMesh extends Mesh{constructor(geo,mat,count){super(geo,mat);this.count=count;this.instanceMatrix={};}setMatrixAt(){}computeBoundingSphere(){}}
class Geo {dispose(){this.wasDisposed=true;}}
class Mat {constructor(o){Object.assign(this,o);}dispose(){this.wasDisposed=true;}}
class Texture {dispose(){this.wasDisposed=true;}}
const THREE={Group:G,Mesh,InstancedMesh,Vector3:V3,BoxGeometry:Geo,CylinderGeometry:Geo,TorusGeometry:Geo,IcosahedronGeometry:Geo,MeshStandardMaterial:Mat,MeshBasicMaterial:Mat,CanvasTexture:Texture,DoubleSide:2,SRGBColorSpace:'srgb'};
const events=[];
const stage=createAetherModule(THREE,{quality:'low',onEvent:e=>events.push(e)});
const pos=(x,z)=>new V3(x,1.7,z), go=(x,z)=>stage.interact(pos(x,z));
assert.equal(stage.root.name,'AF_No05_ERIDIAN_Underground_Research');
let meshCount=0,geoCount=new Set(),materialCount=new Set();stage.root.traverse(o=>{if(o.isMesh){meshCount++;geoCount.add(o.geometry);materialCount.add(o.material);}});console.log('Mesh count',meshCount,'unique geometry',geoCount.size,'unique material',materialCount.size);
assert.equal(stage.getQuality(),'low');
assert.ok(stage.isWalkable(0,20));
assert.equal(stage.isWalkable(0,-37.5),false,'hub center monolith is solid');
assert.ok(stage.isWalkable(-61,-35));
assert.ok(stage.isWalkable(65,-35));
assert.ok(stage.isWalkable(0,-93));
assert.equal(stage.isWalkable(0,-113),false,'gate initially sealed');
assert.equal(go(-57,-25).ok,true);assert.equal(stage.getState().cooling,false,'valve B fails before A');
go(-57,-46);go(-57,-25);assert.equal(stage.getState().cooling,true);
go(59,-26);assert.equal(stage.getState().tuning,0,'tone 3 fails before 1');
go(59,-46);go(59,-36);go(59,-26);assert.equal(stage.getState().tuning,3);
go(-29,-44.2);assert.equal(stage.getState().secret,true);
go(0,-99);assert.equal(stage.getState().archive,true);
go(3.8,-108.2);assert.equal(stage.getState().gateOpen,true);
assert.equal(stage.isWalkable(0,-113),true,'gate opens');
go(0,-156.6);assert.equal(stage.getState().awakened,true);
assert.equal(events.some(e=>e.type==='complete'),true);
stage.update(1/60,{});stage.setQuality('high');assert.equal(stage.getQuality(),'high');
console.log('PASS: state machine, puzzles, barrier collision, secret, end state, quality changes');
// Test continuous paths through every major room with 0.9-metre grid BFS.
function route(from,to){
 const step=.9;const cell=(x,z)=>[Math.round(x/step),Math.round(z/step)];const start=cell(...from),goal=cell(...to);
 const queue=[start],seen=new Set([start.join(',')]);let i=0;
 while(i<queue.length){const [x,z]=queue[i++];if(Math.hypot(x-goal[0],z-goal[1])<=1.5)return {found:true,visited:i};
   for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){
     const nx=x+a,nz=z+b,k=nx+','+nz;if(seen.has(k))continue;
     if(!stage.isWalkable(nx*step,nz*step))continue;
     queue.push([nx,nz]);seen.add(k);
   }
   if(i>70000)break;
 }
 return {found:false,visited:i};
}
for(const target of [[-60,-46],[59,-46],[0,-99],[-29,-44.2],[0,-156.6]]){
 const result=route([0,19],target);assert.equal(result.found,true,`route to ${target} (${result.visited} cells)`);
 console.log('ROUTE OK',target,'visited',result.visited);
}
stage.dispose();assert.equal(stage.root.children.length,0);
assert.equal(stage.isWalkable(0,20),false);
console.log('PASS: walkability across whole facility, module dispose');
