import { createAetherModule } from '../aether15_weapon.js';
class Vec {constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}setScalar(s){this.x=s;this.y=s;this.z=s;return this;}}
class Group {constructor(){this.children=[];this.position=new Vec();this.rotation=new Vec();this.scale=new Vec(1,1,1);this.visible=true;this.userData={};}add(o){this.children.push(o);o.parent=this;}remove(o){this.children=this.children.filter(v=>v!==o);o.parent=null;}updateMatrix(){}}
class Mesh extends Group {constructor(g,m){super();this.geometry=g;this.material=m;}}
class InstancedMesh extends Mesh{constructor(g,m,c){super(g,m);this.count=c;this.instanceMatrix={};}setMatrixAt(){}}
class Geo{constructor(){this.disposed=false;}rotateX(){return this;}translate(){return this;}dispose(){this.disposed=true;}}
class Mat {constructor(props){Object.assign(this,props);this.disposed=false;}dispose(){this.disposed=true;}}
class Shape {moveTo(){}lineTo(){}closePath(){}}
class CatmullRomCurve3 {constructor(){}}
const T={Group,Mesh,InstancedMesh,Object3D:Group,Shape,Vector3:Vec,CatmullRomCurve3,
 MeshStandardMaterial:Mat,MeshBasicMaterial:Mat,DoubleSide:2,AdditiveBlending:2,
 BoxGeometry:Geo,CylinderGeometry:Geo,TorusGeometry:Geo,IcosahedronGeometry:Geo,ExtrudeGeometry:Geo,TubeGeometry:Geo,TetrahedronGeometry:Geo,OctahedronGeometry:Geo};
const mod=createAetherModule(T,{quality:'high',form:'sealed'});
const assert=(cond,msg)=>{if(!cond)throw Error(msg)};
function count(root){let n=0;const visit=o=>{if(o instanceof Mesh)n++;if(o.visible!==false)for(const ch of o.children)visit(ch);};visit(root);return n;}
const high=count(mod.root);
assert(mod.root.name==='AF15_VESPER_PRISM','root name');
mod.root.position.set(7,8,9);
for(let i=0;i<120;i++)mod.update(1/60,{charge:.6});
assert(mod.root.position.x===7&&mod.root.position.y===8&&mod.root.position.z===9,'external root overwritten');
mod.setForm('awakened');mod.playAction('pulse');mod.playAction('slash');
for(let i=0;i<120;i++)mod.update(1/60);
assert(mod.getState().form==='awakened','form setter failed');
assert(mod.getState().formBlend>.99,'form animation failed');
mod.setQuality('low');const low=count(mod.root);
assert(low<high,'quality LOD not working');
mod.setQuality('high');assert(count(mod.root)===high,'quality restoration');
mod.dispose();mod.dispose();assert(mod.root.children.length===0,'disposal failed');
console.log(JSON.stringify({result:'PASS',highDrawableObjects:high,lowDrawableObjects:low,highLowReductionPercent:Math.round((1-low/high)*100),rootUntouched:true,qualityToggle:true,animation:true,disposeIdempotent:true},null,2));
