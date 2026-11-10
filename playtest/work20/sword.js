const attacks=[
  {from:1.28,to:-1.17,pitch:-.12,duration:.60,damage:28},
  {from:-1.21,to:1.10,pitch:.08,duration:.58,damage:30},
  {from:.22,to:-.24,pitch:-.68,duration:.74,damage:42},
];
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>t*t*(3-2*t);

export function createSword(THREE) {
  let elapsed=0, combo=-1, idle=2, strike=null, connected=false, checked=false;
  const aim=new THREE.Vector3(), base=new THREE.Vector3(), tip=new THREE.Vector3();
  const line=new THREE.Line3(), closest=new THREE.Vector3();

  function start(){
    if(strike)return false;
    combo=idle<.44?(combo+1)%attacks.length:0;
    strike=attacks[combo];elapsed=0;connected=false;checked=false;
    return true;
  }
  function pose(fraction){
    if(!strike)return {yaw:.27,pitch:.13};
    const {from,to,pitch}=strike;
    if(fraction<.3)return {yaw:mix(.27,from,smooth(fraction/.3)),pitch:mix(.13,pitch,fraction/.3)};
    if(fraction<.63)return {yaw:mix(from,to,smooth((fraction-.3)/.33)),pitch:pitch+(combo===2?(fraction-.3)*3.2:0)};
    const t=smooth(Math.min(1,(fraction-.63)/.37));
    return {yaw:mix(to,.27,t),pitch:mix(pitch+(combo===2?1.05:0),.13,t)};
  }
  function update(dt,position,yaw,target,onHit,onMiss){
    if(!strike){idle+=dt;return;}
    const prev=elapsed/strike.duration;
    elapsed+=dt;
    const now=elapsed/strike.duration;
    if(!connected&&target&&now>=.3&&prev<=.63){
      base.copy(position).y+=1.37;
      for(let i=0;i<=4;i++){
        const f=mix(Math.max(.3,prev),Math.min(.63,now),i/4);
        const p=pose(f), angle=yaw+p.yaw;
        aim.set(Math.sin(angle),-p.pitch*.7,-Math.cos(angle)).normalize();
        tip.copy(base).addScaledVector(aim,3.1);
        line.set(base,tip).closestPointToPoint(target.position,true,closest);
        if(closest.distanceToSquared(target.position)<=target.radius**2){
          connected=true;onHit(strike.damage);break;
        }
      }
    }
    if(now>.63&&!checked){checked=true;if(!connected)onMiss();}
    if(now>=1){strike=null;idle=0;}
  }
  return {start,update,get active(){return !!strike;},get pose(){return pose(strike?elapsed/strike.duration:0);},reset(){strike=null;idle=2;}};
}
