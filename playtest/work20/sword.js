/**
 * AETHER FRONTIER / No.00: synchronized melee swing trajectory.
 * Pure controller: no renderer or animation ownership. The rendered blade and
 * the hit trace read the same pose at the same point in the animation.
 * Attack order: cross-cut, reverse-cut, overhead cut.
 */
const attacks = [
  {kind:'cross',duration:.58,damage:28,wind:{yaw:1.02,pitch:-.15,roll:-.24},follow:{yaw:-1.06,pitch:.04,roll:.20}},
  {kind:'reverse',duration:.56,damage:30,wind:{yaw:-1.03,pitch:-.12,roll:.24},follow:{yaw:1.03,pitch:.02,roll:-.22}},
  {kind:'overhead',duration:.69,damage:42,wind:{yaw:.10,pitch:-1.08,roll:0},follow:{yaw:-.12,pitch:.68,roll:-.08}}
];
const idlePose=Object.freeze({yaw:.24,pitch:.08,roll:-.10,windup:0,stroke:0,progress:0,phase:'idle',combo:-1});
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const mix=(a,b,t)=>a+(b-a)*t;
const lerpPose=(a,b,t)=>({yaw:mix(a.yaw,b.yaw,t),pitch:mix(a.pitch,b.pitch,t),roll:mix(a.roll,b.roll,t)});

export function createSword(THREE){
  let elapsed=0,combo=-1,idle=2,strike=null,connected=false,checked=false;
  const aim=new THREE.Vector3(),base=new THREE.Vector3(),tip=new THREE.Vector3();
  const line=new THREE.Line3(),closest=new THREE.Vector3();
  function start(){
    if(strike)return false;
    combo=idle<.46?(combo+1)%attacks.length:0;
    strike=attacks[combo];elapsed=0;connected=false;checked=false;
    return true;
  }
  function sample(fraction){
    if(!strike)return {...idlePose};
    const f=clamp(fraction);
    const windEnd=.24,followEnd=.65;
    let key,phase;
    if(f<windEnd){key=lerpPose(idlePose,strike.wind,smooth(f/windEnd));phase='windup';}
    else if(f<followEnd){key=lerpPose(strike.wind,strike.follow,smooth((f-windEnd)/(followEnd-windEnd)));phase='strike';}
    else{key=lerpPose(strike.follow,idlePose,smooth((f-followEnd)/(1-followEnd)));phase='recover';}
    const windup=f<windEnd?smooth(f/windEnd):f<followEnd?1:1-smooth((f-followEnd)/(1-followEnd));
    return {...key,windup,stroke:Math.sin(Math.PI*clamp((f-windEnd)/(followEnd-windEnd))),progress:f,phase,combo};
  }
  function update(dt,position,yaw,target,onHit=()=>{},onMiss=()=>{}){
    dt=Number.isFinite(dt)?clamp(dt,0,.08):0;
    if(!strike){idle+=dt;return;}
    const prev=elapsed/strike.duration;
    elapsed=Math.min(strike.duration,elapsed+dt);
    const now=elapsed/strike.duration;
    // The damage trace samples the very same swing that positions the weapon.
    if(!connected&&target&&now>=.24&&prev<=.65){
      const a=Math.max(.24,prev),b=Math.min(.65,now);
      base.copy(position).y+=1.36;
      for(let i=0;i<=8;i++){
        const f=mix(a,b,i/8),p=sample(f),angle=yaw+p.yaw;
        aim.set(Math.sin(angle),-Math.tan(clamp(p.pitch,-1.1,1.1))*.55,-Math.cos(angle)).normalize();
        tip.copy(base).addScaledVector(aim,3.1);
        line.set(base,tip).closestPointToPoint(target.position,true,closest);
        if(closest.distanceToSquared(target.position)<=target.radius*target.radius){
          connected=true;onHit(strike.damage);break;
        }
      }
    }
    if(now>.65&&!checked){checked=true;if(!connected)onMiss();}
    if(elapsed>=strike.duration){strike=null;idle=0;}
  }
  return {
    start,update,
    get active(){return !!strike;},
    get pose(){return sample(strike?elapsed/strike.duration:0);},
    get combo(){return combo;},
    reset(){strike=null;elapsed=0;idle=2;combo=-1;connected=false;checked=false;}
  };
}
