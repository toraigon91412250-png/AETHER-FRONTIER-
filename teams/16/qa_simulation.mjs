/** Logic-only smoke checks. Render validation requires a browser and real Three.js. */
import { createAetherModule } from './enemyModule.js';
import assert from 'node:assert/strict';
class V {
 constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
 set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
 copy(o){return this.set(o.x,o.y,o.z);}
 clone(){return new V(this.x,this.y,this.z);}
 setScalar(s){return this.set(s,s,s)}
}
class Obj {
 constructor(){this.position=new V();this.rotation=new V();this.scale=new V(1,1,1);this.children=[];this.visible=true;}
 add(c){this.children.push(c);c.parent=this;return this;}
 removeFromParent(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);}
 traverse(f){f(this);this.children.forEach(c=>c.traverse(f));}
 localToWorld(v){return v.clone().set(v.x+this.position.x,v.y+this.position.y,v.z+this.position.z);}
}
class Geometry{dispose(){}setAttribute(){}setIndex(){}computeVertexNormals(){}}
class Material {constructor(opts={}){Object.assign(this,opts);this.color={setHex() {}};this.emissive={setHex() {}};}dispose(){}}
class Mesh extends Obj{constructor(geometry,material){super();this.geometry=geometry;this.material=material;}}
const THREE={Group:Obj,Mesh,MeshStandardMaterial:Material,MeshBasicMaterial:Material,
 DoubleSide:2,MathUtils:{clamp:(v,a,b)=>Math.max(a,Math.min(b,v))},Vector3:V,Float32BufferAttribute:class{},BufferGeometry:Geometry};
for(const g of ['BoxGeometry','SphereGeometry','CylinderGeometry','OctahedronGeometry','TorusGeometry','CircleGeometry','RingGeometry','PlaneGeometry','ConeGeometry'])THREE[g]=Geometry;
const events=[];
const mod=createAetherModule(THREE,{position:{x:0,z:0},quality:'low',onEvent:e=>events.push(e),random:()=>.5});
assert.deepEqual(Object.keys(mod).includes('setQuality'),true);
assert.equal(mod.snapshot().hp,480);
let p={x:0,y:0,z:8};
for(let i=0;i<600;i++){mod.update(1/60,{player:{position:p,radius:.42,invulnerable:i>300}});}
assert(events.some(e=>e.type==='telegraph'),'must telegraph before attacking');
assert(events.some(e=>e.type==='attackImpact'),'must have attack impacts');
assert(mod.root.position.z>0,'must approach target');
const firstTell=events.findIndex(e=>e.type==='telegraph');
const firstImpact=events.findIndex(e=>e.type==='attackImpact');
assert(firstTell<firstImpact,'tell precedes impact');
mod.receiveHit({damage:240,stagger:0});
assert.equal(mod.snapshot().phase,2,'second phase at 50%');
for(let i=0;i<130;i++)mod.update(1/60,{player:{position:p,radius:.42}});
assert.notEqual(mod.snapshot().state,'phaseShift');
const out=mod.receiveHit({damage:10000,stagger:50});
assert.equal(out.alive,false);
assert(events.some(e=>e.type==='enemyDefeated'));
mod.reset();assert.equal(mod.snapshot().phase,1);
mod.receiveHit({damage:0,stagger:120});assert.equal(mod.snapshot().state,'stagger');
mod.setQuality('high');mod.dispose();
console.log('PASS: API / pursuit / telegraph-before-impact / hit logic / phase 2 / defeat / reset / stagger / disposal');
// Attack snapshots are resolved exactly once, and invulnerability suppresses HP events.
const guardEvents=[];
const guard=createAetherModule(THREE,{onEvent:e=>guardEvents.push(e)});
const near={position:{x:0,y:0,z:2},radius:.4,height:0,invulnerable:true};
assert.equal(guard.forceAttack('cleave'),true);
for(let i=0;i<96;i++)guard.update(1/60,{player:near});
assert(guardEvents.some(e=>e.type==='attackImpact'&&e.hit&&e.blocked));
assert.equal(guardEvents.filter(e=>e.type==='playerHit').length,0);
guard.reset();guardEvents.length=0;
assert.equal(guard.forceAttack('pulse'),true);
for(let i=0;i<105;i++)guard.update(1/60,{player:{...near,height:1.4,invulnerable:false}});
assert(guardEvents.some(e=>e.type==='attackImpact'&&!e.hit));
guard.dispose();
console.log('PASS: invulnerability frames / aerial pulse avoidance');
