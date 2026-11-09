/**
 * AETHER FRONTIER | No.12 | RH-06 RIFT HOUND
 * Three.js r160 | Z forward is NEGATIVE | Y up | 1 unit = 1 m.
 * Pure visual module: no renderer, camera, input, scene, or physics dependencies.
 * MIT-style original game code. Requires three@0.160.0.
 */
export function createAetherModule(THREE, options = {}) {
  const root = new THREE.Group();
  root.name = 'NO12_RH06_RIFT_HOUND';
  root.userData.aether = { id: 'No12-RH06', category: 'ground-vehicle', forward: '-Z', metersPerUnit: 1 };
  const sculpture = new THREE.Group();
  root.add(sculpture);
  const decoration = new THREE.Group();
  sculpture.add(decoration);
  const shadowed = [];
  const geometries = new Set();
  const geometryCache = new Map();
  const materials = new Set();
  const wheels = [];
  const suspensionArms = [];
  const lightJets = [];
  const activeParts = [];
  let disposed = false;
  let quality = options.quality === 'high' ? 'high' : 'low';
  let clock = 0;
  let wheelAngle = 0;
  let drive = { speed: 0, steering: 0, drift: 0, boost: 0, throttle: 0, brake: 0, yawRate: 0, airborne: 0, groundRoughness: 0 };

  function mat(name, color, metalness = .4, roughness = .45, emissive = 0x000000, intensity = 0) {
    const m = new THREE.MeshStandardMaterial({ name, color, metalness, roughness, emissive, emissiveIntensity: intensity });
    materials.add(m);
    return m;
  }
  const M = {
    under: mat('ceramic graphite', 0x101b29, .64, .43),
    frame: mat('titanium exoskeleton', 0x35465a, .83, .28),
    shell: mat('pearl white armour', 0xc8dde2, .65, .27),
    shellDark: mat('petrol blue armour', 0x1a3d51, .68, .27),
    copper: mat('ritual gold fittings', 0xb99759, .81, .24),
    tire: mat('carbon elastomer', 0x0b1017, .12, .88),
    tread: mat('carbon tread', 0x29323b, .20, .85),
    glass: mat('canopy glass', 0x123951, .52, .18, 0x00687b, .27),
    core: mat('aether energy crystal', 0x74f7eb, .24, .15, 0x11c9cd, 2.6),
    glow: mat('aether light strips', 0x2be3e6, .10, .26, 0x13bdcf, 2.45),
    glowWarm: mat('amber running lamps', 0xffbd68, .12, .36, 0xff822a, 2.2),
    glowRed: mat('rear brake lamp', 0xff5973, .15, .33, 0xfa123d, 2.0),
    inner: mat('mechanical inner assembly', 0x718490, .9, .24)
  };
  M.glass.transparent = true; M.glass.opacity = .84; M.glass.depthWrite = true;

  function geo(type, ...p) {
    const key=type+':'+p.join(',');
    if(geometryCache.has(key))return geometryCache.get(key);
    let g;
    if (type === 'box') g = new THREE.BoxGeometry(...p);
    else if (type === 'cylinder') g = new THREE.CylinderGeometry(...p);
    else if (type === 'sphere') g = new THREE.SphereGeometry(...p);
    else if (type === 'torus') g = new THREE.TorusGeometry(...p);
    else if (type === 'cone') g = new THREE.ConeGeometry(...p);
    else if (type === 'octa') g = new THREE.OctahedronGeometry(...p);
    else throw Error('Unknown geometry ' + type);
    geometries.add(g);geometryCache.set(key,g);
    return g;
  }
  function mesh(g, m, parent = sculpture, cast = true) {
    const o = new THREE.Mesh(g, m); parent.add(o);
    if (cast) { o.castShadow = true; o.receiveShadow = true; shadowed.push(o); }
    return o;
  }
  function box(parent, m, w, h, d, x, y, z, rx = 0, ry = 0, rz = 0, cast = true) {
    const a = mesh(geo('box', w, h, d), m, parent, cast); a.position.set(x,y,z); a.rotation.set(rx,ry,rz); return a;
  }
  function sphere(parent,m,r,x,y,z,segments=12) {
    const a = mesh(geo('sphere',r,segments,Math.max(8,Math.round(segments*.66))),m,parent); a.position.set(x,y,z); return a;
  }
  function beam(parent,m,a,b,r=.045,sides=6) {
    const v = new THREE.Vector3().subVectors(new THREE.Vector3(...b),new THREE.Vector3(...a));
    const c = mesh(geo('cylinder',r,r,v.length(),sides),m,parent);
    c.position.set((a[0]+b[0])*.5,(a[1]+b[1])*.5,(a[2]+b[2])*.5);
    c.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());
    return c;
  }
  function loft(parent, sections, material) {
    const p=[],ind=[];
    // Rectangular tapered cross sections, unshared flat face normals for crisp faceting.
    for (const s of sections) {
      p.push(-s.w,s.lo,s.z, s.w,s.lo,s.z, s.w,s.hi,s.z, -s.w,s.hi,s.z);
    }
    for(let i=0;i<sections.length-1;i++) {
      const a=i*4,b=(i+1)*4;
      for(const [c,d] of [[0,1],[1,2],[2,3],[3,0]]) {
        ind.push(a+c,a+d,b+d, a+c,b+d,b+c);
      }
    }
    ind.push(0,3,2,0,2,1);
    const n=(sections.length-1)*4; ind.push(n,n+1,n+2,n,n+2,n+3);
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(ind);g.computeVertexNormals();geometries.add(g);
    return mesh(g,material,parent);
  }
  const chassis = new THREE.Group(); sculpture.add(chassis);
  loft(chassis,[
    {z:-2.61,w:.19,lo:.91,hi:1.06},
    {z:-2.29,w:.52,lo:.77,hi:1.26},
    {z:-1.76,w:.69,lo:.68,hi:1.44},
    {z:-.78,w:.82,lo:.66,hi:1.54},
    {z:.63,w:.84,lo:.68,hi:1.53},
    {z:1.61,w:.75,lo:.72,hi:1.38},
    {z:2.38,w:.48,lo:.82,hi:1.18},
    {z:2.61,w:.20,lo:.93,hi:1.02}
  ], M.shellDark);
  box(chassis,M.under,1.34,.22,4.34,0,.75,-.02);
  box(chassis,M.frame,1.40,.105,4.05,0,.84,.03);
  // Forward armored spear and splitter.
  loft(chassis,[
    {z:-2.77,w:.13,lo:1.01,hi:1.08},
    {z:-2.40,w:.36,lo:1.04,hi:1.25},
    {z:-1.80,w:.53,lo:1.19,hi:1.47},
    {z:-1.23,w:.62,lo:1.36,hi:1.60},
    {z:-.87,w:.61,lo:1.48,hi:1.64}
  ],M.shell);
  // Cockpit shoulders and crystal-glass faceted bubble.
  loft(chassis,[
    {z:-.82,w:.48,lo:1.44,hi:1.54},
    {z:-.50,w:.54,lo:1.50,hi:1.83},
    {z:.05,w:.57,lo:1.48,hi:2.10},
    {z:.65,w:.54,lo:1.43,hi:2.02},
    {z:1.15,w:.41,lo:1.37,hi:1.64}
  ], M.glass);
  beam(chassis,M.copper,[-.55,1.65,-.54],[-.54,2.08,.20],.029);
  beam(chassis,M.copper,[.55,1.65,-.54],[.54,2.08,.20],.029);
  beam(chassis,M.copper,[-.53,2.05,.27],[.53,2.05,.27],.02);
  box(chassis,M.frame,.54,.10,.72,0,1.51,1.11);
  // Dark lateral armour, wedge-shaped fenders and programmable rune traces.
  for(const side of [-1,1]) {
    const s=side;
    box(chassis,M.frame,.19,.43,3.60,s*.80,1.03,.05);
    beam(chassis,M.glow,[s*.82,1.30,-1.91],[s*.87,1.28,-.45],.027);
    beam(chassis,M.glow,[s*.87,1.28,-.45],[s*.87,1.18,1.48],.031);
    beam(chassis,M.copper,[s*.73,1.42,-1.72],[s*.85,1.45,-.64],.032);
    beam(chassis,M.copper,[s*.85,1.46,-.62],[s*.83,1.44,.72],.021);
    box(chassis,M.shell,.26,.14,1.32,s*.64,1.38,-1.23,0,0,s*.12);
    box(chassis,M.shell,.30,.18,.96,s*.69,1.37,1.41,0,0,s*.15);
    box(chassis,M.under,.19,.10,1.42,s*.87,.77,.05);
    // Twin floating sidepods.
    loft(chassis,[
      {z:-1.67,w:.10,lo:.92,hi:1.12},
      {z:-1.16,w:.22,lo:.92,hi:1.34},
      {z:-.54,w:.20,lo:.93,hi:1.30},
      {z:.68,w:.20,lo:.96,hi:1.22},
      {z:1.77,w:.17,lo:.92,hi:1.22},
      {z:2.15,w:.08,lo:1.01,hi:1.08}
    ],M.shellDark).position.x=s*1.07;
    for(let i=0;i<4;i++) {
      const z=-.48+i*.57;
      box(decoration,M.copper,.12,.03,.18,s*1.22,1.235,z,0,0,s*.34,false);
    }
    // Auxiliary front lamps.
    box(chassis,M.glow,.21,.075,.28,s*.41,1.27,-2.12,0,s*.06,s*.15,false);
    box(chassis,M.glowWarm,.13,.065,.16,s*.76,1.25,-1.88,0,0,0,false);
    // Wheel arch guards (segmented, leave tyre profile exposed).
    for(const z of [-1.66,.10,1.70]) {
      box(chassis,M.shell,.34,.10,1.10,s*1.26,1.32,z,0,0,s*.10);
      box(decoration,M.frame,.15,.30,.25,s*1.35,1.12,z-.36,0,0,s*.14);
      box(decoration,M.frame,.15,.28,.24,s*1.35,1.12,z+.36,0,0,s*.14);
    }
  }
  // Underbody magical drive core and revolving horizontal rings.
  const coreGroup=new THREE.Group();coreGroup.position.set(0,1.57,1.58);chassis.add(coreGroup);
  mesh(geo('octa',.29,1),M.core,coreGroup,false);
  const coreRing=mesh(geo('torus',.40,.025,5,24),M.glow,coreGroup,false);
  coreRing.rotation.x=Math.PI*.43;
  const coreRing2=mesh(geo('torus',.38,.020,5,24),M.copper,coreGroup,false);
  coreRing2.rotation.y=.67;
  for (let i=0;i<3;i++) {
    const arm = new THREE.Group(); arm.position.set((i-1)*.35,1.47,2.18);chassis.add(arm);
    box(arm,M.frame,.24,.19,.54,0,0,0);
    const cone=mesh(geo('cone',.11,.30,7),M.glow,arm,false);cone.position.z=.37; cone.rotation.x=Math.PI*.5;
    lightJets.push(cone);
  }
  // Rear active aero and articulated braking wing.
  const wingPivot=new THREE.Group();wingPivot.position.set(0,1.65,1.65);chassis.add(wingPivot);
  for(const s of [-1,1]) {
    beam(wingPivot,M.frame,[s*.44,-.22,.25],[s*.80,.12,.54],.07);
    box(wingPivot,M.shell,.80,.06,.46,s*.70,.14,.54,0,0,s*.03);
    box(wingPivot,M.glowRed,.68,.034,.07,s*.72,.18,.75,0,0,0,false);
  }
  box(wingPivot,M.copper,.22,.08,.54,0,.15,.54);
  box(chassis,M.glowRed,.96,.08,.055,0,1.12,2.45,0,0,0,false);
  // Mechanical wheel assemblies. Each wheel is steerable, spins, and independently suspends.
  const wheelPositions=[[-1.27,-1.70],[1.27,-1.70],[-1.32,.08],[1.32,.08],[-1.28,1.72],[1.28,1.72]];
  for(let wi=0;wi<wheelPositions.length;wi++) {
    const [wx,wz]=wheelPositions[wi];const s=Math.sign(wx);
    const suspension=new THREE.Group();suspension.position.set(wx,.69,wz);sculpture.add(suspension);
    const steer=new THREE.Group();suspension.add(steer);
    const rolling=new THREE.Group();steer.add(rolling);
    const tyre=mesh(geo('cylinder',.647,.647,.36,24),M.tire,rolling);
    tyre.rotation.z=Math.PI*.5;
    for(const edge of [-1,1]) {
      const x=edge*.184;
      const rim=mesh(geo('torus',.49,.063,8,24),M.tread,rolling);rim.rotation.y=Math.PI*.5;rim.position.x=x;
      const emissive=mesh(geo('torus',.393,.024,6,32),M.glow,rolling,false);emissive.rotation.y=Math.PI*.5;emissive.position.x=x+edge*.007;
      const hub=mesh(geo('cylinder',.20,.20,.015,16),M.frame,rolling);hub.rotation.z=Math.PI*.5;hub.position.x=x+edge*.012;
      const axis=mesh(geo('cylinder',.075,.075,.04,10),M.copper,rolling);axis.rotation.z=Math.PI*.5;axis.position.x=x+edge*.029;
      for(let n=0;n<8;n++) {
        const angle=n*Math.PI/4;
        const sp=beam(rolling,M.inner,[x+edge*.023,Math.sin(angle)*.22,Math.cos(angle)*.22],
          [x+edge*.023,Math.sin(angle)*.36,Math.cos(angle)*.36],.021,5);
        activeParts.push(sp);
      }
    }
    for(let t=0;t<12;t++) {
      const angle=t*Math.PI/6;
      const treadReal=box(rolling,M.tread,.39,.056,.18,0,Math.sin(angle)*.619,Math.cos(angle)*.619,angle,0,0);
      activeParts.push(treadReal);
    }
    // A shock absorber, outer armor knuckle, and strut visually reacting to terrain.
    const knuckle=new THREE.Group(); suspension.add(knuckle);
    box(knuckle,M.frame,.22,.39,.30,-s*.19,.11,0,0,0,s*.18);
    beam(knuckle,M.copper,[-s*.30,.18,-.25],[-s*.30,.18,.24],.042);
    const arm = beam(sculpture,M.frame,[s*.70,1.01,wz],[s*1.12,.75,wz],.064);
    suspensionArms.push({arm,wx,wz});
    wheels.push({suspension,steer,rolling,wx,wz,front:wi<2});
  }
  // Chassis belly air channels, side stabilizers and fine gold rune markings.
  for(const s of [-1,1]) {
    beam(chassis,M.frame,[s*.60,.70,-2.05],[s*.84,.76,2.13],.05);
    for(let i=0;i<6;i++) {
      const z=-.87+i*.32;
      beam(decoration,M.glow,[s*.70,1.53,z],[s*.79,1.47,z+.15],.015,5);
    }
    box(chassis,M.glow,.065,.054,.80,s*.30,1.46,-2.01,0,0,s*.14,false);
  }
  // Front emblem: tri-point aether rune.
  const badge=new THREE.Group();badge.position.set(0,1.605,-1.35);chassis.add(badge);
  beam(badge,M.glow,[0,.035,-.24],[-.14,.017,.14],.022);
  beam(badge,M.glow,[0,.035,-.24],[.14,.017,.14],.022);
  beam(badge,M.glow,[-.14,.017,.14],[.14,.017,.14],.022);

  function setDriveState(state={}) { drive={...drive,...state}; }
  function setQuality(mode) {
    quality = mode === 'high' || mode === 'quality' ? 'high' : 'low';
    decoration.visible=quality==='high';
    for(const o of activeParts) o.visible=quality==='high';
    for(const o of shadowed) { o.castShadow=quality==='high'; o.receiveShadow=quality==='high'; }
    M.glass.opacity=quality==='high'?.84:.91;
    return quality;
  }
  function update(dt=0,context={}) {
    if(disposed)return;
    dt=Math.max(0,Math.min(.07,Number.isFinite(dt)?dt:0));clock+=dt;
    const v=Math.abs(drive.speed||0);
    wheelAngle-= (drive.speed||0) / .645 * dt;
    const steer=drive.steering||0;
    for(let i=0;i<wheels.length;i++) {
      const w=wheels[i];
      const n=Math.sin(clock*15+i*1.5)*Math.min(.025,(v/60)*.022);
      const target= -Math.min(.13,Math.abs(drive.groundRoughness||0)*.08)+n;
      w.suspension.position.y=.69+target;
      w.steer.rotation.y=w.front? -steer*.43 : (i>3?steer*.065:0);
      w.rolling.rotation.x=wheelAngle;
    }
    const drift=drive.drift||0,boost=drive.boost||0;
    chassis.position.y=Math.sin(clock*19)*Math.min(.019,v*.00028)+(drive.airborne?-.014:0);
    chassis.rotation.z=THREE.MathUtils.damp(chassis.rotation.z,-steer*Math.min(.095,v*.0017)-drift*steer*.07,7,dt);
    chassis.rotation.x=THREE.MathUtils.damp(chassis.rotation.x,-Math.min(.09,drive.throttle*.06)+Math.min(.065,drive.brake*.05),5,dt);
    wingPivot.rotation.x=THREE.MathUtils.damp(wingPivot.rotation.x,boost?.35:-Math.min(.10,v*.0015),6,dt);
    coreRing.rotation.z+=dt*(1+v*.027);coreRing2.rotation.y-=dt*(.8+boost*2);
    coreGroup.rotation.y+=dt*.23;
    for(let j=0;j<lightJets.length;j++){
      const jet=lightJets[j];jet.scale.setScalar(1);
      jet.scale.y=.5+boost*1.9+.12*Math.sin(clock*37+j);
      jet.visible=v>2||boost>.1;
    }
    M.glow.emissiveIntensity=2.0+boost*2.3+Math.sin(clock*3)*.25;
    M.glowRed.emissiveIntensity=(drive.brake>.1?4:1.6);
  }
  function dispose() {
    if(disposed)return;disposed=true;
    if(root.parent)root.parent.remove(root);
    for(const g of geometries)g.dispose();
    for(const m of materials)m.dispose();
    root.clear();
  }
  setQuality(quality);
  return { root, update, setQuality, dispose, setDriveState, get quality(){return quality;},
    info: { name:'RH-06 RIFT HOUND', length:5.6, width:3.0, wheelCount:6, drive:'six-wheel terrestrial aether turbine', version:'1.0.0' } };
}
