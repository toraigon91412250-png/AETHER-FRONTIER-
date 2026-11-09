/** Construction & API smoke test with a minimal headless mock of the Three.js primitives.
 * Full GPU verification must be performed in browser with actual Three.js r160. */
import {createAetherModule,createAetherSkiff} from '../aether-sky-islands.js';
import assert from 'node:assert/strict';
class Vec3{
  constructor(x=0,y=0,z=0){this.set(x,y,z)}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this} copy(o){return this.set(o.x,o.y,o.z)}
  clone(){return new Vec3(this.x,this.y,this.z)}
  add(o){this.x+=o.x;this.y+=o.y;this.z+=o.z;return this}
  sub(o){this.x-=o.x;this.y-=o.y;this.z-=o.z;return this}
  multiplyScalar(s){this.x*=s;this.y*=s;this.z*=s;return this}
  length(){return Math.hypot(this.x,this.y,this.z)}
  normalize(){return this.multiplyScalar(1/(this.length()||1))}
  setScalar(n){this.set(n,n,n);return this}
}
class Ang{constructor(){this.x=this.y=this.z=0}set(x,y,z){this.x=x;this.y=y;this.z=z;return this}}
class Quat{setFromUnitVectors(){return this}setFromEuler(){return this}}
class Mat4{compose(){return this}}
class Obj{constructor(){this.position=new Vec3();this.rotation=new Ang();this.quaternion=new Quat();this.scale=new Vec3(1,1,1);this.children=[];this.userData={};this.visible=true;this.matrixWorld={}}
  add(...children){for(const child of children){this.children.push(child);child.parent=this;}}
  remove(child){this.children=this.children.filter(c=>c!==child);child.parent=null}
  updateMatrixWorld(){for(const child of this.children)child.updateMatrixWorld?.()}}

class Attr{constructor(arr,itemSize){this.array=arr;this.itemSize=itemSize;this.count=arr.length/itemSize}
  getX(i){return this.array[i*this.itemSize]}getY(i){return this.array[i*this.itemSize+1]}getZ(i){return this.array[i*this.itemSize+2]}}
class Geo{constructor(){this.type=new.target.name;
    this.attributes={position:new Attr(new Float32Array([0,0,0,1,0,0,0,1,0,0,0,1]),3),
      normal:new Attr(new Float32Array([0,1,0,0,1,0,0,1,0,0,1,0]),3),
      uv:new Attr(new Float32Array(8),2)};
    this.index=new Attr(new Uint16Array([0,1,2,1,2,3]),1)}
  dispose(){}setAttribute(name,attr){this.attributes[name]=attr;return this}
  setIndex(attr){this.index=Array.isArray(attr)?new Attr(new Uint16Array(attr),1):attr;return this}
  computeVertexNormals(){return this}computeBoundingSphere(){return this}
  clone(){const copy=new Geo();copy.attributes={...this.attributes};copy.index=this.index;return copy}
  applyMatrix4(){return this}}
let materialId=0;
class Material{constructor(args={}){this.uuid='fake-material-'+(++materialId);Object.assign(this,args)}dispose(){}}

class Color{constructor(hex=0xffffff){this.setHex(hex)}setHex(hex){this.r=((hex>>16)&255)/255;this.g=((hex>>8)&255)/255;this.b=(hex&255)/255;return this}
  lerp(other,t){this.r+=(other.r-this.r)*t;this.g+=(other.g-this.g)*t;this.b+=(other.b-this.b)*t;return this}
  clone(){return Object.assign(new Color(),{r:this.r,g:this.g,b:this.b})}
  multiplyScalar(a){this.r*=a;this.g*=a;this.b*=a;return this}}
const THREE={Group:class extends Obj{},Mesh:class extends Obj{constructor(g,m){super();this.geometry=g;this.material=m;this.isMesh=true}},
  InstancedMesh:class extends Obj{constructor(g,m,count){super();this.geometry=g;this.material=m;this.count=count;this.isMesh=true;this.isInstancedMesh=true;this.instanceMatrix={needsUpdate:false}}
    setMatrixAt(){}setColorAt(){this.instanceColor={needsUpdate:false}}},
  Vector3:Vec3,Quaternion:Quat,Matrix4:Mat4,Euler:Ang,Color,
  Float32BufferAttribute:Attr,BufferAttribute:Attr,
  BufferGeometry:Geo,BoxGeometry:Geo,CylinderGeometry:Geo,ConeGeometry:Geo,IcosahedronGeometry:Geo,
  DodecahedronGeometry:Geo,SphereGeometry:Geo,TorusGeometry:Geo,PlaneGeometry:Geo,CircleGeometry:Geo,
  MeshStandardMaterial:Material,MeshBasicMaterial:Material,ShaderMaterial:Material,
  DoubleSide:2,BackSide:1,NormalBlending:1};
const w=createAetherModule(THREE,{quality:'low'});
assert.equal(typeof w.update,'function');
assert.equal(w.metadata.islands.length,8);assert.equal(w.metadata.beaconIds.length,5);
assert.equal(w.getQuality(),'low');
assert.ok(['island','platform'].includes(w.sampleGround(0,70,2.12).source));
assert.equal(w.sampleGround(1000,1000,Infinity),null);
// All ten footbridges must provide a continuous collision surface.
const areaMap=new Map(w.metadata.islands.map(d=>[d.id,d]));
let sampledBridges=0;
for(const [aid,bid] of w.metadata.bridges){
  const a=areaMap.get(aid),b=areaMap.get(bid);
  const dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len;
  const x1=a.x+ux*a.r*.78,z1=a.z+uz*a.r*.78,x2=b.x-ux*b.r*.78,z2=b.z-uz*b.r*.78;
  for(let n=1;n<=19;n++){
    const t=n/20,x=x1+(x2-x1)*t,z=z1+(z2-z1)*t;
    const result=w.sampleGround(x,z,Infinity);
    assert.ok(result,`No walkable floor on bridge ${aid}-${bid} at ${t}`);
    sampledBridges++;
  }
}
// Module collision callback modifies player position without changing their altitude.
const obstacle={x:areaMap.get('wind').x+4,z:areaMap.get('wind').z+7,y:areaMap.get('wind').y};
const body={...obstacle};w.resolveFootCollision(body);
assert.ok(Math.hypot(body.x-obstacle.x,body.z-obstacle.z)>3.8);
assert.equal(body.y,obstacle.y);

for(const id of w.metadata.beaconIds){assert.equal(w.activateBeacon(id),true);assert.equal(w.activateBeacon(id),false);}
assert.equal(w.activatedCount(),5);
assert.equal(w.getBeacons().filter(b=>b.active).length,5);
for(let i=0;i<10;i++)w.update(.016,{});
assert.equal(w.setQuality('high'),'high');
const countVisible=(obj,visible=true)=>{
  const isVisible=visible&&obj.visible!==false;
  return (isVisible&&obj.geometry?1:0)+obj.children.reduce((n,c)=>n+countVisible(c,isVisible),0);
};
const highMeshCount=countVisible(w.root);
assert.equal(w.setQuality('lite'),'low');
const lowMeshCount=countVisible(w.root);
assert.ok(lowMeshCount<highMeshCount);

const craft=createAetherSkiff(THREE);
assert.ok(craft.children.length>15);craft.userData.dispose();w.dispose();
console.log('PASS / 8 islands, 10 bridges, '+sampledBridges+' walkway samples, ground/collision, 5 beacons, quality, update, skiff, dispose');
console.log('Visibility mesh estimates (not GPU drawcalls): HIGH='+highMeshCount+' LITE='+lowMeshCount);
