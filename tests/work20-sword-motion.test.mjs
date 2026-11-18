import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createSword} from '../playtest/work20/sword.js';

// Lightweight geometry double so these tests run without WebGL or dependencies.
class Vec {
  constructor(x=0,y=0,z=0){this.set(x,y,z);}
  set(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;return this;}
  copy(v){return this.set(v.x,v.y,v.z);}
  addScaledVector(v,s){this.x+=v.x*s;this.y+=v.y*s;this.z+=v.z*s;return this;}
  normalize(){const n=Math.hypot(this.x,this.y,this.z)||1;this.x/=n;this.y/=n;this.z/=n;return this;}
  distanceToSquared(v){return (this.x-v.x)**2+(this.y-v.y)**2+(this.z-v.z)**2;}
}
class Line {
  set(a,b){this.a=new Vec(a.x,a.y,a.z);this.b=new Vec(b.x,b.y,b.z);return this;}
  closestPointToPoint(p,_clamp,target){const a=this.a,b=this.b,dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z;
    const q=(p.x-a.x)*dx+(p.y-a.y)*dy+(p.z-a.z)*dz;
    const t=Math.max(0,Math.min(1,q/(dx*dx+dy*dy+dz*dz||1)));
    return target.set(a.x+t*dx,a.y+t*dy,a.z+t*dz);}
}
const THREE={Vector3:Vec,Line3:Line};
const at=(z)=>({position:new Vec(0,1.4,z),radius:.4});
function swing(sword,target){let hits=0,misses=0,poses=[];assert.equal(sword.start(),true);
  for(let i=0;i<58;i++){
    sword.update(1/60,new Vec(),0,target,()=>hits++,()=>misses++);
    const p=sword.pose;
    assert.ok([p.yaw,p.pitch,p.roll,p.progress,p.windup,p.stroke].every(Number.isFinite),'finite swing pose');
    poses.push(p);
  }
  assert.equal(sword.active,false);return {hits,misses,poses};
}
test('near target hit once; distant target misses exactly once',()=>{
  const sword=createSword(THREE);
  const miss=swing(sword,at(-12));assert.deepEqual([miss.hits,miss.misses],[0,1]);
  const hit=swing(sword,at(-2));assert.deepEqual([hit.hits,hit.misses],[1,0]);
});
test('each of three swings winds up, sweeps, and recovers, with no abrupt teleport',()=>{
  const sword=createSword(THREE);
  const seq=[swing(sword,at(-12)),swing(sword,at(-12)),swing(sword,at(-12))];
  for(const {poses} of seq){
    const active=poses.filter(p=>p.phase!=='idle');
    assert.ok(active.some(p=>p.phase==='windup'));
    assert.ok(active.some(p=>p.phase==='strike'));
    assert.ok(active.some(p=>p.phase==='recover'));
    assert.equal(poses.at(-1).phase,'idle');
    for(let i=1;i<active.length;i++){
      assert.ok(Math.abs(active[i].yaw-active[i-1].yaw)<.35,'yaw stable across frames');
      assert.ok(Math.abs(active[i].pitch-active[i-1].pitch)<.35,'pitch stable across frames');
    }
  }
  assert.equal(seq[0].poses.find(p=>p.phase==='strike').combo,0);
  assert.equal(seq[1].poses.find(p=>p.phase==='strike').combo,1);
  assert.equal(seq[2].poses.find(p=>p.phase==='strike').combo,2);
});
test('new swing cannot begin before active swing has recovered',()=>{
  const sword=createSword(THREE);assert.ok(sword.start());assert.equal(sword.start(),false);
  for(let i=0;i<15;i++)sword.update(1/60,new Vec(),0,null);
  assert.equal(sword.start(),false);sword.reset();assert.ok(sword.start());assert.equal(sword.combo,0);
});
test('idle pose and attack reset remain deterministic',()=>{
  const sword=createSword(THREE);
  assert.equal(sword.pose.phase,'idle');assert.equal(sword.pose.combo,-1);
  sword.start();sword.update(.2,new Vec(),0,null);sword.reset();
  assert.equal(sword.pose.phase,'idle');assert.equal(sword.active,false);
  for(let i=0;i<300;i++)sword.update(1/60,new Vec(),0,null);
  assert.ok(sword.start());assert.equal(sword.combo,0);
});
