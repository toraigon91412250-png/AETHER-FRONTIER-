/**
 * AETHER FRONTIER / No.08 - independent arcade flight controller.
 * No camera, renderer, DOM, global input or scene dependencies.
 * Input fields (normalized -1..1): yaw, pitch, lift, throttle, strafe,
 * boost (boolean), brake (boolean). Returns a plain flight telemetry object.
 */
export class AetherFlightController {
  constructor(THREE, options={}) {
    this.THREE=THREE;
    this.position=new THREE.Vector3(...(options.position||[0,18,40]));
    this.quaternion=new THREE.Quaternion();
    this.euler=new THREE.Euler(0,0,0,'YXZ');
    this.yaw=0;this.pitch=0;this.bank=0;
    this.speed=0;this.throttle=.32;this.liftVelocity=0;this.boosting=false;
    this.energy=100;this.tier=1;this.travelled=0;
    this.minAltitude=options.minAltitude??5;
    this.maxAltitude=options.maxAltitude??280;
    this.maxRange=options.maxRange??1600;
    this.maxSpeedByTier=options.maxSpeedByTier||[160,200,240];
    this.boostMultiplier=options.boostMultiplier??2.35;
    this._move=new THREE.Vector3();
    this._forward=new THREE.Vector3();
    this._right=new THREE.Vector3();
    this._lift=new THREE.Vector3(0,1,0);
    this._yawDirection=0;
  }
  reset(position=[0,18,40]){
    this.position.set(...position);this.yaw=0;this.pitch=0;this.bank=0;
    this.euler.set(0,0,0,'YXZ');this.quaternion.setFromEuler(this.euler);
    this.speed=0;this.throttle=.32;this.liftVelocity=0;this.boosting=false;
    this.energy=100;this.tier=1;this.travelled=0;
  }
  setTier(tier){this.tier=Math.max(1,Math.min(this.maxSpeedByTier.length,Math.round(tier)||1));}
  get maxSpeed(){return this.maxSpeedByTier[this.tier-1];}
  update(dt,input={}) {
    dt=Math.min(Math.max(Number(dt)||0,0),.055);
    const clamp=this.THREE.MathUtils.clamp;
    const yaw=clamp(input.yaw||0,-1,1), pitch=clamp(input.pitch||0,-1,1);
    const lift=clamp(input.lift||0,-1,1), th=clamp(input.throttle||0,-1,1);
    const strafe=clamp(input.strafe||0,-1,1);
    const braking=!!input.brake;
    // Airbrake snaps throttle to idle so the craft does not automatically accelerate.
    this.throttle=braking?0:clamp(this.throttle+th*dt*1.20,0,1);
    this.boosting=!!input.boost&&this.throttle>.10&&!braking;
    const limit=this.maxSpeed*(this.boosting?this.boostMultiplier:1);
    const target=braking?0:this.throttle*limit;
    const response=braking?7:2.35;
    this.speed+=(target-this.speed)*(1-Math.exp(-dt*response));
    if(this.speed<.015)this.speed=0;
    this.energy=100; // Legacy telemetry preserved; hyperdrive is unlimited.
    // Yaw slows smoothly with speed; old controller spun faster at high velocity.
    const steerRate=.26+1.30/(1+this.speed/125);
    this.yaw-=yaw*dt*steerRate;
    this.pitch=clamp(this.pitch+pitch*dt*.68,-.32,.34);
    if(Math.abs(pitch)<.04)this.pitch*=Math.max(0,1-dt*.11);
    const bankGoal=-yaw*.45-strafe*.18;
    this.bank+=(bankGoal-this.bank)*(1-Math.exp(-dt*3.6));
    this.euler.set(this.pitch,this.yaw,this.bank,'YXZ');
    this.quaternion.setFromEuler(this.euler);
    this._forward.set(0,0,-1).applyQuaternion(this.quaternion);
    this._right.set(1,0,0).applyQuaternion(this.quaternion);
    this._move.copy(this._forward).multiplyScalar(this.speed*dt);
    this._move.addScaledVector(this._right,strafe*dt*16);
    const verticalTarget=lift*42;
    this.liftVelocity+=(verticalTarget-this.liftVelocity)*(1-Math.exp(-dt*4.1));
    this._move.y=clamp(this._move.y+this.liftVelocity*dt,-85*dt,85*dt);
    const travelled=this._move.length();this.position.add(this._move);this.travelled+=travelled;
    if(this.position.y<this.minAltitude){this.position.y=this.minAltitude;this.liftVelocity=Math.max(0,this.liftVelocity);this.pitch=Math.max(0,this.pitch);}
    if(this.position.y>this.maxAltitude){this.position.y=this.maxAltitude;this.liftVelocity=Math.min(0,this.liftVelocity);}
    const newX=clamp(this.position.x,-this.maxRange,this.maxRange);
    const newZ=clamp(this.position.z,-this.maxRange,this.maxRange);
    if(newX!==this.position.x||newZ!==this.position.z){
      this.speed=Math.min(this.speed,36);this.throttle=0;this.boosting=false;
    }
    this.position.x=newX;this.position.z=newZ;
    return this.telemetry(this.boosting);
  }
  telemetry(boost=false){return {
    speed:this.speed,throttle:this.throttle,boost,energy:this.energy,
    hyperdrive:this.boosting,hyperMaxSpeed:this.maxSpeed*this.boostMultiplier,
    altitude:this.position.y,heading:(this.yaw*180/Math.PI+360)%360,
    pitch:this.pitch,roll:this.bank,tier:this.tier,maxSpeed:this.maxSpeed,
    position:this.position,quaternion:this.quaternion,landing:this.speed<3&&this.position.y<9,
    distance:this.travelled
  };}
}
