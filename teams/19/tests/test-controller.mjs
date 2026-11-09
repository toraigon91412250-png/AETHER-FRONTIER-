import { createAetherModule } from '../src/aether-player-controller.js';
import assert from 'node:assert/strict';
class Vec {
  constructor(x=0,y=0,z=0){this.set(x,y,z)}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this}
  copy(v){return this.set(v.x,v.y,v.z)}
  clone(){return new Vec(this.x,this.y,this.z)}
  addScaledVector(v,s){this.x+=v.x*s;this.y+=v.y*s;this.z+=v.z*s;return this}
  add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this}
  sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this}
  multiplyScalar(s){this.x*=s;this.y*=s;this.z*=s;return this}
  lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}
  length(){return Math.sqrt(this.lengthSq())}
  distanceTo(v){return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z)}
  normalize(){return this.multiplyScalar(1/Math.max(.00001,this.length()))}
  lerp(v,a){this.x+=(v.x-this.x)*a;this.y+=(v.y-this.y)*a;this.z+=(v.z-this.z)*a;return this}
}
class Group{
  constructor(){this.position=new Vec();this.rotation={y:0};this.children=[]}
  add(g){this.children.push(g);g.parent=this}
  remove(g){this.children=this.children.filter(x=>x!==g);g.parent=null}
}
const THREE={Group,Vector3:Vec};
const camera={position:new Vec(),rotation:{order:'',set(){},},lookAt(){}};
let events=[];
const p=createAetherModule(THREE,{camera,position:{x:0,y:0,z:0},onEvent:e=>events.push(e.type)});
const snap=i=>p.update(1/60,{input:i});
for(let i=0;i<90;i++)snap({moveY:1});
assert.ok(p.root.position.z<-5 && p.root.position.z>-9,'forward movement speed');
assert.equal(p.getState().grounded,true);
assert.equal(p.root.rotation.y,0);
let pre=p.root.position.z;
snap({moveY:1,lookX:Math.PI/2});
for(let i=0;i<30;i++)snap({moveY:1});
assert.ok(p.root.position.x>1.7,'heading applies to forward movement');
assert.ok(p.root.position.z<pre+0.1,'no sudden backwards');
snap({jump:true});
assert.ok(p.getState().position.y>0,'jump leaves floor');
assert.equal(events.filter(x=>x==='jump').length,1);
for(let i=0;i<15;i++)snap({jump:true});
assert.equal(events.filter(x=>x==='jump').length,1,'holding jump does not repeat');
for(let i=0;i<95;i++)snap({jump:false});
assert.equal(p.getState().grounded,true,'returns to ground');
snap({toggleView:true});
assert.equal(p.getMode(),'fps');
for(let i=0;i<5;i++)snap({toggleView:true});
assert.equal(p.getMode(),'fps','toggle edge detection');
snap({toggleView:false});snap({toggleView:true});assert.equal(p.getMode(),'tps');
snap({action:true});snap({action:true});
assert.equal(events.filter(x=>x==='action').length,1,'action only fires once for held button');
snap({dash:true});assert.ok(p.getState().dashing,'dash activated');
snap({dash:false});snap({dash:true});
assert.equal(events.filter(x=>x==='dash').length,1,'dash cooldown');
assert.equal(p.setQuality('high'),'high');
p.teleport(3,0,3);assert.equal(p.getPosition().x,3);
p.dispose();assert.ok(p.getState().position.x===3,'disposed is queryable');
console.log('PASS 13 checks: movement, orientation, jump, ground, mode, edge actions, dash cooldown, quality, teleport, dispose');
