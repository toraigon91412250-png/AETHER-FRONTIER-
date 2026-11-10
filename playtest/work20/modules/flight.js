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
    this.speed=0;this.throttle=.32;this.liftVelocity=0;
    this.energy=100;this.tier=1;this.travelled=0;
    this.minAltitude=options.minAltitude??5;
    this.maxAltitude=options.maxAltitude??230;
    this.maxRange=options.maxRange??850;
    this.maxSpeedByTier=options.maxSpeedByTier||[27,38,52];
    this._move=new THREE.Vector3();
    this._forward=new THREE.Vector3();
    this._right=new THREE.Vector3();
    this._lift=new THREE.Vector3(0,1,0);
    this._yawDirection=0;
  }
  reset(position=[0,18,40]){
    this.position.set(...position);this.yaw=0;this.pitch=0;this.bank=0;
    this.euler.set(0,0,0,'YXZ');this.quaternion.setFromEuler(this.euler);
    this.speed=0;this.throttle=.32;this.liftVelocity=0;
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
    this.throttle=clamp(this.throttle+th*dt*.46,0,1);
    const boost=!!input.boost && this.energy>1 && this.throttle>.10 && !input.brake;
    const limit=this.maxSpeed*(boost?1.55:1);
    const target=input.brake?0:this.throttle*limit;
    const response=input.brake?4.5:1.65;
    this.speed+=(target-this.speed)*Math.min(1,dt*response);
    this.energy=clamp(this.energy+dt*(boost?-21:9.5),0,100);
    const steerRate=.78+.017*this.speed;
    this.yaw-=yaw*dt*steerRate;
    this.pitch=clamp(this.pitch+pitch*dt*.70,-.50,.53);
    if(Math.abs(pitch)<.04)this.pitch*=Math.max(0,1-dt*.09);
    const bankGoal=-yaw*.52-strafe*.2;
    this.bank+=(bankGoal-this.bank)*Math.min(1,dt*3.4);
    this.euler.set(this.pitch,this.yaw,this.bank,'YXZ');
    this.quaternion.setFromEuler(this.euler);
    this._forward.set(0,0,-1).applyQuaternion(this.quaternion);
    this._right.set(1,0,0).applyQuaternion(this.quaternion);
    this._move.copy(this._forward).multiplyScalar(this.speed*dt);
    this._move.addScaledVector(this._right,strafe*dt*7);
    const verticalTarget=lift*12.5;
    this.liftVelocity+=(verticalTarget-this.liftVelocity)*Math.min(1,dt*3.3);
    this._move.y+=this.liftVelocity*dt;
    const travelled=this._move.length();this.position.add(this._move);this.travelled+=travelled;
    if(this.position.y<this.minAltitude){this.position.y=this.minAltitude;this.liftVelocity=Math.max(0,this.liftVelocity);this.pitch=Math.max(0,this.pitch);}
    if(this.position.y>this.maxAltitude){this.position.y=this.maxAltitude;this.liftVelocity=Math.min(0,this.liftVelocity);}
    this.position.x=clamp(this.position.x,-this.maxRange,this.maxRange);
    this.position.z=clamp(this.position.z,-this.maxRange,this.maxRange);
    return this.telemetry(boost);
  }
  telemetry(boost=false){return {
    speed:this.speed,throttle:this.throttle,boost,energy:this.energy,
    altitude:this.position.y,heading:(this.yaw*180/Math.PI+360)%360,
    pitch:this.pitch,roll:this.bank,tier:this.tier,maxSpeed:this.maxSpeed,
    position:this.position,quaternion:this.quaternion,landing:this.speed<3&&this.position.y<9,
    distance:this.travelled
  };}
}
