/**
 * AETHER FRONTIER / No.06 / THE AETHER FOUNDRY
 * Three.js 0.160.0 | Y up | -Z forward | ~1 meter per world unit
 * Import-free scene factory. The caller owns the renderer, camera and input.
 * © AETHER FRONTIER project. All shapes are procedural.
 */
export function createAetherModule(THREE, options = {}) {
  const root = new THREE.Group();
  root.name = 'AF06_AETHER_FOUNDRY';
  root.userData = { team: 'No.06', title: 'THE AETHER FOUNDRY', version: '1.0.0', units: 'meters', forward: '-Z' };
  const base = new THREE.Group(), high = new THREE.Group(), dynamics = new THREE.Group();
  root.add(base, high, dynamics);
  const geometries = new Set(), materials = new Set(), textures = new Set();
  const keepG = g => (geometries.add(g), g);
  const keepM = m => (materials.add(m), m);
  const UNIT = keepG(new THREE.BoxGeometry(1, 1, 1));
  const UP = new THREE.Vector3(0, 1, 0);
  const temp = new THREE.Object3D();
  const batch = { base: new Map(), high: new Map() };
  const hex = n => new THREE.Color(n);
  const mat = (color, metalness = .63, roughness = .4, emissive = null, intensity = 0) =>
    keepM(new THREE.MeshStandardMaterial({ color: hex(color), metalness, roughness,
      emissive: hex(emissive || '#000000'), emissiveIntensity: intensity }));
  const M = {
    chassis: mat('#273a47', .7, .45), bulk: mat('#1a2837', .66, .47), edge: mat('#627f8c', .77, .3),
    black: mat('#0c141e', .45, .6), panel: mat('#314653', .65, .48), pale: mat('#91aab6', .6, .28),
    copper: mat('#9e6448', .77, .28), hazard: mat('#f1a354', .38, .46, '#753d14', .15),
    cyan: mat('#57f4ed', .15, .18, '#42e9f5', 2), blue: mat('#386c95', .4, .29, '#1c6489', .35),
    violet: mat('#bca0ff', .2, .2, '#9870ff', 1.75), red: mat('#ff765f', .24, .3, '#ff472b', 1.6),
    green: mat('#73ffba', .15, .3, '#58ec9d', 1.15), floor: mat('#111d28', .52, .7),
    glass: keepM(new THREE.MeshStandardMaterial({color:0x26495a, metalness:.3, roughness:.16, transparent:true, opacity:.5, side:THREE.DoubleSide})),
    beam: keepM(new THREE.MeshBasicMaterial({ color: 0x6debf5, transparent:true, opacity:.23, depthWrite:false, blending:THREE.AdditiveBlending })),
    orangeBeam: keepM(new THREE.MeshBasicMaterial({ color: 0xff9b62, transparent:true, opacity:.22, depthWrite:false, blending:THREE.AdditiveBlending }))
  };
  const groupOf = detail => detail ? high : base;
  function b(m, x,y,z, sx,sy,sz, detail=false, rx=0,ry=0,rz=0) {
    const pool = batch[detail ? 'high' : 'base'];
    let list = pool.get(m); if (!list) { list=[]; pool.set(m,list); }
    temp.position.set(x,y,z); temp.rotation.set(rx,ry,rz); temp.scale.set(sx,sy,sz); temp.updateMatrix();
    list.push(temp.matrix.clone());
  }
  function box(parent,m,x,y,z,sx,sy,sz, name='') {
    const mesh = new THREE.Mesh(UNIT,m);
    mesh.position.set(x,y,z); mesh.scale.set(sx,sy,sz);
    if(name) mesh.name=name;
    parent.add(mesh); return mesh;
  }
  function cylinder(parent,m,r1,r2,h,seg=20,x=0,y=0,z=0, rotationX=0, name='') {
    const mesh = new THREE.Mesh(keepG(new THREE.CylinderGeometry(r1,r2,h,seg)),m);
    mesh.position.set(x,y,z); mesh.rotation.x=rotationX;
    if(name) mesh.name=name;
    parent.add(mesh); return mesh;
  }
  function sphere(parent,m,r,x,y,z,seg=16) {
    const mesh = new THREE.Mesh(keepG(new THREE.IcosahedronGeometry(r,seg>=16?1:0)),m);
    mesh.position.set(x,y,z); parent.add(mesh); return mesh;
  }
  function torus(parent,m,r,tube,x,y,z,rx=0,ry=0,rz=0,segments=56) {
    const mesh = new THREE.Mesh(keepG(new THREE.TorusGeometry(r,tube,8,segments)),m);
    mesh.position.set(x,y,z); mesh.rotation.set(rx,ry,rz); parent.add(mesh); return mesh;
  }
  function rod(parent,m,a,c,r=.16,segments=9) {
    const p1=new THREE.Vector3(...a), p2=new THREE.Vector3(...c);
    const dir=p2.clone().sub(p1);
    const mesh=cylinder(parent,m,r,r,dir.length(),segments);
    mesh.position.copy(p1).add(p2).multiplyScalar(.5);
    mesh.quaternion.setFromUnitVectors(UP,dir.normalize());
    return mesh;
  }
  function polyline(points,m,r=.16,parent=base,detail=false) {
    for(let i=0;i<points.length-1;i++) rod(parent,m,points[i],points[i+1],r,10);
    if(detail) for(let i=1;i<points.length-1;i++) sphere(parent,M.edge,r*1.5,...points[i],8);
  }
  function label(text,x,y,z,w=5,h=.8, parent=base, color='#8aeeff',ry=0) {
    if(typeof document==='undefined') return null;
    const canvas=document.createElement('canvas'); canvas.width=512; canvas.height=100;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#07121be8'; ctx.fillRect(0,0,512,100);
    ctx.fillStyle='#345c71'; ctx.fillRect(0,0,512,5); ctx.fillRect(0,95,512,5);
    ctx.fillStyle=color; ctx.font='bold 37px monospace'; ctx.textAlign='center';
    ctx.fillText(text,256,64);
    const tex=new THREE.CanvasTexture(canvas); textures.add(tex);
    tex.colorSpace=THREE.SRGBColorSpace;
    const m=keepM(new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide,depthWrite:false}));
    const mesh=new THREE.Mesh(keepG(new THREE.PlaneGeometry(w,h)),m);
    mesh.position.set(x,y,z); mesh.rotation.y=ry; parent.add(mesh); return mesh;
  }
  function flushBatch() {
    for(const level of ['base','high']) for(const [m,list] of batch[level]) {
      if(!list.length) continue;
      const mesh=new THREE.InstancedMesh(UNIT,m,list.length);
      mesh.name='AF06_INSTANCED_'+level;
      mesh.frustumCulled=false;
      list.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));
      mesh.instanceMatrix.needsUpdate=true;
      groupOf(level==='high').add(mesh);
    }
  }
  // ----- SCALE AND STRUCTURE: an inhabitable 92m x 100m foundry hall -----
  b(M.floor,0,-.55,0,91,1.1,99);
  for (let x=-40;x<=40;x+=8) {
    b(M.panel,x,.024,0,.045,.047,96,true);
    for(let z=-44;z<=44;z+=8) {
      b(M.edge,x,.034,z,7.7,.045,.05,true);
      b(M.black,x,.046,z,6.85,.04,6.8,true);
    }
  }
  for(let z=-45;z<=45;z+=15) {
    b(M.chassis,0,.06,z,88,.13,.19);
    b(M.hazard,0,.13,z,88,.038,.046,true);
  }
  // Central reinforced machine foundations.
  for(const [x,z,w,d] of [[0,-9,19,19],[-26,-14,15,17],[26,-14,15,17],[-18,14,12,35],[20,14,13,17]]) {
    b(M.chassis,x,.22,z,w,.46,d);
    b(M.copper,x,.47,z,w,.07,.2);
    b(M.copper,x,.47,z-d/2,.18,.07,d,true);
    b(M.copper,x,.47,z+d/2,.18,.07,d,true);
  }
  // Vertical supporting structure and overhead ribs.
  for(let ix of [-42,42]) for(let z=-44;z<=44;z+=11) {
    b(M.bulk,ix,13.4,z,2,27,2.3);
    b(M.edge,ix,25.3,z,2.4,1,2.8);
    b(M.chassis,ix*.975,1.2,z,3,2.4,3);
    b(M.cyan,ix>0?ix-.9:ix+.9,14,z,.08,19,.12,true);
    if(z%2===0) b(M.hazard,ix,2.1,z,2.25,.28,2.6,true);
  }
  for(let z=-44;z<=44;z+=11) {
    b(M.chassis,0,27.1,z,85,1.7,.85);
    b(M.edge,0,28.1,z,84,.26,.48);
    for(let x=-37;x<=37;x+=9) {
      b(M.panel,x,26.3,z,.35,1.3,1.5);
      b(M.cyan,x,26.9,z,.3,.12,1.6,true);
    }
  }
  for (const x of [-41,41]) b(M.bulk,x,29.2,0,2.3,.7,95);
  // Roof plates with deliberate 20m-wide opening above the reactor.
  for (const x of [-32,-21,21,32]) for(let z=-38;z<=38;z+=13) {
    b(M.black,x,29,z,10,.22,11);
    b(M.edge,x,29.2,z,9,.07,.13,true);
  }
  for(let z of [-47,47]) {
    b(M.chassis,0,13,z,88,2,2);
    b(M.panel,0,4,z,86,6,.55);
    b(M.panel,0,22,z,86,7,.55);
    b(M.edge,0,19,z,87,.24,.7);
    label(z<0?'AETHER FOUNDRY  //  06':'AF-06     INDUSTRIAL ENERGY COMPLEX',0,17,z+(z<0?1.05:-1.05),13,1.5,base,'#67eaf4',z<0?0:Math.PI);
  }
  // Side piping, radiator fields and external process tank silhouettes.
  for(let side of [-1,1]) {
    const x=side*39;
    for(let y of [4.8,7,18,20.2]) {
      polyline([[x,y,40],[x,y,24],[x+side*1.2,y,18],[x+side*1.2,y,-17],[x,y,-24],[x,y,-43]],
        y>15?M.copper:M.edge,.23,base);
    }
    for(let z of [-37,-27,0,25,36]) {
      cylinder(base,M.bulk,2,2,7.3,18,side*40,5.3,z);
      cylinder(base,M.edge,2.25,2.25,.25,18,side*40,2,z);
      torus(base,M.cyan,2,.075,side*40,8.0,z,Math.PI/2,0,0,26);
      b(M.copper,side*40,9.1,z,4.4,.3,4.4);
      if(z===25) label('COOLANT / LOOP',side*40,12,z+2.4,4,.7,base,'#ffb37b');
    }
    for(let z=-41;z<=41;z+=8) {
      b(M.edge,x-side*.8,16,z,.17,9,.3,true);
      b(M.cyan,x-side*.76,16,z,.08,8,.1,true);
    }
  }
  // ----- CENTRAL REACTOR: 28m containment structure -----
  const R = new THREE.Group(); R.position.set(0,0,-9); R.name='ARC-HEART / central reactor'; dynamics.add(R);
  cylinder(R,M.bulk,9.0,9.6,1.25,12,0,.8,0);
  cylinder(R,M.edge,8.9,8.9,.48,12,0,1.55,0);
  cylinder(R,M.black,7.0,7.8,1.1,12,0,2.4,0);
  cylinder(R,M.copper,6.8,6.8,.2,12,0,3.1,0);
  cylinder(R,M.bulk,4.45,5,17,16,0,12.2,0);
  cylinder(R,M.black,3.95,3.95,18,18,0,12.8,0);
  cylinder(R,M.beam,3.4,3.4,19.3,18,0,13,0);
  cylinder(R,M.cyan,1.1,1.1,21,16,0,13.2,0);
  cylinder(R,M.black,6,6,2,12,0,24.8,0);
  cylinder(R,M.edge,7,6.2,1.3,12,0,26,0);
  for(let i=0;i<12;i++) {
    const a=i*Math.PI/6; const x=Math.cos(a)*7.7,z=Math.sin(a)*7.7;
    cylinder(R,M.chassis,.64,.79,21,9,x,13.2,z);
    cylinder(R,M.copper,.86,.86,1.1,9,x,5.2,z);
    cylinder(R,M.cyan,.29,.29,17.3,8,x,13.2,z);
    rod(R,M.edge,[x,24.2,z],[x*.76,26.2,z*.76],.26,7);
    for(let y of [7,14,21]) {
      cylinder(R,M.edge,.9,.9,.26,9,x,y,z);
    }
  }
  for(let y of [5,11,18.5,24]) {
    torus(R,M.copper,7.55,.34,0,y,0,Math.PI/2,0,0,72);
    torus(R,M.cyan,7.48,.11,0,y+.12,0,Math.PI/2,0,0,72);
  }
  // Counter-orbiting magnetic stabilizer rings.
  const gyros=[];
  for(let i=0;i<3;i++) {
    const pivot=new THREE.Group(); pivot.position.set(0,14.5,0); R.add(pivot);
    const rim=torus(pivot,i===1?M.violet:M.pale,5.25+i*.65,.29,0,0,0,0,0,0,74);
    torus(pivot,M.cyan,5.31+i*.65,.08,0,0,0,0,0,0,70);
    for(let j=0;j<8;j++) {
      let a=j*Math.PI/4, rad=5.25+i*.65;
      box(pivot,M.copper,Math.cos(a)*rad,Math.sin(a)*rad,0,.65,.65,.8);
    }
    pivot.rotation.set(i*.66, i*1.12, i*.78);
    gyros.push(pivot);
  }
  const heart=new THREE.Group(); heart.position.y=15; R.add(heart);
  const coreMat=keepM(new THREE.MeshStandardMaterial({color:0xaafcff,emissive:0x34edf9,emissiveIntensity:3,metalness:.05,roughness:.1}));
  const core=new THREE.Mesh(keepG(new THREE.IcosahedronGeometry(2.2,2)),coreMat);
  heart.add(core);
  const cage=new THREE.Mesh(keepG(new THREE.IcosahedronGeometry(3.15,1)),keepM(new THREE.MeshBasicMaterial({color:0x64e9f1,wireframe:true,transparent:true,opacity:.57})));
  heart.add(cage);
  for(let i=0;i<4;i++) {
    const a=i*Math.PI/2;
    rod(R,M.chassis,[Math.cos(a)*10,1.4,Math.sin(a)*10],[Math.cos(a)*8,10,Math.sin(a)*8],.72,10);
  }
  label('ARC-HEART  /  NO.06',0,3.8,9.35,8,1.1,R,'#8becf9');
  // ----- MIRRORED 13m TURBINE HOUSINGS / VISIBLE ROTOR ASSEMBLIES -----
  const rotors=[];
  function buildTurbine(x,z,id) {
    const T=new THREE.Group(); T.name='MONOLITH TURBINE '+id; T.position.set(x,0,z); dynamics.add(T);
    cylinder(T,M.chassis,6.5,6.5,9,24,0,11,-1.5,Math.PI/2);
    cylinder(T,M.black,5.85,5.85,9.4,24,0,11,-1.5,Math.PI/2);
    torus(T,M.edge,6.36,.52,0,11,3.05,0,0,0,68);
    torus(T,M.copper,5.53,.28,0,11,3.17,0,0,0,64);
    torus(T,M.cyan,5.7,.075,0,11,3.43,0,0,0,64);
    for(let a=0;a<12;a++) {
      const phi=a*Math.PI/6;
      rod(T,M.edge,[Math.cos(phi)*6.2,11+Math.sin(phi)*6.2,-5.6],
        [Math.cos(phi)*6.2,11+Math.sin(phi)*6.2,3.1],.2,8);
      box(T,M.bulk,Math.cos(phi)*6.45,11+Math.sin(phi)*6.45,3.05,.75,.75,.9).rotation.z=phi;
    }
    const rotor=new THREE.Group(); rotor.position.set(0,11,3.5); rotor.name='ACTIVE ROTOR'; T.add(rotor);
    for(let j=0;j<10;j++) {
      const a=2*Math.PI*j/10;
      const blade=new THREE.Mesh(keepG(new THREE.BoxGeometry(1.55,4.55,.36)),M.edge);
      blade.position.set(Math.cos(a)*3.1,Math.sin(a)*3.1,0);
      blade.rotation.z=a-Math.PI/2+.38;
      blade.rotation.y=.25;
      rotor.add(blade);
      box(rotor,M.copper,Math.cos(a)*5.15,Math.sin(a)*5.15,.1,.6,.45,.65).rotation.z=a;
    }
    cylinder(rotor,M.black,1.37,1.37,.82,16,0,0,.54,Math.PI/2);
    cylinder(rotor,M.cyan,.66,.66,.92,16,0,0,.74,Math.PI/2);
    cylinder(T,M.copper,4.1,4.1,1.1,20,0,11,-6.15,Math.PI/2);
    for(let dx of [-4.25,4.25]) {
      b(M.chassis,x+dx,3.15,z-1,2,6.3,10);
      b(M.edge,x+dx,5.65,z+2,.65,.7,3);
    }
    label('TURBINE   '+id,0,19,3.4,6,.85,T,'#ffb270');
    rotors.push({rotor,sign:id==='A'?1:-1});
  }
  buildTurbine(-26,-13,'A'); buildTurbine(26,-13,'B');
  // ----- INDUSTRIAL FABRICATION: moving conveyor, pressure forge and robotic weld arms -----
  const conveyor = new THREE.Group(); conveyor.position.set(-18,0,14); conveyor.name='FABRICATION LINE / conveyor'; dynamics.add(conveyor);
  box(conveyor,M.bulk,0,1,0,8,1.5,34);
  box(conveyor,M.black,0,1.9,0,6.5,.23,33);
  for(let z=-16;z<=16;z+=2) {
    const roller=cylinder(conveyor,M.edge,.18,.18,7.9,10,0,1.92,z,Math.PI/2);
    roller.rotation.z=Math.PI/2;
    box(conveyor,M.copper,-4.1,1.35,z,.28,1,1);
    box(conveyor,M.copper,4.1,1.35,z,.28,1,1);
  }
  for(let x of [-4.35,4.35]) {
    box(conveyor,M.edge,x,2.6,0,.45,.22,34);
    for(let z=-16;z<=16;z+=4) box(conveyor,M.chassis,x,1.2,z,.5,2.2,.55);
  }
  const beltCrates=[];
  for(let i=0;i<6;i++) {
    const cargo=new THREE.Group(); conveyor.add(cargo);
    box(cargo,M.chassis,0,.68,0,4.2,1.3,2.8);
    box(cargo,M.cyan,0,1.37,0,3.35,.14,2.05);
    for (let s of [-1,1]) box(cargo,M.copper,s*2.2,.72,0,.24,1.6,3);
    beltCrates.push(cargo);
  }
  label('NANOFORGE  /  ASSEMBLY',-18,6.1,32,8,1.05,base,'#77eafd');
  // Mechanical presses below an overhead reinforced gantry.
  const forge=new THREE.Group(); forge.position.set(20,0,16); forge.name='SINGULARITY PRESS'; dynamics.add(forge);
  box(forge,M.bulk,0,1,0,14,2,16);
  box(forge,M.copper,0,2.13,0,10,.28,11);
  for(let x of [-5.7,5.7]) for(let z of [-5.6,5.6]) {
    box(forge,M.edge,x,7.4,z,1.1,12,1.1);
    cylinder(forge,M.cyan,.29,.29,10,10,x,7.5,z);
  }
  box(forge,M.chassis,0,14,0,15.5,3.2,15);
  box(forge,M.black,0,12.3,0,8,.65,9);
  const platen=new THREE.Group(); forge.add(platen);
  box(platen,M.chassis,0,7.8,0,9,2.6,9);
  box(platen,M.hazard,0,6.42,0,8.5,.34,8.5);
  box(platen,M.orangeBeam,0,6.14,0,7.2,.16,7.2);
  cylinder(forge,M.copper,2.1,2.1,5,20,0,11.15,0);
  torus(forge,M.hazard,3.4,.3,0,12.8,0,Math.PI/2);
  for(let z of [-7.9,7.9]) {
    b(M.chassis,20,9,z+16,16,.85,.8);
    b(M.hazard,20,8.55,z+16,16,.17,.35,true);
  }
  label('SINGULARITY PRESS',0,17.2,7.9,7.2,.95,forge,'#ffb57c');
  // Two servo arms with articulated joints; visuals only, no combat mechanics.
  const arms=[];
  for(const [ax,az,dir] of [[-9,8,-1],[31,34,1],[-12,-34,-1]]) {
    const arm=new THREE.Group(); arm.position.set(ax,0,az); arm.name='INDUSTRIAL SERVO ARM'; dynamics.add(arm);
    cylinder(arm,M.bulk,2.2,2.2,2.1,12,0,1.1,0);
    torus(arm,M.cyan,1.8,.15,0,2.3,0,Math.PI/2);
    const shoulder=new THREE.Group(); shoulder.position.y=2.4; arm.add(shoulder);
    box(shoulder,M.copper,0,2.1,0,1.55,5,1.65);
    sphere(shoulder,M.edge,.8,0,4.5,0);
    const elbow=new THREE.Group(); elbow.position.y=4.5; shoulder.add(elbow);
    box(elbow,M.edge,0,1.8,0,1.2,4,1.35);
    box(elbow,M.chassis,0,4,0,2.4,.9,2.4);
    for(let x of [-.7,.7]) box(elbow,M.hazard,x,4.6,0,.3,1,1.2);
    arms.push({shoulder,elbow,dir});
  }
  // ----- OVERHEAD BRIDGE CRANE / full-span suspended cargo --------
  const crane = new THREE.Group(); crane.name='TRANSPORT GANTRY / animated'; dynamics.add(crane);
  for(let z of [20,26]) {
    b(M.chassis,0,24,z,78,1.5,.9);
    b(M.edge,0,24.9,z,78,.22,1.1);
    b(M.hazard,0,23.2,z,78,.22,.2,true);
    for(let x=-37;x<=37;x+=7.4) {
      b(M.edge,x,23.2,z,.32,1.8,1.2);
      b(M.copper,x,25.05,z,.22,.2,1.3,true);
    }
  }
  const trolley=new THREE.Group(); trolley.position.set(0,23.5,23); crane.add(trolley);
  box(trolley,M.bulk,0,0,0,8.2,2.4,7.5);
  box(trolley,M.edge,0,1.3,0,7.8,.35,7.4);
  for(let x of [-3.2,3.2]) for(let z of [-2.9,2.9]) cylinder(trolley,M.copper,.9,.9,.9,14,x,1.0,z,Math.PI/2);
  const hookRod=cylinder(crane,M.edge,.12,.12,1,8,0,18,23);
  const dangling=new THREE.Group(); crane.add(dangling);
  box(dangling,M.chassis,0,0,0,5.8,2.8,4.9);
  box(dangling,M.hazard,0,1.45,0,4.4,.25,3.7);
  box(dangling,M.cyan,0,-1.5,0,4.2,.18,3.2);
  for(let x of [-2.9,2.9]) box(dangling,M.edge,x,0,0,.2,3.1,5);
  // ----- CATWALK NETWORK: upper floor y=10m, access from 58m service ramp -----
  const deckY=10;
  function catwalk(x,z,w,d) {
    b(M.chassis,x,deckY-.4,z,w,.8,d);
    b(M.black,x,deckY+.03,z,w-.35,.08,d-.35);
    if(w>d) {
      for(let xx=x-w/2+2;xx<x+w/2;xx+=2) b(M.panel,xx,deckY+.08,z,.07,.045,d-.5,true);
    } else {
      for(let zz=z-d/2+2;zz<z+d/2;zz+=2) b(M.panel,x,deckY+.08,zz,w-.5,.045,.07,true);
    }
    // A faint emissive stripe provides depth cues on dark mobile screens.
    b(M.cyan,x,deckY+.082,z,w>.0?Math.min(w,2):1,.018,d>.0?Math.min(d,.045):.045,true);
  }
  catwalk(-36,0,7,78); catwalk(36,0,7,78);
  catwalk(0,-35.5,77,7); catwalk(0,35.5,77,7);
  catwalk(0,29,70,5); catwalk(0,-27,70,4.5);
  // Connection from the ramp to the left side corridor.
  catwalk(-34,-26,10,7);
  // Ramp has increasing height as Z becomes more negative.
  const rampLength=Math.hypot(56,10);
  const ramp=new THREE.Mesh(UNIT,M.panel);
  ramp.scale.set(6.4,.54,rampLength);
  ramp.position.set(-36,4.71,2);
  ramp.rotation.x=Math.atan2(10,56);
  ramp.name='PUBLIC ACCESS RAMP / climb to mezzanine'; base.add(ramp);
  for(let i=0;i<=56;i+=2) {
    const z=30-i,y=(i/56)*10;
    b(M.edge,-36,y+.095,z,5.9,.065,.09,true);
    if(i%8===0) {
      b(M.hazard,-36,y+.115,z,5.8,.03,.22,true);
    }
  }
  function railZ(x,z1,z2,holes=[]) {
    for(let z=z1;z<z2;z+=3.5) {
      let c=Math.min(3.5,z2-z);
      if(holes.some(h=>Math.abs(z+c/2-h)<3.1)) continue;
      b(M.edge,x,11.15,z+c/2,.17,2.2,.18);
      b(M.copper,x,11.6,z+c/2,.19,.12,c);
      b(M.edge,x,10.82,z+c/2,.13,.13,c);
    }
  }
  function railX(z,x1,x2,holes=[]) {
    for(let x=x1;x<x2;x+=3.5) {
      let c=Math.min(3.5,x2-x);
      if(holes.some(h=>Math.abs(x+c/2-h)<3.1)) continue;
      b(M.edge,x+c/2,11.15,z,.18,2.2,.17);
      b(M.copper,x+c/2,11.6,z,c,.12,.19);
      b(M.edge,x+c/2,10.82,z,c,.13,.13);
    }
  }
  for(let x of [-39.5,39.5]) railZ(x,-38,38);
  railZ(-32.5,-38,38,[-27,29,35]); railZ(32.5,-38,38,[-27,29,35]);
  for(let z of [-39,39]) railX(z,-39,39);
  railX(-32, -33,33,[-29,29]); railX(32,-33,33,[-29,29]);
  for(let z of [26.5,31.5,-29.25,-24.75]) railX(z,-31,31,[0]);
  // Ramp rails: near its top the passage blends into the upper network.
  for(let x of [-39.3,-32.7]) {
    rod(base,M.edge,[x,1.25,30],[x,11.25,-26],.10);
    rod(base,M.edge,[x,.8,30],[x,10.8,-26],.075);
    for(let i=0;i<=56;i+=5.6) {
      const z=30-i,y=i/56*10;
      rod(base,M.copper,[x,y+.1,z],[x,y+1.25,z],.09,7);
    }
  }
  // Diagnostic lights that make the path navigable at long range.
  for(let z=-34;z<=34;z+=8) for(let x of [-35.7,35.7]) {
    b(M.cyan,x,9.55,z,1,.16,1);
    b(M.violet,x,10.13,z,.4,.07,.42,true);
  }
  for(let x=-32;x<=32;x+=8) {
    b(M.cyan,x,9.55,29,.8,.16,.8);
    b(M.cyan,x,9.55,-27,.8,.16,.8);
  }
  // ----- SWITCHABLE SECTOR CONTROL STATIONS -----
  const consoles=[];
  function makeConsole(id,title,x,y,z,rotation=0,isMaster=false) {
    const g=new THREE.Group(); g.position.set(x,y,z); g.rotation.y=rotation;
    g.name='CONTROL STATION '+id; dynamics.add(g);
    box(g,M.bulk,0,.65,0,2.2,1.3,1.6);
    box(g,M.copper,0,1.43,-.16,2.38,.24,1.72);
    const display=box(g,M.black,0,1.7,.14,1.9,.67,.16);
    display.rotation.x=-.26;
    box(g,M.blue,0,1.7,.255,1.68,.5,.035);
    for(let i=0;i<3;i++) box(g,M.cyan,-.5+i*.5,1.74,.278,.25,.12,.045);
    cylinder(g,M.edge,.53,.53,.18,12,0,2.15,-.25);
    const lampMat=keepM(new THREE.MeshBasicMaterial({color:isMaster?0xb88fff:0xff8d60}));
    const lamp=sphere(g,lampMat,.28,0,2.15,-.25,8);
    torus(g,M.pale,.45,.09,0,2.15,-.25,Math.PI/2);
    label(isMaster?'OVERDRIVE CONTROL':'SECTOR / '+id,0,3.45,0,4.35,.75,g,isMaster?'#d9b7ff':'#ffb080');
    consoles.push({id,title,x,y,z,lamp,lampMat,active:false,isMaster,group:g});
  }
  makeConsole('01','タービンを同期',-31,0,7,.2);
  makeConsole('02','鋳造圧力を安定化',33,0,19,-.8);
  makeConsole('03','冷却循環を起動',6,0,34,Math.PI);
  makeConsole('FINAL','炉心を最大出力へ',0,10,29,0,true);
  // Accent pipe lights, floor perimeter and radiant crystals.
  for(let z of [-43,42]) {
    for(let x=-35;x<=35;x+=7) {
      cylinder(base,M.bulk,.42,.42,2.4,8,x,1.4,z);
      sphere(base,M.cyan,.38,x,2.6,z,8);
      b(M.copper,x,.13,z,2,.15,1.6,true);
    }
  }
  for(let x of [-40,40]) for(let z=-42;z<=42;z+=14) {
    torus(base,M.violet,.65,.09,x,2.6,z,0,0,0,32);
    b(M.edge,x,1.7,z,.65,2,.65);
  }
  // High mode: extra lattice, energy motes, rivets and nearby sparks.
  for(let x=-38;x<=38;x+=8) for(let z of [-38,-27,21,32]) {
    b(M.pale,x,10.12,z,.38,.045,.38,true);
  }
  for(let z=-44;z<=44;z+=11) for(let x of [-42,42]) {
    b(M.copper,x,17,z,2.4,.2,2.8,true);
    b(M.edge,x,21,z,2.4,.2,2.8,true);
  }
  for(let j=0;j<7;j++) {
    const z=-42+j*14;
    b(M.blue,0,29.4,z,12,.22,.16,true);
  }
  const motesCount=180;
  const motesPos = new Float32Array(motesCount*3);
  const motesGeo=keepG(new THREE.BufferGeometry());
  motesGeo.setAttribute('position',new THREE.BufferAttribute(motesPos,3));
  const motesMaterial=keepM(new THREE.PointsMaterial({color:0x76ffff,size:.16,transparent:true,opacity:.72,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true}));
  const motes=new THREE.Points(motesGeo,motesMaterial); high.add(motes);
  const seeds=new Float32Array(motesCount*4);
  // Deterministic PRNG for repeatable procedural animation.
  let rnd=1946;
  function rand() { rnd=(Math.imul(rnd,1664525)+1013904223)>>>0;return rnd/4294967296; }
  for(let i=0;i<motesCount;i++) {
    seeds[i*4]=rand()*2*Math.PI;
    seeds[i*4+1]=rand(); seeds[i*4+2]=rand(); seeds[i*4+3]=rand();
  }
  // Decorative lights are owned by the module, not the host scene.
  const lights=[];
  function localLight(color,intensity,distance,x,y,z,extra=false) {
    const light=new THREE.PointLight(color,intensity,distance,2);
    light.position.set(x,y,z); (extra?high:base).add(light); lights.push(light);
  }
  localLight(0x41def1,85,26,0,16,-9);
  localLight(0xff9b56,45,22,20,10,16);
  localLight(0x8160ff,40,21,-25,12,-14,true);
  localLight(0x55a8ff,38,23,27,12,-14,true);
  flushBatch();
  // ----- INTERACTION AND NAVIGATION INTERFACES -----
  const state={ time:0, quality:'low', overdrive:false, activeCount:0 };
  const majorSolids=[
    {type:'circle',x:0,z:-9,r:10},
    {type:'circle',x:-26,z:-13,r:7.5}, {type:'circle',x:26,z:-13,r:7.5},
    {type:'rect',x:-18,z:14,hx:5.5,hz:17},
    {type:'rect',x:20,z:16,hx:7.3,hz:8.7},
    ...[[-9,8],[31,34],[-12,-34]].map(([x,z])=>({type:'circle',x,z,r:2.7}))
  ];
  const upperRects=[
    {x:-36,z:0,hx:3.5,hz:39},{x:36,z:0,hx:3.5,hz:39},
    {x:0,z:-35.5,hx:38.5,hz:3.5},{x:0,z:35.5,hx:38.5,hz:3.5},
    {x:0,z:29,hx:35,hz:2.5},{x:0,z:-27,hx:35,hz:2.25},
    {x:-34,z:-26,hx:5,hz:3.5}
  ];
  const navigation={
    spawn:{x:0,y:0,z:42,yaw:0},
    bounds:{minX:-44,maxX:44,minZ:-47,maxZ:47,minY:-2,maxY:30},
    solids:majorSolids,
    upperWalkways:upperRects,
    ramp:{x:-36,width:6.4,zStart:30,zEnd:-26,heightStart:0,heightEnd:10},
    /** Returns floor height below feet (+0.5m step allowance); null outside hall. */
    sampleGround(x,z,feetY=0) {
      if(x<-45||x>45||z<-49||z>49) return null;
      let best=0;
      if(x>-39.2&&x<-32.8&&z<=30&&z>=-26) {
        const rise=10*(30-z)/56;
        if(rise<=feetY+.65) best=Math.max(best,rise);
      }
      if(feetY>=9.35 && upperRects.some(q=>Math.abs(x-q.x)<q.hx&&Math.abs(z-q.z)<q.hz)) best=10;
      return best;
    },
    collides(x,z,radius=.45,feetY=0) {
      if(x<-43+radius||x>43-radius||z<-46+radius||z>46-radius) return true;
      if(feetY>4.5) return false; // machines are on the lower floor
      return majorSolids.some(s=>s.type==='circle' ? Math.hypot(x-s.x,z-s.z)<s.r+radius :
        Math.abs(x-s.x)<s.hx+radius&&Math.abs(z-s.z)<s.hz+radius);
    }
  };
  function localPoint(worldPosition) {
    const v=worldPosition.isVector3?worldPosition.clone():new THREE.Vector3(worldPosition.x,worldPosition.y||0,worldPosition.z);
    root.updateWorldMatrix(true,false);
    return root.worldToLocal(v);
  }
  function getNearestInteraction(worldPosition,range=3.5) {
    const p=localPoint(worldPosition);
    let found=null,best=range;
    for(let c of consoles) {
      const d=Math.hypot(p.x-c.x,p.y-(c.y+1),p.z-c.z);
      if(d<best) {found=c;best=d;}
    }
    return found?{id:found.id,title:found.title,distance:best,active:found.active,
      requires:found.isMaster&&!state.overdrive&&state.activeCount<3?'Activate 3 sectors first':null}:null;
  }
  function interact(id) {
    const c=consoles.find(t=>t.id===id);
    if(!c) return {ok:false,message:'Unknown control station'};
    if(c.active) return {ok:false,message:'この装置はすでに稼働中'};
    if(c.isMaster&&state.activeCount<3) return {ok:false,message:'先に3つの補助設備を起動してください'};
    c.active=true;
    c.lampMat.color.setHex(c.isMaster?0xffffff:0x70ffca);
    if(c.isMaster) state.overdrive=true; else state.activeCount++;
    const message=c.isMaster?'ARC-HEART MAXIMUM OUTPUT / エーテル炉最大稼働！':`${c.title}：完了 (${state.activeCount}/3)`;
    if(typeof options.onEvent==='function') options.onEvent({type:c.isMaster?'overdrive':'sector-activated',id:c.id,message});
    return {ok:true,message,state:getState()};
  }
  function getState() {return {activeCount:state.activeCount,activeSectors:consoles.filter(c=>c.active&&!c.isMaster).map(c=>c.id),totalSectors:3,overdrive:state.overdrive,quality:state.quality};}
  function setQuality(mode) {
    state.quality=(mode==='high'||mode==='quality')?'high':'low';
    high.visible=state.quality==='high';
    for(const l of lights) l.intensity=(state.quality==='high'?1:.6)*l.userData.originalIntensity;
    return state.quality;
  }
  lights.forEach(l=>l.userData.originalIntensity=l.intensity);
  function update(dt=0,context={}) {
    if(!Number.isFinite(dt)) dt=0;
    const scale=Number.isFinite(context.timeScale)?Math.max(0,context.timeScale):1;
    dt=Math.min(Math.max(dt,0),.08)*scale;
    state.time+=dt;
    const t=state.time, speed=state.overdrive?1.8:1;
    for(let i=0;i<gyros.length;i++) {
      gyros[i].rotation[(i===1?'y':'z')]+=dt*speed*(i%2?-.22:.28);
      gyros[i].rotation.x+=dt*(i===2?-.15:.075)*speed;
    }
    heart.position.y=15+Math.sin(t*1.35)*.36;
    heart.rotation.y+=dt*.22*speed;
    coreMat.emissiveIntensity=(state.overdrive?4.5:2.4)+Math.sin(t*2.4)*.55;
    cage.rotation.y-=dt*.3*speed;
    for(let r of rotors) r.rotor.rotation.z+=dt*.92*r.sign*speed;
    for(let i=0;i<beltCrates.length;i++) {
      const c=beltCrates[i];
      c.position.set(0,2.4,16.2-((t*3.8*speed+i*5.75)%34));
      c.rotation.y=Math.sin(t*1.4+i)*.025;
    }
    let press=Math.pow(Math.max(0,Math.sin(t*1.4*speed)),4);
    platen.position.y=-press*3.6;
    for(let i=0;i<arms.length;i++) {
      const a=arms[i];
      a.shoulder.rotation.z=Math.sin(t*.71*speed+i*2.2)*.39*a.dir;
      a.shoulder.rotation.y=Math.sin(t*.37+i)*.6;
      a.elbow.rotation.z=-.65+Math.sin(t*.87*speed+i*1.7)*.45;
    }
    let tx=Math.sin(t*.20*speed)*21;
    let hangingY=16+Math.sin(t*.54)*.85;
    trolley.position.x=tx;
    dangling.position.set(tx,hangingY,23);
    hookRod.position.set(tx,(22.4+hangingY+1.5)/2,23);
    hookRod.scale.y=22.4-hangingY-1.5;
    dangling.rotation.y=Math.sin(t*.39)*.045;
    if(high.visible) {
      for(let i=0;i<motesCount;i++) {
        const o=i*3, p=i*4;
        const a=seeds[p]+Math.sin(t*.17+seeds[p])*0.4;
        const radius=4.3+seeds[p+1]*6.2;
        motesPos[o]=Math.cos(a)*radius;
        motesPos[o+1]=4+((seeds[p+2]*22+t*(.35+seeds[p+3]))%22);
        motesPos[o+2]=-9+Math.sin(a)*radius;
      }
      motesGeo.attributes.position.needsUpdate=true;
    }
  }
  function dispose() {
    root.removeFromParent();
    for(const g of geometries) g.dispose();
    for(const m of materials) m.dispose();
    for(const t of textures) t.dispose();
    root.clear();
  }
  setQuality(options.quality||'low');
  return { root, update, setQuality, dispose, navigation, getNearestInteraction, interact, getState,
    getBounds:()=>({...navigation.bounds}), version:'1.0.0' };
}
