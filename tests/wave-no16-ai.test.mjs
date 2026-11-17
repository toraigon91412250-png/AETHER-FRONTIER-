import test from 'node:test';
import assert from 'node:assert/strict';
import {createAetherModule} from '../integration/updates/2026-11-17/no16/enemyModule.js';

// The real Three.js and WebGL rendering are deliberately not faked as test successes.
// These test doubles only exercise gameplay logic and the public module contract.
class V {
  constructor(x=0,y=0,z=0){this.set(x,y,z);}
  set(x,y,z){this.x=x;this.y=y;this.z=z;return this;}
  copy(v){return this.set(v.x,v.y,v.z);}
  clone(){return new V(this.x,this.y,this.z);}
  setScalar(s){return this.set(s,s,s);}
}
class O {
  constructor(){this.position=new V();this.rotation=new V();this.scale=new V(1,1,1);this.children=[];this.visible=true;}
  add(child){this.children.push(child);child.parent=this;return this;}
  removeFromParent(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);}
  traverse(fn){fn(this);this.children.forEach(x=>x.traverse(fn));}
}
class G{setAttribute(){}setIndex(){}computeVertexNormals(){}dispose(){}}
class M{constructor(){this.color={setHex(){}};this.emissive={setHex(){}};}dispose(){}}
class Mesh extends O{constructor(geometry,material){super();this.geometry=geometry;this.material=material;}}
const THREE={Group:O,Mesh,MeshStandardMaterial:M,MeshBasicMaterial:M,Vector3:V,
  MathUtils:{clamp:(v,a,b)=>Math.min(b,Math.max(a,v))},DoubleSide:2,
  BufferGeometry:G,Float32BufferAttribute:class{}};
for(const n of ['BoxGeometry','SphereGeometry','CylinderGeometry','OctahedronGeometry','TorusGeometry','CircleGeometry','RingGeometry','PlaneGeometry','ConeGeometry'])THREE[n]=G;
const player=(x=0,z=4,extra={})=>({player:{position:{x,y:0,z},radius:.42,height:0,invulnerable:true,...extra}});
function advance(m,seconds,ctx={}){for(let i=0;i<Math.ceil(seconds*60);i++)m.update(1/60,ctx);}
function make(options={}){const events=[];const m=createAetherModule(THREE,{quality:'low',random:()=>.2,...options,onEvent:e=>events.push(e)});return {m,events};}

// Do not treat source-level API compatibility as a substitute for production Three.js tests.
test('public contract, quality, transform and disposal',()=>{
 const {m}=make();
 for(const k of ['root','update','setQuality','dispose','receiveHit','reset','snapshot','setEnabled','setTarget','setBehavior','forceAttack','setFacing','setPosition'])assert.ok(k in m,k);
 assert.equal(m.snapshot().hp,480);
 assert.equal(m.setQuality('high'),'high');assert.equal(m.setQuality('low'),'low');
 m.setPosition(12,3,-5);assert.equal(m.snapshot().home.x,12);
 assert.equal(m.setHome({x:14,z:-6,y:3}),true);assert.equal(m.snapshot().home.x,14);
 m.dispose();m.dispose();assert.equal(m.receiveHit({damage:5}).accepted,false);
});

test('close range alternates pulse and cleave; impacts occur once after warning',()=>{
 const {m,events}=make();
 advance(m,10,player(0,2.7));
 const attacks=events.filter(e=>e.type==='telegraph').map(e=>e.attack);
 assert.ok(attacks.length>=2,attacks.join(','));
 assert.deepEqual(attacks.slice(0,2),['pulse','cleave']);
 const warningTimes=events.filter(e=>e.type==='telegraph').map(e=>e.time);
 const impacts=events.filter(e=>e.type==='attackImpact');
 assert.ok(impacts.length>=2);
 assert.ok(impacts[0].time>warningTimes[0]);
 assert.ok(impacts[1].time>warningTimes[1]);
 assert.equal(impacts.length,events.filter(e=>e.type==='telegraph').length-Number(m.snapshot().state==='telegraph'));
 m.dispose();
});

test('medium range prioritizes ray; near fight never opens with ray',()=>{
 const a=make(),b=make();
 advance(a.m,2,player(0,8));advance(b.m,2,player(0,2.7));
 assert.equal(a.events.find(e=>e.type==='telegraph')?.attack,'ray');
 assert.ok(['cleave','pulse'].includes(b.events.find(e=>e.type==='telegraph')?.attack));
 a.m.dispose();b.m.dispose();
});

test('turn rate is limited; telegraph direction becomes fixed before impact',()=>{
 const {m,events}=make();
 m.setFacing(0);m.update(.05,player(0,8));
 assert.ok(Math.abs(m.root.children[0].rotation.y)<=3.25*.05+.0001);
 m.reset({facing:Math.PI});
 assert.equal(m.forceAttack('ray'),true);
 advance(m,.85,player(0,8));
 const locked=m.root.children[0].rotation.y;
 advance(m,.8,player(8,0));
 const impact=events.find(e=>e.type==='attackImpact');
 assert.ok(impact);assert.ok(Math.abs(locked-impact.direction)<.001,`locked=${locked} impact=${impact.direction}`);
 m.dispose();
});

test('lost target returns to anchor without HP restoration or automatic reset',()=>{
 const {m,events}=make();
 m.receiveHit({damage:80});const hp=m.snapshot().hp;
 advance(m,2.4,player(0,17));
 assert.ok(m.root.position.z>1.5,'should start pursuing target');
 advance(m,5,{});
 assert.equal(m.snapshot().state,'seek');
 assert.ok(Math.hypot(m.root.position.x,m.root.position.z)<.21);
 assert.equal(m.snapshot().hp,hp);
 assert.ok(events.some(e=>e.type==='leashReturn'&&e.reason==='lost-target'));
 assert.ok(events.some(e=>e.type==='returnedHome'));
 assert.ok(!events.some(e=>e.type==='reset'));
 m.dispose();
});

test('leash never crosses work20 31m host reset threshold',()=>{
 const {m}=make();
 advance(m,12,player(0,20));
 const far={x:0,y:0,z:29};
 advance(m,7,player(far.x,far.z));
 assert.ok(Math.hypot(m.root.position.x,m.root.position.z)<29);
 assert.equal(m.snapshot().hp,480);
 m.dispose();
});

test('damage, phase shift and stagger remain functional',()=>{
 const {m,events}=make();
 m.receiveHit({damage:240});assert.equal(m.snapshot().phase,2);
 assert.equal(m.snapshot().state,'phaseShift');
 advance(m,2,{});assert.notEqual(m.snapshot().state,'phaseShift');
 m.receiveHit({damage:1,stagger:100});assert.equal(m.snapshot().state,'stagger');
 advance(m,2.1,{});assert.notEqual(m.snapshot().state,'stagger');
 assert.equal(events.filter(e=>e.type==='phaseChanged').length,1);
 m.dispose();
});

test('invulnerable target cannot receive hit, jumping avoids pulse',()=>{
 const {m,events}=make();
 assert.equal(m.forceAttack('cleave'),true);advance(m,2,player(0,2,{invulnerable:true}));
 assert.equal(events.filter(e=>e.type==='playerHit').length,0);
 assert.ok(events.some(e=>e.type==='attackImpact'&&e.blocked));
 m.reset();events.length=0;
 assert.equal(m.forceAttack('pulse'),true);advance(m,2,player(0,2,{invulnerable:false,height:1.5}));
 assert.ok(events.some(e=>e.type==='attackImpact'&&!e.hit));
 m.dispose();
});

test('death is terminal during arbitrary time, target changes, repeated damage and quality toggles',()=>{
 const {m,events}=make();
 advance(m,1,player(0,6));
 const outcome=m.receiveHit({damage:999999});assert.equal(outcome.alive,false);
 const deadTime=events.find(e=>e.type==='enemyDefeated')?.time;
 assert.ok(Number.isFinite(deadTime));
 const before=events.length;
 m.setTarget({x:0,y:0,z:2});m.setEnabled(false);m.setEnabled(true);
 m.setBehavior('aggressive');m.setQuality('high');
 advance(m,65,player(0,2,{invulnerable:false}));
 assert.equal(m.snapshot().hp,0);assert.equal(m.snapshot().state,'dead');
 assert.equal(m.forceAttack('cleave'),false);
 assert.equal(m.receiveHit({damage:1}).accepted,false);
 assert.equal(events.filter(e=>e.type==='enemyDefeated').length,1);
 assert.equal(events.filter(e=>e.type==='reset').length,0);
 assert.equal(events.filter(e=>e.type==='playerHit'&&e.time>deadTime).length,0);
 assert.equal(events.filter(e=>e.type==='attackImpact'&&e.time>deadTime).length,0);
 assert.equal(events.length,before);
 // Only deliberate reset is permitted to revive; host must never call reset on defeat.
 m.reset();assert.equal(m.snapshot().hp,480);assert.equal(m.snapshot().phase,1);
 assert.equal(m.snapshot().alive,true);assert.equal(events.filter(e=>e.type==='reset').length,1);
 m.dispose();
});

test('defeat during telegraph cancels impact and remains dead',()=>{
 const {m,events}=make();
 assert.equal(m.forceAttack('ray'),true);
 advance(m,.3,player(0,6));
 m.receiveHit({damage:5000});advance(m,10,player(0,6,{invulnerable:false}));
 assert.equal(events.filter(e=>e.type==='enemyDefeated').length,1);
 assert.equal(events.filter(e=>e.type==='attackImpact').length,0);
 assert.equal(m.snapshot().state,'dead');m.dispose();
});

test('invalid hit values do not poison health',()=>{
 const {m}=make();
 m.receiveHit({damage:Infinity,stagger:NaN});
 assert.ok(Number.isFinite(m.snapshot().hp));assert.ok(Number.isFinite(m.snapshot().poise));m.dispose();
});

test('stagger while returning does not strand the enemy outside home',()=>{
 const {m}=make();advance(m,2.5,player(0,17));advance(m,1,{});
 assert.equal(m.snapshot().state,'return');
 m.receiveHit({damage:5,stagger:200});assert.equal(m.snapshot().state,'stagger');
 advance(m,5,{});
 assert.equal(m.snapshot().state,'seek');
 assert.ok(Math.hypot(m.root.position.x,m.root.position.z)<.25);m.dispose();
});

test('phase shift while returning resumes return without regenerating HP',()=>{
 const {m}=make();advance(m,2.5,player(0,17));advance(m,1,{});
 assert.equal(m.snapshot().state,'return');
 m.receiveHit({damage:240});assert.equal(m.snapshot().state,'phaseShift');
 advance(m,7,{});
 assert.equal(m.snapshot().state,'seek');assert.equal(m.snapshot().hp,240);
 assert.ok(Math.hypot(m.root.position.x,m.root.position.z)<.25);m.dispose();
});

test('setEnabled(false) pauses engagement, retreat timers and attacks',()=>{
 const {m,events}=make();m.setEnabled(false);
 advance(m,3,player(0,6));
 assert.equal(m.snapshot().engaged,false);
 assert.equal(events.length,0);
 m.setEnabled(true);advance(m,1.3,player(0,6));
 assert.ok(events.some(e=>e.type==='engaged'));
 m.dispose();
});
