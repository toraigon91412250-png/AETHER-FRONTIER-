import {loadAetherCompat} from '../../integration/aether-compat.mjs';
import {createGroundDriver} from '../../teams/12/source/aether-driver.js';

export async function addVehicles(THREE,scene,exploration) {
  const [carrier,robot,rover]=await Promise.all(['09','10','12'].map(id=>loadAetherCompat({THREE,id})));
  const wilds=exploration.areas.get('wilds');
  const height=(x,z)=>wilds.module.sampleGroundWorld(x,z,0)??wilds.spawn.y;
  const modules=[carrier,robot,rover];
  for(const module of modules)scene.add(module.root);

  carrier.root.position.set(-245,58,-545);
  const spawn=carrier.toWorld({x:0,y:32.18,z:100});
  const hangarControl=carrier.toWorld({x:47,y:27.25,z:72});
  exploration.areas.set('carrier',{key:'carrier',label:'ARK VESPER',module:carrier,spawn,
    relay:exploration.beacon(spawn),contains:(x,z,y)=>y>=spawn.y-9&&carrier.sampleGroundWorld(x,z,y)!==null,
    blocked:(x,z,y)=>carrier.sampleGroundWorld(x,z,y)===null});
  const robotPosition=carrier.toWorld({x:62,y:27.18,z:70});
  robot.root.position.copy(robotPosition);
  const start=wilds.spawn.clone().add(new THREE.Vector3(10,0,3));
  const driver=createGroundDriver(rover.instance,{groundHeight:height,spawn:{x:start.x,z:start.z}});
  let hangarOpen=true;
  function action(position,zone) {
    if(zone==='carrier'&&position.distanceToSquared(robotPosition)<36) {
      const inFlight=robot.instance.getState().target===1;
      return {label:inFlight?'ARCHAION Xを人型へ':'ARCHAION Xを飛行形態へ',run:()=>robot.instance.transformTo(inFlight?'robot':'flight')};
    }
    if(zone==='carrier'&&position.distanceToSquared(hangarControl)<18) {
      return {label:hangarOpen?'格納庫シャッターを閉じる':'格納庫シャッターを開く',run:()=>{
        hangarOpen=!hangarOpen;carrier.instance.setHangarOpen(hangarOpen);
      }};
    }
    return null;
  }
  function drive(dt,controls) {
    const {x,z}=driver.state;
    const state=driver.update(dt,{throttle:Math.max(0,controls.moveY),brake:Math.max(0,-controls.moveY),
      steer:controls.moveX,boost:controls.sprint,drift:controls.dash});
    if(exploration.zoneAt(state.x,state.z,state.y)!=='wilds'){
      driver.spawn({x,z,yaw:state.yaw});
    }
    return rover.root.position;
  }
  function update(dt,zone,quality) {
    robot.root.visible=zone==='carrier'||carrier.root.visible;
    rover.root.visible=zone==='wilds';
    if(robot.root.visible)robot.update(dt,{quality});
    if(rover.root.visible)rover.update(dt,{quality});
  }
  return {carrier,robot,rover,driver,height,action,drive,update,dispose(){
    for(const module of [robot,rover]){module.root.removeFromParent();module.dispose();}
  }};
}
