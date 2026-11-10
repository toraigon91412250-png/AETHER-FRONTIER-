/**
 * AETHER FRONTIER / Team 15
 * VESPER PRISM  |  星環裂刃
 * Three.js r160, Y-up, forward -Z, meters.
 * Visual-only weapon. No renderer, camera, input, damage or game-state dependencies.
 *
 * import { createAetherModule } from './aether15_weapon.js';
 * const weapon = createAetherModule(THREE, { quality: 'high' });
 * scene.add(weapon.root);
 * weapon.update(deltaSeconds, { charge: 0.6 });
 */
export function createAetherModule(THREE, options = {}) {
  const root = new THREE.Group();
  root.name = 'AF15_VESPER_PRISM';
  root.userData = { id: 'AF-15', weapon: 'VESPER PRISM', kind: 'arcane split-blade', forward: '-Z', unit: 'meter' };
  const rig = new THREE.Group();
  rig.name = 'AnimatedWeaponAssembly';
  root.add(rig);
  const high = new THREE.Group();
  high.name = 'HighQualityDetails';
  rig.add(high);
  const glowHigh = new THREE.Group();
  glowHigh.name = 'HighQualityAura';
  rig.add(glowHigh);

  const geometries = new Set();
  const materials = new Set();
  const ownG = g => (geometries.add(g), g);
  const ownM = m => (materials.add(m), m);
  const material = (color, metalness, roughness, emissive = null, intensity = 0) => ownM(new THREE.MeshStandardMaterial({
    color, metalness, roughness, emissive: emissive ?? 0x000000, emissiveIntensity: intensity, side: THREE.DoubleSide
  }));
  const mat = {
    dark: material(0x111d2b, .82, .31),
    graphite: material(0x253545, .8, .34),
    steel: material(0x68899d, .87, .22),
    pearl: material(0xb2c7d0, .75, .23),
    gold: material(0xd8a56b, .8, .27),
    deepGold: material(0x72543b, .88, .35),
    black: material(0x08111d, .48, .43),
    grip: material(0x17242c, .24, .77),
    neon: material(0x60dcf9, .19, .25, 0x1fa8e7, 2.1),
    white: material(0xb1f5ff, .1, .2, 0x9defff, 2.35),
    amber: material(0xfbd49a, .28, .19, 0xffab58, 1.6),
  };
  const energyMat = ownM(new THREE.MeshBasicMaterial({color: 0x39baff, transparent: true, opacity: .77, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide}));
  const bladeWhiteMat = ownM(new THREE.MeshBasicMaterial({color: 0xc6f7ff, transparent: true, opacity: .77, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide}));
  const haloMat = ownM(new THREE.MeshBasicMaterial({color: 0x37c9ff, transparent: true, opacity: .13, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide}));
  const moteMat = ownM(new THREE.MeshBasicMaterial({color: 0x88eaff, transparent: true, opacity: .8, depthWrite: false, blending: THREE.AdditiveBlending}));

  function mesh(geometry, m, parent = rig, name = '') {
    const obj = new THREE.Mesh(ownG(geometry), m);
    if (name) obj.name = name;
    parent.add(obj);
    return obj;
  }
  function box(w, h, d, m, parent, x=0,y=0,z=0) {
    const obj = mesh(new THREE.BoxGeometry(w,h,d), m, parent);
    obj.position.set(x,y,z); return obj;
  }
  function cyl(radiusTop, radiusBottom, length, sides, m, parent, x=0,y=0,z=0) {
    const obj = mesh(new THREE.CylinderGeometry(radiusTop,radiusBottom,length,sides),m,parent);
    obj.rotation.x = Math.PI / 2;
    obj.position.set(x,y,z); return obj;
  }
  function torus(radius, tube, sides, segments, m, parent, x=0,y=0,z=0) {
    const obj = mesh(new THREE.TorusGeometry(radius,tube,sides,segments),m,parent);
    obj.position.set(x,y,z); return obj;
  }
  function ico(size, detail, m, parent, x=0,y=0,z=0) {
    const obj = mesh(new THREE.IcosahedronGeometry(size,detail),m,parent);
    obj.position.set(x,y,z); return obj;
  }
  // A curved hard-surface plate in the XZ plane with physical bevels on the Y axis.
  function plate(outline, depth, m, parent, bevel=.01) {
    const shape = new THREE.Shape();
    shape.moveTo(outline[0][0], outline[0][1]);
    for (let i=1;i<outline.length;i++) shape.lineTo(outline[i][0],outline[i][1]);
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, {
      depth, steps: 1, bevelEnabled: bevel > 0,
      bevelThickness: bevel, bevelSize: bevel * .64, bevelSegments: 2, curveSegments: 1
    });
    g.rotateX(Math.PI / 2);
    g.translate(0, depth * .5, 0);
    return mesh(g,m,parent);
  }
  function line(points, radius, m, parent, sides=5) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'centripetal');
    return mesh(new THREE.TubeGeometry(curve, Math.max(8, points.length*7), radius, sides, false),m,parent);
  }
  function instanced(geometry, m, count, parent, setup) {
    const instance = new THREE.InstancedMesh(ownG(geometry),m,count);
    const obj = new THREE.Object3D();
    for (let i=0; i<count; i++) {
      obj.position.set(0,0,0); obj.rotation.set(0,0,0); obj.scale.set(1,1,1);
      setup(obj,i); obj.updateMatrix(); instance.setMatrixAt(i,obj.matrix);
    }
    instance.instanceMatrix.needsUpdate = true;
    instance.frustumCulled = false;
    parent.add(instance);
    return instance;
  }

  // HILT: asymmetric pommel, carbon grip, gilded latchwork.
  const hilt = new THREE.Group(); hilt.name = 'Hilt'; rig.add(hilt);
  cyl(.109,.109,.84,10,mat.steel,hilt,0,0,.56);
  cyl(.095,.095,.70,10,mat.grip,hilt,0,0,.57);
  cyl(.121,.121,.07,12,mat.gold,hilt,0,0,.18);
  cyl(.113,.113,.08,12,mat.deepGold,hilt,0,0,.97);
  cyl(.126,.126,.048,12,mat.steel,hilt,0,0,.99);
  cyl(.078,.115,.17,8,mat.graphite,hilt,0,0,1.10);
  ico(.073,1,mat.neon,hilt,0,0,1.21);
  torus(.088,.008,5,32,mat.gold,hilt,0,0,1.145);
  // alternating metallic weave, modeled rather than texture painted
  instanced(new THREE.TorusGeometry(.098,.007,4,10),mat.deepGold,18,hilt,(o,i)=> {
    o.position.z = .267 + i*.032;
    o.rotation.z = (i % 2 ? .19 : -.19);
  });
  instanced(new THREE.BoxGeometry(.014,.019,.05),mat.gold,24,high,(o,i)=> {
    const a = i * Math.PI * 2 / 8;
    const z = .34 + Math.floor(i / 8) * .205;
    o.position.set(Math.cos(a)*.101,Math.sin(a)*.101,z);
    o.rotation.z = a;
  });

  // POWER SOCKET: layered octagonal mechanical collars and spinning star rings.
  const socket = new THREE.Group(); socket.name='PrismaticSocket'; socket.position.z=-.25; rig.add(socket);
  cyl(.148,.175,.34,10,mat.dark,socket,0,0,.09);
  cyl(.175,.158,.12,10,mat.gold,socket,0,0,-.10);
  cyl(.22,.22,.064,12,mat.graphite,socket,0,0,-.155);
  cyl(.15,.15,.052,12,mat.pearl,socket,0,0,-.20);
  ico(.145,1,mat.neon,socket,0,0,-.21).rotation.z=Math.PI/4;
  ico(.072,0,mat.white,socket,0,0,-.225);
  const innerRing = new THREE.Group(); innerRing.name='CounterRotatingRunes'; socket.add(innerRing);
  torus(.25,.014,6,72,mat.gold,innerRing,0,0,-.26);
  torus(.22,.006,4,72,mat.neon,innerRing,0,0,-.26);
  const outerRing = new THREE.Group(); outerRing.name='OrbitingAstrolabe'; socket.add(outerRing);
  torus(.35,.023,6,80,mat.graphite,outerRing,0,0,-.19);
  torus(.354,.004,4,80,mat.amber,outerRing,0,0,-.19);
  torus(.304,.007,4,72,mat.gold,outerRing,0,0,-.16);
  instanced(new THREE.BoxGeometry(.056,.013,.025),mat.gold,24,outerRing,(o,i)=> {
    const a = Math.PI * 2 * i / 24;
    o.position.set(Math.cos(a)*.347,Math.sin(a)*.347,-.19);
    o.rotation.z=a;
  });
  instanced(new THREE.TetrahedronGeometry(.025,0),mat.neon,12,innerRing,(o,i)=> {
    const a = Math.PI * 2 * i / 12;
    o.position.set(Math.cos(a)*.255,Math.sin(a)*.255,-.26);
    o.rotation.z=a;
  });
  // High fidelity: a second inclined orbital mechanism and tiny golden etching.
  const eccentric = new THREE.Group(); eccentric.name='InclinedHighRing'; eccentric.rotation.y=.38; eccentric.rotation.x=.17; high.add(eccentric);
  torus(.402,.009,4,80,mat.gold,eccentric,0,0,-.48);
  instanced(new THREE.OctahedronGeometry(.019,0),mat.white,16,eccentric,(o,i)=> {
    const a=i*2*Math.PI/16; o.position.set(Math.cos(a)*.402,Math.sin(a)*.402,-.48);
  });
  // Mechanical locking plates behind socket.
  for (const s of [-1,1]) {
    const claw = plate([[s*.09,.08],[s*.245,-.015],[s*.27,-.18],[s*.19,-.28],[s*.15,-.17]],.09,mat.graphite,rig);
    claw.name = s<0 ? 'LeftLockingSpur' : 'RightLockingSpur';
    line([[s*.14,.059,.045],[s*.225,.059,-.08],[s*.208,.059,-.185]],.011,mat.gold,rig,4);
  }

  // GUARD: independent fold-out split wing structures with multi-material profiles.
  const wings=[];
  for (const s of [-1,1]) {
    const wing = new THREE.Group(); wing.name=s<0?'LeftGuardWing':'RightGuardWing'; rig.add(wing); wings.push({wing,s});
    plate([[s*.12,.02],[s*.26,-.03],[s*.48,-.18],[s*.59,-.40],[s*.40,-.32],[s*.28,-.22],[s*.14,-.24]], .095, mat.graphite, wing, .014);
    plate([[s*.21,-.035],[s*.43,-.19],[s*.51,-.32],[s*.36,-.26]],.055,mat.steel,wing,.008);
    plate([[s*.165,-.026],[s*.315,-.115],[s*.43,-.265],[s*.33,-.205],[s*.21,-.145]],.027,mat.gold,wing,.004);
    line([[s*.24,.075,-.05],[s*.42,.072,-.20],[s*.5,.064,-.32]],.011,mat.neon,wing);
    ico(.041,0,mat.white,wing,s*.33,0,-.178);
    const highFin = plate([[s*.32,-.12],[s*.61,-.33],[s*.71,-.45],[s*.55,-.405]],.034,mat.dark,high,.006);
    highFin.position.y=-.014;
  }

  // BLADE: independent exterior prismatic rails suspended on an arcane field.
  const rails = [];
  const mirror = (outline,s) => outline.map(([x,z])=>[x*s,z]);
  const railOutline = [
    [.10,-.33],[.213,-.49],[.255,-.82],[.26,-1.30],[.218,-1.77],
    [.115,-2.27],[.035,-2.46],[.107,-1.79],[.135,-1.32],
    [.133,-.89],[.076,-.52]
  ];
  const goldRailOutline = [[.190,-.54],[.218,-.77],[.222,-1.27],[.192,-1.64],[.165,-1.80],[.178,-1.34],[.178,-.90]];
  const spineOutline = [[.125,-.49],[.157,-.63],[.162,-1.30],[.139,-1.68],[.139,-1.17],[.125,-.75]];
  for (const s of [-1,1]) {
    const g = new THREE.Group();g.name=s<0?'LeftActuatedRail':'RightActuatedRail';rig.add(g);
    rails.push({g,s});
    plate(mirror(railOutline,s),.102,mat.steel,g,.013);
    plate(mirror(goldRailOutline,s),.116,mat.deepGold,g,.005);
    plate(mirror(spineOutline,s),.123,mat.dark,g,.006);
    line([[s*.117,.073,-.48],[s*.174,.083,-.78],[s*.178,.083,-1.32],[s*.132,.073,-1.84],[s*.066,.047,-2.35]], .012,mat.neon,g,6);
    line([[s*.233,-.058,-.76],[s*.238,-.058,-1.26],[s*.195,-.052,-1.7]],.008,mat.gold,g,4);
    // Short segmented armor vanes, backed with dark inlay and emissive tips.
    for (const [i,z] of [-.74,-1.02,-1.33,-1.64].entries()) {
      plate(mirror([[.17,z+.073],[.325-i*.013,z+.015],[.27-i*.015,z-.09],[.178,z-.035]],s),.08,mat.graphite,g,.008);
      plate(mirror([[.18,z+.043],[.29-i*.01,z+.013],[.239-i*.01,z-.049]],s),.09,mat.steel,g,.005);
      ico(.023,0,mat.amber,g,s*(.245-i*.01),.053,z+.008);
    }
    const notchGroup = new THREE.Group(); g.add(notchGroup);
    instanced(new THREE.BoxGeometry(.035,.009,.025),mat.gold,13,notchGroup,(o,i)=> {
      o.position.set(s*.193,.073,-.71-i*.096); o.rotation.y=(s*.07);
    });
    instanced(new THREE.BoxGeometry(.028,.015,.042),mat.pearl,14,high,(o,i)=> {
      o.position.set(s*(.28-i*.008),.015,-.79-i*.107);o.rotation.y=-s*.3;
    });
  }
  // Inner aether lattice. Translucent, bright on both sides of the blade.
  const energy = new THREE.Group(); energy.name='SuspendedAetherBlade'; rig.add(energy);
  plate([[0,-.51],[-.045,-.68],[-.079,-1.24],[-.068,-1.73],[-.04,-2.10],[0,-2.46],[.04,-2.10],[.068,-1.73],[.079,-1.24],[.045,-.68]], .035, energyMat,energy,0);
  const brightCore = plate([[0,-.56],[-.014,-.86],[-.025,-1.45],[-.018,-2.09],[0,-2.45],[.018,-2.09],[.025,-1.45],[.014,-.86]],.017,bladeWhiteMat,energy,0);
  brightCore.position.y=.029;
  const halo = plate([[0,-.39],[-.12,-1.0],[-.155,-1.61],[-.11,-2.13],[0,-2.52],[.11,-2.13],[.155,-1.61],[.12,-1.0]],.01,haloMat,glowHigh,0);
  halo.position.y=-.025;
  for (const z of [-.80,-1.18,-1.57,-1.95]) {
    const jewel=ico(.055,0,mat.white,energy,0,.045,z);jewel.scale.set(.60,.45,1.45);
    torus(.065,.004,4,40,mat.gold,high,0,.065,z).rotation.x=Math.PI/2;
  }
  // Independent levitating splinters, visible in high quality mode.
  const splinters=[];
  for(let i=0;i<10;i++) {
    const s = i%2 ? 1 : -1;
    const anchorZ= -.64 - Math.floor(i/2)*.35;
    const shard=ico(.042+i%3*.008,0,i%3===0?mat.amber:mat.neon,glowHigh,s*(.37+i%4*.037),0,anchorZ);
    shard.scale.set(.58,.30,1.9);splinters.push({shard,anchorZ,s,phase:i*1.31});
  }
  const arcRibbons=[];
  for(const s of [-1,1]) {
    const arc = line([[s*.17,.042,-.53],[s*.32,.09,-.9],[s*.27,.02,-1.35],[s*.22,-.09,-1.85],[s*.05,.025,-2.35]],.006,mat.neon,glowHigh,4);
    arcRibbons.push(arc);
  }
  // An etched, hollow six-point constellation behind the reactor.
  const backGlyph=new THREE.Group();backGlyph.name='HighQualitySigil';backGlyph.position.z=-.535;high.add(backGlyph);
  const glyphPts=[];
  for(let i=0;i<12;i++) {
    const a=i*Math.PI/6;const r=i%2===0?.145:.078;
    glyphPts.push([Math.cos(a)*r,Math.sin(a)*r,-.02]);
  }
  for(let i=0;i<12;i++) {
    const a=glyphPts[i],b=glyphPts[(i+1)%12];line([a,b],.0045,mat.amber,backGlyph,4);
  }

  // STATE & ANIMATION. External users may move/rotate root freely.
  let destroyed=false;
  let quality = 'high';
  let form = 'sealed';
  let formMix = 0;
  let charge = 0.20;
  let chargeTarget = 0.20;
  let clock = 0;
  let pulseTime = -1;
  let slashTime = -1;
  const originalOpacity = { energy:energyMat.opacity, core:bladeWhiteMat.opacity, halo:haloMat.opacity };
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  function setQuality(mode) {
    if (mode !== 'low' && mode !== 'high') return quality;
    quality=mode;
    high.visible = mode==='high';
    glowHigh.visible = mode==='high';
    return quality;
  }
  function setForm(value) {
    if (value === 'sealed' || value === 'awakened') form=value;
    return form;
  }
  function setCharge(value) {
    if(Number.isFinite(value)) chargeTarget=clamp(value,0,1);
    return chargeTarget;
  }
  function playAction(action) {
    if (action==='pulse' || action==='surge') pulseTime=0;
    else if (action==='slash') slashTime=0;
  }
  function update(dt, context={}) {
    if(destroyed) return;
    dt=clamp(Number.isFinite(dt)?dt:0,0,.07);
    if (context && typeof context==='object') {
      if (Number.isFinite(context.charge)) setCharge(context.charge);
      if (context.form==='sealed' || context.form==='awakened') setForm(context.form);
    }
    clock+=dt;
    const follow=1-Math.exp(-dt*5);
    formMix+=(Number(form==='awakened')-formMix)*follow;
    charge+=(chargeTarget-charge)*follow;
    if(pulseTime>=0){pulseTime+=dt;if(pulseTime>1.4)pulseTime=-1;}
    if(slashTime>=0){slashTime+=dt;if(slashTime>0.86)slashTime=-1;}
    const pulse=pulseTime<0?0:Math.sin(Math.PI*clamp(pulseTime/1.4,0,1))**2;
    const power=clamp(.23+formMix*.60+charge*.2+pulse*.46,0,1.4);
    const breath=Math.sin(clock*2.2)*.007;
    for(const {g,s} of rails){
      g.position.x=s*(.006+formMix*.088+pulse*.043+breath);
      g.rotation.y=s*(.013+formMix*.034);
    }
    for(const {wing,s} of wings){
      wing.rotation.y=s*(formMix*.16+Math.sin(clock*1.7)*.013);
      wing.position.x=s*formMix*.02;
    }
    outerRing.rotation.z=clock*(.22+power*.75);
    innerRing.rotation.z=-clock*(.52+power*.9);
    eccentric.rotation.z=clock*.17;
    backGlyph.rotation.z=-clock*.27;
    energy.scale.x=.68+formMix*.55+pulse*.27;
    energy.scale.y=1+formMix*.03;
    energyMat.opacity=clamp(originalOpacity.energy*(.60+power*.54),.25,1);
    bladeWhiteMat.opacity=clamp(originalOpacity.core*(.56+power*.51),.22,1);
    haloMat.opacity=clamp(originalOpacity.halo*(.55+power*1.14),.03,.32);
    mat.neon.emissiveIntensity=1.35+power*2.6;
    mat.white.emissiveIntensity=1.6+power*2.8;
    mat.amber.emissiveIntensity=1.1+power*.8;
    for (const {shard,anchorZ,s,phase} of splinters) {
      shard.position.x=s*(.34+formMix*.10)+Math.sin(clock*.9+phase)*.033;
      shard.position.y=Math.sin(clock*1.45+phase)*.06;
      shard.position.z=anchorZ+Math.cos(clock*.8+phase)*.04;
      shard.rotation.z=clock*.33+phase;
    }
    const stroke=slashTime<0?0:Math.sin(Math.PI*clamp(slashTime/.86,0,1));
    // All animation stays inside rig, never edits the externally owned root transform.
    rig.rotation.x=stroke*.21;
    rig.rotation.y=-stroke*.38;
    rig.rotation.z=stroke*-.23;
    rig.position.y=stroke*.08;
    outerRing.scale.setScalar(1+pulse*.10);
    innerRing.scale.setScalar(1+pulse*.06);
  }
  function getState(){return {form,quality,charge,formBlend:formMix};}
  function dispose() {
    if(destroyed)return;
    destroyed=true;
    root.remove(rig);
    for (const g of geometries) g.dispose();
    for (const m of materials) m.dispose();
    geometries.clear();materials.clear();
  }
  setQuality(options.quality === 'low' ? 'low' : 'high');
  setForm(options.form === 'awakened' ? 'awakened' : 'sealed');
  setCharge(Number.isFinite(options.charge) ? options.charge : .2);
  return { root, update, setQuality, setForm, setCharge, playAction, getState, dispose };
}
