/**
 * AETHER FRONTIER | No.12 | Ground driver.
 * Standalone steering/traction/suspension controller, independent of rendering.
 * Integrator takes normalized controls and a terrain adapter; it never reads DOM.
 * Input: { throttle:0..1, brake:0..1, steer:-1..1, boost:bool, drift:bool }
 */
export function createGroundDriver(vehicle, options={}) {
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const height=typeof options.groundHeight==='function'?options.groundHeight:()=>0;
  const onRoad=typeof options.onRoad==='function'?options.onRoad:()=>true;
  const st = {
    x:0,y:0,z:0,yaw:0, vx:0,vz:0,vy:0,hop:0,
    speed:0,lateralSpeed:0,boostEnergy:100,drifting:false,boosting:false,
    airborne:false,offRoad:false,steering:0,odometer:0,totalTime:0,
    wheelPitch:0,wheelRoll:0,roughness:0
  };
  const parameters={
    maxSpeed:52,boostSpeed:77,reverseSpeed:13,
    accel:26,boostAccel:34,brakeAccel:46,reverseAccel:17,
    energyDrain:26,energyRegen:12,gravity:24,
    ...options.parameters
  };
  function spawn({x=0,z=0,yaw=0}={}){
    Object.assign(st,{x,z,yaw,vx:0,vz:0,vy:0,hop:0,speed:0,lateralSpeed:0,
      boostEnergy:100,drifting:false,boosting:false,airborne:false,steering:0,offRoad:false,
      wheelPitch:0,wheelRoll:0,roughness:0});
    st.y=height(x,z);
    sync(0,{throttle:0,brake:1,steer:0});
  }
  function sync(dt,input) {
    const r=vehicle.root;
    r.position.set(st.x,st.y,st.z);
    r.rotation.set(st.wheelPitch,st.yaw,st.wheelRoll,'YXZ');
    vehicle.setDriveState?.({speed:st.speed,steering:st.steering,
      throttle:input.throttle||0,brake:input.brake||0,
      boost:st.boosting?1:0,drift:st.drifting?1:0,
      airborne:st.airborne?1:0,groundRoughness:st.roughness});
  }
  function update(dt, input={}, environment={}) {
    dt=clamp(Number.isFinite(dt)?dt:0,0,.042);
    if(!dt)return st;
    st.totalTime+=dt;
    const gas=clamp(Number(input.throttle)||0,0,1);
    const brake=clamp(Number(input.brake)||0,0,1);
    const wantedSteer=clamp(Number(input.steer)||0,-1,1);
    st.steering+=(wantedSteer-st.steering)*(1-Math.exp(-dt*11));
    const isRoad=onRoad(st.x,st.z);
    st.offRoad=!isRoad;
    const forwardX=-Math.sin(st.yaw), forwardZ=-Math.cos(st.yaw);
    const sideX=Math.cos(st.yaw),sideZ=-Math.sin(st.yaw);
    let fwd=st.vx*forwardX+st.vz*forwardZ;
    let side=st.vx*sideX+st.vz*sideZ;
    st.drifting=!!input.drift&&Math.abs(fwd)>8&&!st.airborne;
    st.boosting=!!input.boost&&gas>.05&&st.boostEnergy>2&&fwd>=0;
    st.boostEnergy=clamp(st.boostEnergy+(st.boosting?-parameters.energyDrain:parameters.energyRegen)*dt,0,100);
    if(st.boostEnergy<.5)st.boosting=false;
    let acceleration=0;
    if(gas)acceleration+=gas*(parameters.accel+(st.boosting?parameters.boostAccel:0));
    if(brake) acceleration-=brake*(fwd>1?parameters.brakeAccel:parameters.reverseAccel);
    if(!gas&&!brake)acceleration-=Math.sign(fwd)*Math.min(Math.abs(fwd)/dt,2.0);
    fwd+=acceleration*dt;
    fwd-=Math.sign(fwd)*Math.min(Math.abs(fwd),(.013*Math.abs(fwd)*Math.abs(fwd)+.2)*dt);
    const targetTop=fwd<0?parameters.reverseSpeed:(st.boosting?parameters.boostSpeed:(isRoad?parameters.maxSpeed:parameters.maxSpeed*.74));
    if(Math.abs(fwd)>targetTop)fwd=Math.sign(fwd)*Math.max(targetTop,Math.abs(fwd)-(14+Math.abs(fwd)*.15)*dt);
    fwd=clamp(fwd,-parameters.reverseSpeed,parameters.boostSpeed);
    const steerGrip=st.drifting?1.48:1;
    const turnFactor=.29+.69*(1-Math.exp(-Math.abs(fwd)/17));
    const turnRate=1.29*turnFactor*steerGrip*st.steering*(fwd>=0?1:-.63)*(isRoad?1:.84);
    st.yaw-=turnRate*dt;
    const friction=st.airborne?.65:st.drifting?1.65:isRoad?9.8:5.2;
    side*=Math.exp(-dt*friction);
    if(st.drifting)side+=st.steering*Math.abs(fwd)*dt*.42;
    const nx=-Math.sin(st.yaw),nz=-Math.cos(st.yaw);
    const rx=Math.cos(st.yaw),rz=-Math.sin(st.yaw);
    st.vx=nx*fwd+rx*side;
    st.vz=nz*fwd+rz*side;
    const lastX=st.x,lastZ=st.z;
    st.x+=st.vx*dt;st.z+=st.vz*dt;
    st.speed=fwd;
    st.lateralSpeed=side;
    st.odometer+=Math.hypot(st.x-lastX,st.z-lastZ);

    const g=height(st.x,st.z);
    const fH=height(st.x-nx*1.75,st.z-nz*1.75);
    const bH=height(st.x+nx*1.75,st.z+nz*1.75);
    const lH=height(st.x-rx*.95,st.z-rz*.95);
    const rH=height(st.x+rx*.95,st.z+rz*.95);
    const pitchTarget=clamp(Math.atan2(fH-bH,3.5),-.17,.17);
    const rollTarget=clamp(Math.atan2(lH-rH,1.9),-.20,.20);
    st.wheelPitch+=(pitchTarget-st.wheelPitch)*(1-Math.exp(-dt*7));
    st.wheelRoll+=(rollTarget-st.wheelRoll)*(1-Math.exp(-dt*7));
    st.roughness=Math.abs(fH-bH)+Math.abs(lH-rH);
    if(st.airborne) {
      st.vy-=parameters.gravity*dt;
      st.hop+=st.vy*dt;
      if(st.hop<=0){st.hop=0;st.vy=0;st.airborne=false;}
    }
    st.y=g+st.hop;
    if(environment.worldRadius) {
      const rr=Math.hypot(st.x,st.z), limit=environment.worldRadius;
      if(rr>limit) {
        const scale=limit/rr;st.x*=scale;st.z*=scale;
        st.vx*=-.16;st.vz*=-.16;
      }
    }
    sync(dt,{throttle:gas,brake,steer:wantedSteer});
    return st;
  }
  function jump(power=10) {
    if(st.airborne)return false;
    st.airborne=true;st.vy=clamp(power,4,16);st.hop=.02;
    return true;
  }
  function refill(amount=100){st.boostEnergy=clamp(st.boostEnergy+amount,0,100);}
  spawn(options.spawn||{});
  return { state:st,update,spawn,jump,refill,parameters };
}
