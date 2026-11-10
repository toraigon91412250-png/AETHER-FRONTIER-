import {addVehicles} from './vehicles.js';
import {createExploration} from './exploration.js';
import * as THREE from './vendor/three.module.js';
import {createAetherModule as createCity} from './modules/city.js';
import {createAetherModule as createDistrict} from './modules/district.js';
import {createAetherModule as createIslands} from './modules/islands.js';
import {createAetherModule as createShip} from './modules/ship.js';
import {createAetherModule as createDrone} from './modules/drone.js';
import {createAetherModule as createDragon} from './modules/dragon.js';
import {createAetherModule as createVault} from './modules/vault.js';

export const V = (x=0,y=0,z=0) => new THREE.Vector3(x,y,z);
export const cityStart = V(3,.42,-88);
export const shipBerth = V(0,1.65,-114);
export const islandOffset = V(0,13,-440);
export const vaultOffset = V(440,45,-470);
export const arena = V(345,39,-445);
export const arenaSpawn = V(345,39,-413);

export async function createWorld(scene) {
  const exploration=await createExploration(THREE,scene);
  const vehicles=await addVehicles(THREE,scene,exploration);
  const city = createCity(THREE,{quality:'lite'});
  const district = createDistrict(THREE,{quality:'low',origin:{x:0,y:.1,z:-214}});
  const islands = createIslands(THREE,{quality:'lite',includeSky:false});
  islands.root.position.copy(islandOffset);
  const ship = createShip(THREE,{quality:'lite'});
  const drone = createDrone(THREE,{quality:'lite',mode:'hostile'});
  const dragon = createDragon(THREE,{quality:'lite'});
  const vault = createVault(THREE,{quality:'lite',includeLights:false});
  vault.root.position.copy(vaultOffset);
  for (const part of [city,district,islands,ship,drone,dragon,vault]) scene.add(part.root);
  for (const area of [city,district]) {
    area.root.traverse(object=>{
      if(object.isInstancedMesh){object.computeBoundingSphere();object.frustumCulled=true;}
    });
  }
  const dock = V(0,15.75,-368.5);
  const dockRelay = V(9,15.75,-365);
  const launchRelay = V(0,.42,-102.5);
  const recoveryRelay = V(345,39,-404);
  const vaultExit = V(445,45,-512);
  const vaultReturn = V(438,45,-457.8);
  const solid = new THREE.MeshStandardMaterial({color:0x293c51,roughness:.77,metalness:.32});
  const light = new THREE.MeshBasicMaterial({color:0x73ffec});
  const gold = new THREE.MeshBasicMaterial({color:0xffca7f});
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(46,43,2,32),solid);
  platform.position.copy(arena).y -= 1;
  const arenaGroup = new THREE.Group();
  arenaGroup.add(platform);
  scene.add(arenaGroup);
  const ring = (r,t,center,mat,parent=scene) => {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(r,t,5,48),mat);
    mesh.rotation.x = -Math.PI/2;
    mesh.position.copy(center);
    parent.add(mesh);
    return mesh;
  };
  ring(44,.12,arena.clone().add(V(0,.08)),gold,arenaGroup);
  ring(24,.065,arena.clone().add(V(0,.04)),light,arenaGroup);
  function box(w,h,d,mat,x,y,z,parent=scene) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
    mesh.position.set(x,y,z);
    parent.add(mesh);
    return mesh;
  }
  const link = new THREE.Group();
  box(13,1.5,21,solid,0,-.34,-135,link);
  for (const x of [-5.5,5.5]) box(.1,.05,20,light,x,.45,-135,link);
  scene.add(link);
  function terminal(point,material,parent=scene) {
    box(.62,1.1,.52,solid,point.x,point.y+.55,point.z,parent);
    const panel=box(.72,.13,.58,material,point.x,point.y+1.13,point.z,parent);
    panel.rotation.x=.27;
  }
  terminal(launchRelay,light,link);
  terminal(dockRelay,gold,islands.root.parent);
  terminal(vaultExit,gold,vault.root.parent);
  terminal(vaultReturn,light,vault.root.parent);
  terminal(recoveryRelay,light,arenaGroup);
  ring(6.3,.13,shipBerth.clone().setY(.49),light,link);
  ring(5.3,.10,dock.clone().add(V(0,.04)),light);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1350,24,15),new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,
    uniforms:{},
    vertexShader:'varying vec3 d; void main(){d=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec3 d; void main(){
      vec3 v=normalize(d);
      vec3 color=mix(vec3(.63,.77,.86),vec3(.08,.20,.39),smoothstep(.0,.74,v.y));
      color=mix(color,vec3(.50,.61,.76),smoothstep(.02,.55,-v.y));
      float s=max(dot(v,normalize(vec3(-.61,.29,-.69))),0.);
      color+=vec3(.33,.21,.13)*pow(s,18.)+vec3(.62,.52,.37)*smoothstep(.997,.999,s);
      gl_FragColor=vec4(color,1.);
    }`
  }));
  sky.renderOrder=-100;
  scene.add(sky);
  const marker = new THREE.Group();
  const markerMesh = new THREE.Mesh(new THREE.OctahedronGeometry(.53),gold);
  marker.add(markerMesh);
  ring(1.32,.055,V(),gold,marker);
  scene.add(marker);
  scene.fog = new THREE.FogExp2(0x9ab6cf,.00265);
  scene.add(new THREE.HemisphereLight(0xd6edff,0x5c5b80,2.1));
  const sun = new THREE.DirectionalLight(0xffe7c6,2.1);
  sun.position.set(-100,160,-80);
  scene.add(sun);

  function zoneAt(x,z,feet) {
    const added=exploration.zoneAt(x,z,feet);
    if(added)return added;
    if (feet>32 && Math.abs(x-vaultOffset.x)<21 && z<vaultOffset.z+17 && z>vaultOffset.z-51) return 'vault';
    if (Math.hypot(x-arena.x,z-arena.z)<45.5) return 'arena';
    const b=district.bounds;
    if (x>=b.minX&&x<=b.maxX&&z>=b.minZ&&z<=b.maxZ) return 'district';
    if (Math.abs(x)<=6.4&&z>=-145&&z<=-126) return 'bridge';
    if (Math.hypot(x,z)<=134.2) return 'city';
    if (z<-318&&x<158) return 'islands';
    return 'air';
  }
  const local = V();
  function ground(x,z,feet) {
    const zone=zoneAt(x,z,feet);
    const area=exploration.areas.get(zone);
    if(area)return area.module.sampleGroundWorld(x,z,feet)??-Infinity;
    switch(zone) {
      case 'city': return city.getFloorHeight(x,z,feet);
      case 'district': return district.getGroundHeight(x,z,feet);
      case 'bridge': return .42;
      case 'islands': return (islands.sampleGround(x-islandOffset.x,z-islandOffset.z,feet-islandOffset.y)?.height??-Infinity)+islandOffset.y;
      case 'vault': return vault.isWalkable(x-vaultOffset.x,z-vaultOffset.z)?vaultOffset.y:-Infinity;
      case 'arena': return arena.y;
      default: return -Infinity;
    }
  }
  const vaultColliders = vault.getColliders().filter(c=>c.type==='cylinder');
  function resolve({previous,proposed,radius,height}) {
    const added=exploration.resolve(previous,proposed,radius);
    if(added)return added;
    const zone=zoneAt(proposed.x,proposed.z,previous.y);
    const before=zoneAt(previous.x,previous.z,previous.y);
    if (zone==='city') {
      const {x,z}=city.resolveHorizontal(proposed.x,proposed.z,previous.x,previous.z,previous.y);
      proposed.x=x;proposed.z=z;
    } else if (zone==='district') {
      return district.resolveMovement(previous,proposed,radius,height);
    } else if (zone==='islands') {
      local.copy(proposed).sub(islandOffset);
      islands.resolveFootCollision(local,radius);
      proposed.copy(local).add(islandOffset);
    } else if (zone==='vault'||before==='vault') {
      const x=proposed.x-vaultOffset.x,z=proposed.z-vaultOffset.z;
      const px=previous.x-vaultOffset.x,pz=previous.z-vaultOffset.z;
      const blocked=vaultColliders.some(c=>Math.hypot(x-c.center.x,z-c.center.z)<c.radius+radius);
      if (blocked||!vault.isPassageClear(px,pz,x,z)) {
        proposed.x=previous.x;proposed.z=previous.z;
      }
    }
    return proposed;
  }
  function updateVisibility(position,zone,flying,high) {
    const z=position.z,x=position.x;
    const outdoors=zone!=='vault';
    city.root.visible=outdoors && x<190 && z>(high?-530:-415);
    district.root.visible=outdoors && x<190 && z>-475 && (flying||z<(high?-72:-101));
    islands.root.visible=outdoors && x<275 && z<(high?-83:-183);
    link.visible=city.root.visible;
    vault.root.visible=zone==='vault';
    arenaGroup.visible=zone==='arena'||(flying&&x>140);
    scene.fog.density=high?.0021:.0031;
  }
  return {exploration,vehicles,city,district,islands,ship,drone,dragon,vault,sky,marker,markerMesh,zoneAt,ground,resolve,updateVisibility,
    dock,dockRelay,launchRelay,recoveryRelay,vaultExit,vaultReturn};
}
