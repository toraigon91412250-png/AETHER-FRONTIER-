import {createAetherModule} from '../src/aether-dragon.js';
let ng=0,nm=0;
class Vec3 {constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}set(x,y,z){this.x=x;this.y=y;this.z=z;return this}clone(){return new Vec3(this.x,this.y,this.z)}sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this}add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this}multiplyScalar(f){this.x*=f;this.y*=f;this.z*=f;return this}normalize(){const l=Math.hypot(this.x,this.y,this.z);if(l) this.multiplyScalar(1/l);return this}length(){return Math.hypot(this.x,this.y,this.z)}toArray(){return [this.x,this.y,this.z]};setScalar(v){this.set(v,v,v)}copy(v){this.set(v.x,v.y,v.z);return this}}
class Obj {constructor(){this.position=new Vec3;this.scale=new Vec3(1,1,1);this.rotation={x:0,y:0,z:0,set(x,y,z){this.x=x;this.y=y;this.z=z}};this.quaternion={setFromUnitVectors(){}};this.children=[];this.userData={};this.visible=true;this.name='';}
 add(o){this.children.push(o);o.parent=this;return this}traverse(fn){fn(this);for(let child of this.children)child.traverse(fn)}removeFromParent(){if(this.parent)this.parent.children.splice(this.parent.children.indexOf(this),1)}updateMatrix(){this.matrix={}}}
class Geometry{constructor(...args){this.args=args;ng++}setAttribute(){}setIndex(){}computeVertexNormals(){}dispose(){}}
class Mat{constructor(props){Object.assign(this,props);nm++}dispose(){}}
class Mesh extends Obj {constructor(g,m){super();this.geometry=g;this.material=m;this.isMesh=true;}}
class InstancedMesh extends Mesh{constructor(g,m,count){super(g,m);this.count=count;this.isInstancedMesh=true;this.instanceMatrix={needsUpdate:false}}setMatrixAt(i,m){}dispose(){}}
class Color{constructor(v){this.v=v;this.r=.3;this.g=.5;this.b=.6;}clone(){return new Color(this.v)}lerp(c,p){return this}}
const THREE={Group:Obj,Mesh,InstancedMesh,Vector3:Vec3,SphereGeometry:Geometry,OctahedronGeometry:Geometry,BoxGeometry:Geometry,CylinderGeometry:Geometry,TorusGeometry:Geometry,TetrahedronGeometry:Geometry,IcosahedronGeometry:Geometry,BufferGeometry:Geometry,Float32BufferAttribute:Geometry,Object3D:Obj,MeshStandardMaterial:Mat,Color,DoubleSide:2};
const mod=createAetherModule(THREE,{quality:'low'});
let count=0,hiddens=0;mod.root.traverse(o=>{if(o.isMesh){count++;if(!o.visible)hiddens++}});
if(count<180||mod.root.children.length<10||mod.metadata.id!=='AF13-VHALKOR')throw new Error('Missing geometry');
if(hiddens<15)throw new Error('LOD not hiding enough');
for(const phase of ['idle','roar','charge','breath','flight']){
 mod.setPhase(phase);for(let i=0;i<120;i++)mod.update(1/60);
 if(mod.phase!==phase)throw new Error('Phase failure '+phase);
}
mod.setQuality('high');let highVisible=0;mod.root.traverse(o=>{if(o.userData.highDetail && o.visible)highVisible++});
if(highVisible<15)throw new Error('High detail missing');
mod.dispose();mod.dispose();
console.log(JSON.stringify({pass:true,meshCount:count,lowHiddenCount:hiddens,highVisible,geometries:ng,materials:nm,rootChildren:mod.root.children.length,phases:5}));
