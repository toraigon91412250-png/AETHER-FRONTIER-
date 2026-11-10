import {loadAetherCompat} from '../../integration/aether-compat.mjs';

export async function createExploration(THREE, scene) {
  const vec = (x, y, z) => new THREE.Vector3(x, y, z);
  const definitions = [
    ['04', 'temple', '星環神殿', [-300, 12, 0]],
    ['05', 'lab', '地下研究施設', [-340, 12, -250]],
    ['06', 'plant', '工業プラント', [250, 8, 0]],
    ['07', 'wilds', '星脈荒野', [650, 4, -80]],
  ];
  const areas = new Map();
  const hub = vec(8, .42, -98);
  const markers = new THREE.Group();
  const geometry = new THREE.CylinderGeometry(.65, .88, 1.35, 8);
  const material = new THREE.MeshStandardMaterial({color:0x1b586b,emissive:0x14817d,emissiveIntensity:.65});
  scene.add(markers);

  function beacon(position, parent) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position).y += .67;
    parent.add(mesh);
    return mesh;
  }

  for (const [id, key, label, origin] of definitions) {
    const module = await loadAetherCompat({THREE,id});
    module.root.position.set(...origin);
    scene.add(module.root);
    let spawn = module.getSpawnWorld();
    if (key === 'wilds') spawn = module.toWorld({x:0,y:module.instance.surfaceHeight(0,23),z:23});
    spawn.y = module.sampleGroundWorld(spawn.x,spawn.z,spawn.y) ?? spawn.y;
    const relay = beacon(spawn,markers);
    const bounds=key==='lab'?module.instance.getAreas():null;
    const contains=bounds?(x,z,y)=>y<module.root.position.y+6&&bounds.some(b=>
      x>=origin[0]+b.x1&&x<=origin[0]+b.x2&&z>=origin[2]+b.z1&&z<=origin[2]+b.z2):null;
    areas.set(key,{key,label,module,spawn,relay,contains});
  }
  beacon(hub,markers);

  function zoneAt(x,z,y) {
    for (const [key,{module,contains}] of areas) {
      if(contains?.(x,z,y))return key;
      const p=module.root.position;
      const dx=x-p.x,dz=z-p.z;
      if (key==='temple' && Math.abs(dx)<=49 && dz>=-97 && dz<=60) return key;
      if (key==='plant' && Math.abs(dx)<=45 && Math.abs(dz)<=49) return key;
      if (key==='wilds' && Math.abs(dx)<=344 && Math.abs(dz)<=344) return key;
    }
    return null;
  }

  function resolve(previous,proposed,radius) {
    const before=zoneAt(previous.x,previous.z,previous.y);
    const area=areas.get(zoneAt(proposed.x,proposed.z,previous.y));
    if (!area && !areas.has(before)) return null;
    if (!area || (area.blocked||area.module.isBlockedWorld)(proposed.x,proposed.z,previous.y,radius)) {
      proposed.x=previous.x;
      proposed.z=previous.z;
    }
    return proposed;
  }

  function update(dt,position,zone,quality,flying) {
    const range=quality==='high'?620:flying?460:190;
    const indoors=zone==='lab'||zone==='vault';
    for (const {key,module,relay} of areas.values()) {
      module.root.visible=zone===key||(!indoors&&key!=='lab'&&
        module.root.position.distanceToSquared(position)<range**2);
      relay.visible=module.root.visible;
      if(module.root.visible)module.update(dt,{playerPosition:position,quality});
    }
  }

  return {areas,hub,beacon:position=>beacon(position,markers),zoneAt,resolve,update,dispose(){
    for (const {module} of areas.values()) {module.root.removeFromParent();module.dispose();}
    markers.removeFromParent();
    geometry.dispose();
    material.dispose();
  }};
}
