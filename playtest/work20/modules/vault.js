/**
 * AETHER FRONTIER / Team 20
 * MERIDIAN VAULT: self-contained interactive 3D exploration module.
 * Three.js 0.160.0, right-handed coordinates: +Y up, -Z forward, 1 unit ~ 1m.
 * No renderer, camera, scene singleton, DOM or global handlers are created here.
 * Copyright (c) 2026 AETHER FRONTIER collaborative project.
 */
export function createAetherModule(THREE, options = {}) {
  if (!THREE || !THREE.Group || !THREE.Ray) throw new Error('THREE 0.160.0 instance required');
  const root = new THREE.Group();
  root.name = 'AF20_MeridianVault';
  root.userData.module = 'AETHER_FRONTIER_NO20';
  const modeMap = { low: 'low', lite: 'low', lightweight: 'low', high: 'high', quality: 'high' };
  let quality = modeMap[options.quality] || 'high';
  let alive = true, time = 0, doorProgress = 0, pulse = 0;
  const events = [];
  const ownedGeometries = new Set(), ownedMaterials = new Set(), ownedTextures = new Set();
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const colors = {
    stone: 0x263448, stoneLight: 0x3b4d60, stoneDark: 0x111e30,
    ink: 0x0b1727, brass: 0xb99d71, metal: 0x586a78,
    cyan: 0x56e8ec, gold: 0xffd791, coral: 0xff8e8b,
    void: 0x9aa6ff, cream: 0xe4e9db
  };
  function geom(g) { ownedGeometries.add(g); return g; }
  function material(m) { ownedMaterials.add(m); return m; }
  const mats = {
    stone: material(new THREE.MeshStandardMaterial({ color: colors.stone, roughness: .86, metalness: .1 })),
    lightStone: material(new THREE.MeshStandardMaterial({ color: colors.stoneLight, roughness: .75, metalness: .18 })),
    dark: material(new THREE.MeshStandardMaterial({ color: colors.stoneDark, roughness: .76, metalness: .2 })),
    metal: material(new THREE.MeshStandardMaterial({ color: colors.metal, roughness: .31, metalness: .79 })),
    brass: material(new THREE.MeshStandardMaterial({ color: colors.brass, roughness: .34, metalness: .75 })),
    ceramic: material(new THREE.MeshStandardMaterial({ color: colors.cream, roughness: .48, metalness: .34 })),
    cyan: material(new THREE.MeshBasicMaterial({ color: colors.cyan, toneMapped: false })),
    cyanDim: material(new THREE.MeshStandardMaterial({ color: 0x287d93, emissive: 0x115c75, emissiveIntensity: .55, metalness: .56, roughness: .22 })),
    gold: material(new THREE.MeshBasicMaterial({ color: colors.gold, toneMapped: false })),
    coral: material(new THREE.MeshBasicMaterial({ color: colors.coral, toneMapped: false })),
    inactive: material(new THREE.MeshBasicMaterial({ color: 0x415e70 })),
    glass: material(new THREE.MeshPhysicalMaterial({ color: 0x6eebff, metalness: .16, roughness: .1, transparent: true, opacity: .62, depthWrite: false, side: THREE.DoubleSide })),
    halo: material(new THREE.MeshBasicMaterial({ color: 0x54deed, transparent: true, opacity: .16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false })),
    goldHalo: material(new THREE.MeshBasicMaterial({ color: 0xffdc9d, transparent: true, opacity: .14, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false })),
    panels: material(new THREE.MeshStandardMaterial({ color: 0x34475c, roughness: .3, metalness: .72, side: THREE.DoubleSide })),
    edges: material(new THREE.MeshBasicMaterial({ color: 0x6cbdc9, transparent: true, opacity: .6, depthWrite: false, toneMapped: false })),
    whiteGlow: material(new THREE.MeshBasicMaterial({ color: 0xe4fff8, toneMapped: false })),
  };
  const highDetail = [], lowDetail = [];
  function box(parent, size, pos, mat = mats.stone, name = '') {
    const m = new THREE.Mesh(geom(new THREE.BoxGeometry(...size)), mat);
    m.position.set(...pos); m.name = name; parent.add(m); return m;
  }
  function cylinder(parent, rt, rb, h, segments, pos, mat, name = '') {
    const m = new THREE.Mesh(geom(new THREE.CylinderGeometry(rt, rb, h, segments)), mat);
    m.position.set(...pos); m.name = name; parent.add(m); return m;
  }
  function sphere(parent, radius, pos, mat, detail = 1) {
    const m = new THREE.Mesh(geom(new THREE.IcosahedronGeometry(radius, detail)), mat);
    m.position.set(...pos); parent.add(m); return m;
  }
  function ring(parent, r, thickness, pos, mat, axis = 'z', segments = 64) {
    const m = new THREE.Mesh(geom(new THREE.TorusGeometry(r, thickness, 7, segments)), mat);
    m.position.set(...pos);
    if (axis === 'y') m.rotation.x = Math.PI / 2;
    parent.add(m); return m;
  }
  function makeBeam(parent, a, b, colorMat, glowMat, radius = .055) {
    a = V(...a); b = V(...b);
    const diff = b.clone().sub(a), length = diff.length();
    const group = new THREE.Group(); parent.add(group);
    const center = a.clone().add(b).multiplyScalar(.5);
    const orientation = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), diff.normalize());
    const core = cylinder(group, radius, radius, length, 7, center.toArray(), colorMat);
    core.quaternion.copy(orientation);
    const aura = cylinder(group, radius * 4.3, radius * 4.3, length, 9, center.toArray(), glowMat);
    aura.quaternion.copy(orientation);
    highDetail.push(aura);
    return group;
  }
  function architecture(parent, opts = {}) {
    const floor = new THREE.Group(); floor.name = 'TraversableStage'; parent.add(floor);
    // Main plaza and an isolated overlook, joined to the vault corridor only by teleportation.
    cylinder(floor, 14.5, 14.9, .75, 12, [0, -.51, 0], mats.dark);
    cylinder(floor, 14.05, 14.35, .22, 12, [0, -.09, 0], mats.stone);
    ring(floor, 13.2, .08, [0, .038, 0], mats.brass, 'y', 96);
    ring(floor, 11.8, .04, [0, .041, 0], mats.cyanDim, 'y', 96);
    ring(floor, 5.1, .042, [0, .052, 0], mats.brass, 'y');
    ring(floor, 3.4, .02, [0, .052, 0], mats.cyanDim, 'y');
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      const marker = box(floor, [.11, .035, 1.65], [Math.sin(a) * 12.3, .055, Math.cos(a) * 12.3], mats.brass);
      marker.rotation.y = a;
      const base = cylinder(floor, .57, .73, .68, 6, [Math.sin(a)*14.0, .08, Math.cos(a)*14.0], mats.stone);
      ring(floor, .49, .035, [base.position.x, .45, base.position.z], mats.gold, 'y', 28);
    }
    const tileG = geom(new THREE.CylinderGeometry(.95, .95, .056, 6));
    const tileCount = 190;
    const tiles = new THREE.InstancedMesh(tileG, mats.lightStone, tileCount);
    const dummy = new THREE.Object3D(); let t = 0;
    for (let row = -8; row <= 8; row++) {
      for (let col = -8; col <= 8; col++) {
        const x = col * 1.68 + (row % 2) * .84, z = row * 1.44;
        if (x*x + z*z > 125 || x*x + z*z < 13.5 || t >= tileCount) continue;
        dummy.position.set(x, .052 + (t % 7) * .0005, z);
        dummy.rotation.set(0, Math.PI / 6, 0); dummy.scale.setScalar(.975);
        dummy.updateMatrix(); tiles.setMatrixAt(t++, dummy.matrix);
      }
    }
    tiles.count = t; tiles.instanceMatrix.needsUpdate = true; floor.add(tiles);
    box(floor, [8.8, .75, 19.2], [0, -.38, -20.65], mats.dark);
    box(floor, [8.35, .12, 19.2], [0, -.045, -20.65], mats.stone);
    for (const x of [-4, 4]) {
      box(floor, [.09, .035, 18.6], [x, .028, -20.65], mats.brass);
      for (let z=-13;z>-29;z-=2.1) {
        const b=box(floor, [.26,.18,.42],[x, .13,z],mats.metal); b.rotation.y=0;
      }
    }
    for (let z=-13;z>-29;z-=1.7) box(floor, [7.65, .028, .055], [0, .03,z], mats.lightStone);
    cylinder(floor, 9.7, 10.1, .9, 10, [0, -.56, -40], mats.dark);
    cylinder(floor, 9.35, 9.6, .2, 10, [0, -.07, -40], mats.stone);
    ring(floor, 8.8, .085, [0,.04,-40], mats.gold, 'y', 64);
    ring(floor, 6.8, .04, [0,.05,-40], mats.cyanDim, 'y');
    for (let i = 0; i < 10; i++) {
      const a = i * Math.PI * 2 / 10;
      const x=Math.cos(a)*8.5, z=-40+Math.sin(a)*8.5;
      cylinder(floor,.32,.48,1.15,6,[x,.53,z],mats.lightStone);
      sphere(floor,.23,[x,1.18,z],mats.cyan,0);
    }
    // Floating cliffs are pure scenery, not part of the collision surface.
    for (let i = 0; i < 11; i++) {
      const a = i*2.399, r=23+(i%4)*5;
      const x=Math.sin(a)*r, z=Math.cos(a)*r-15;
      const g = new THREE.Group(); g.position.set(x,-3.8-(i%3)*2.2,z); parent.add(g);
      const cliff = cylinder(g, 2.5+(i%3), 0.25, 5+(i%3)*3, 5, [0,0,0], mats.dark);
      cliff.rotation.z=(i%2?1:-1)*.13;
      cylinder(g,2.6+(i%3),2.85+(i%3),.5,6,[0,2.7+(i%3)*1.5,0],mats.stone);
      if (i%2===0) sphere(g,.4,[0,3.5+(i%3)*1.5,0],mats.cyanDim,1);
      highDetail.push(g);
    }
    return floor;
  }
  if (options.includeStage !== false) architecture(root);
  if (options.includeLights !== false) {
    const ambient = new THREE.HemisphereLight(0xaad9ef,0x131f33,2.0); root.add(ambient);
    const sun = new THREE.DirectionalLight(0xffe7ba,2.6); sun.position.set(-22,38,13); root.add(sun);
    const blue = new THREE.PointLight(0x5cecf7,13,21,2); blue.position.set(0,6,-9); root.add(blue);
    highDetail.push(blue);
  }
  // Decorative runic disks have real physical positions but are not interactable.
  for (let i=0; i<14; i++) {
    const a=i*Math.PI*2/14;
    const x=Math.sin(a)*10.8,z=Math.cos(a)*10.8;
    const s=sphere(root,.23,[x,.34,z],i%3===0?mats.gold:mats.cyanDim,0);
    highDetail.push(s);
  }
  const relayDefs = [
    { id:'azur', name:'蒼天位相器', short:'蒼天', pos:[-8.1,0,-2.8], color:0x55e6f7, target:2, initial:0 },
    { id:'ember', name:'黄昏位相器', short:'黄昏', pos:[8.2,0,-2.8], color:0xffb48b, target:4, initial:1 },
    { id:'lumen', name:'星影位相器', short:'星影', pos:[-7.2,0,7.0], color:0xb8a2ff, target:1, initial:5 },
  ];
  const defaultState = () => ({
    version: 1, relays: Object.fromEntries(relayDefs.map(d => [d.id,d.initial])),
    coreHeld:false, coreDocked:false, unlocked:false, transfers:0, discoveries:0
  });
  let state = defaultState();
  const targets = new Map();
  function addTarget(id, label, position, radius, actionHint, canUse) {
    targets.set(id,{id,label,position:V(...position),radius,actionHint,canUse});
  }
  const relayVisuals = [];
  const beamVisuals = [];
  function relay(d,i) {
    const g=new THREE.Group(); g.name=`Relay_${d.id}`;
    g.position.set(...d.pos); root.add(g);
    cylinder(g,1.14,1.31,.28,8,[0,.12,0],mats.dark);
    cylinder(g,.89,1.04,1.1,8,[0,.77,0],mats.stone);
    ring(g,1.08,.065,[0,.32,0],mats.brass,'y');
    for (let n=0;n<6;n++) {
      const a=n*Math.PI/3;
      const x=Math.cos(a)*.85,z=Math.sin(a)*.85;
      box(g,[.12,.75,.17],[x,1.18,z],mats.metal).rotation.y=-a;
    }
    const face = new THREE.Group();face.position.set(0,2.22,.16);g.add(face);
    cylinder(g,.5,.67,.74,8,[0,1.44,0],mats.metal);
    const disk = cylinder(face,1.04,1.04,.15,48,[0,0,0],mats.dark);disk.rotation.x=Math.PI/2;
    ring(face,1.03,.078,[0,0,.115],mats.brass);
    ring(face,.73,.033,[0,0,.13],mats.cyanDim);
    ring(face,1.21,.015,[0,0,.1],mats.goldHalo);
    const nodes=[];
    for (let n=0;n<6;n++) {
      const a=Math.PI/2 - n*Math.PI/3;
      const x=Math.cos(a)*.95,y=Math.sin(a)*.95;
      const m=sphere(face,.112,[x,y,.19],n===d.target?mats.gold:mats.inactive,1);
      nodes.push(m);
      if (n===d.target) {
        const halo=sphere(face,.18,[x,y,.135],mats.goldHalo,1);highDetail.push(halo);
      }
    }
    const rotor=new THREE.Group();rotor.position.z=.18;face.add(rotor);
    box(rotor,[.14,1.0,.12],[0,.44,0],mats.cyan);
    sphere(rotor,.175,[0,0,.11],mats.ceramic,1);
    sphere(rotor,.18,[0,.91,.01],mats.whiteGlow,1);
    const crystal = sphere(g,.36,[0,3.01,-.02],mats.glass,1);
    const aura = sphere(g,.57,[0,3.01,-.02],mats.halo,1);
    highDetail.push(aura);
    const banner=box(g,[.84,.12,.15],[0,1.53,.72],mats.brass);
    addTarget(`relay_${d.id}`,d.name,[d.pos[0],2.25,d.pos[2]+.22],1.45,'位相盤を60°回転',()=>true);
    const beam = makeBeam(root,[d.pos[0],3.05,d.pos[2]],[0,4.95,-11.7],mats.cyan,mats.halo,.037);
    beamVisuals.push(beam);
    relayVisuals.push({d,g,rotor,crystal,aura,beam});
    return g;
  }
  relayDefs.forEach(relay);
  const coreStation = new THREE.Group();coreStation.name='AetherCell_Station';
  coreStation.position.set(7.6,0,6.6);root.add(coreStation);
  cylinder(coreStation,1.06,1.12,.4,8,[0,.2,0],mats.dark);
  cylinder(coreStation,.72,.84,1.25,8,[0,.92,0],mats.stone);
  ring(coreStation,.7,.06,[0,1.55,0],mats.brass,'y');
  for(let k=0;k<4;k++){
    let a=k*Math.PI/2;
    box(coreStation,[.14,1.1,.14],[Math.cos(a)*.63,2.0,Math.sin(a)*.63],mats.metal);
  }
  const coreFloat=new THREE.Group();coreFloat.position.y=2.13;coreStation.add(coreFloat);
  const coreCrystal=sphere(coreFloat,.5,[0,0,0],mats.glass,1);coreCrystal.scale.set(1,.95,.72);
  const coreInner=sphere(coreFloat,.23,[0,0,0],mats.whiteGlow,0);
  ring(coreFloat,.63,.033,[0,0,0],mats.cyan,'y');
  const coreHalo=sphere(coreFloat,.78,[0,0,0],mats.halo,1);highDetail.push(coreHalo);
  addTarget('cell','星核保管台',[7.6,2.0,6.6],1.55,'星核を回収',()=>!state.coreHeld&&!state.coreDocked);
  const socket = new THREE.Group();socket.position.set(0,0,-8.15);socket.name='Vault_PowerSocket';root.add(socket);
  cylinder(socket,1.06,1.15,.5,8,[0,.22,0],mats.dark);
  cylinder(socket,.75,.96,1.03,8,[0,.95,0],mats.stone);
  ring(socket,.81,.071,[0,1.5,0],mats.brass,'y');
  ring(socket,.53,.09,[0,1.53,0],mats.cyanDim,'y');
  for(let n=0;n<6;n++){
    const a=n*Math.PI/3;
    box(socket,[.09,.44,.16],[Math.cos(a)*.73,1.7,Math.sin(a)*.73],mats.brass);
  }
  const dockedCore = new THREE.Group();socket.add(dockedCore);dockedCore.position.set(0,2.04,0);
  sphere(dockedCore,.4,[0,0,0],mats.glass,1);
  sphere(dockedCore,.22,[0,0,0],mats.whiteGlow,0);
  ring(dockedCore,.56,.034,[0,0,0],mats.cyan,'y');
  addTarget('socket','中枢星核スロット',[0,1.85,-8.15],1.35,'星核を接続',()=>state.coreHeld || state.coreDocked);
  const crown=new THREE.Group();crown.name='CentralNexus';crown.position.set(0,4.95,-11.7);root.add(crown);
  sphere(crown,.61,[0,0,0],mats.glass,2);
  sphere(crown,.23,[0,0,0],mats.whiteGlow,1);
  ring(crown,.9,.045,[0,0,0],mats.brass,'y');
  ring(crown,.88,.045,[0,0,0],mats.cyan,'x');
  const crownAura = sphere(crown,1.1,[0,0,0],mats.halo,1);highDetail.push(crownAura);
  // Six independent iris panels slide OUT radially once the power circuit latches.
  const door = new THREE.Group();door.name='SixLeafIris';door.position.set(0,3.15,-12.15);root.add(door);
  cylinder(door,3.45,3.45,.44,64,[0,0,0],mats.metal).rotation.x=Math.PI/2;
  // Re-open the center of the circular disk with depth arrangement: iris leaves sit in front.
  ring(door,3.43,.22,[0,0,.26],mats.brass);
  ring(door,3.16,.06,[0,0,.26],mats.cyan);
  ring(door,3.68,.056,[0,0,.05],mats.goldHalo);
  for(const side of [-1,1]) {
    box(root,[1.15,6.75,1.6],[side*3.44,3.1,-12.3],mats.stone);
    box(root,[.13,5.55,.2],[side*2.92,3.1,-11.3],mats.brass);
    sphere(root,.26,[side*3.44,6.6,-11.5],mats.gold,0);
  }
  box(root,[7.6,.85,1.5],[0,6.8,-12.3],mats.stone);
  for(let n=0;n<7;n++) box(root,[.12,.15,.16],[-2.2+n*.73,6.26,-11.46],n%2?mats.gold:mats.cyan);
  const leaves=[];
  for(let n=0;n<6;n++) {
    const a=n*Math.PI*2/6;
    const radius=3.19;
    const sh=new THREE.Shape();
    sh.moveTo(Math.cos(a+.10)*.15,Math.sin(a+.10)*.15);
    const seg=8;
    for(let j=0;j<=seg;j++){
      const angle=a+(.02+j/seg*(Math.PI/3-.04));
      sh.lineTo(Math.cos(angle)*radius,Math.sin(angle)*radius);
    }
    sh.lineTo(Math.cos(a+Math.PI/3-.10)*.15, Math.sin(a+Math.PI/3-.10)*.15);
    sh.closePath();
    const blade = new THREE.Mesh(geom(new THREE.ExtrudeGeometry(sh,{depth:.31,bevelEnabled:true,bevelThickness:.055,bevelSize:.038,bevelSegments:1,steps:1})),mats.panels);
    blade.position.z=.42;door.add(blade);
    const glyph=box(blade,[.72,.07,.06],[Math.cos(a+Math.PI/6)*1.9,Math.sin(a+Math.PI/6)*1.9,.37],mats.brass);
    glyph.rotation.z=a+Math.PI/6;
    leaves.push({blade,a});
  }
  // The back cylinder face is hidden when aperture is fully open (avoid an invisible wall).
  const doorDisk=door.children.find(x=>x.isMesh && x.geometry.type==='CylinderGeometry');
  addTarget('door','六葉封印門',[0,2.55,-11.85],2.7,'封印状態を調べる',()=>true);
  // Rune/inscription console near the start. Useful for hints, no hard-coded puzzle answer.
  const consoleG=new THREE.Group();consoleG.position.set(3.8,0,7.8);consoleG.name='LoreConsole';root.add(consoleG);
  cylinder(consoleG,.7,.85,1.0,6,[0,.47,0],mats.dark);
  box(consoleG,[1.27,1.27,.25],[0,1.68,0],mats.metal).rotation.x=-.13;
  const screen=box(consoleG,[.96,.94,.07],[0,1.66,.18],mats.cyanDim);screen.rotation.x=-.13;
  for(let i=0;i<4;i++){
    box(consoleG,[.7-i*.1,.036,.05],[0,1.92-i*.16,.24],i===0?mats.gold:mats.cyan);
  }
  addTarget('archive','古代端末「星録」',[3.8,1.8,7.8],1.0,'探索ヒントを読む',()=>true);
  // Secondary manual reset is placed on the distant overlook as a replay shortcut.
  const resetBase=new THREE.Group();resetBase.position.set(5.3,0,-39.2);root.add(resetBase);
  cylinder(resetBase,.7,.85,.89,8,[0,.42,0],mats.stone);
  ring(resetBase,.62,.065,[0,.94,0],mats.gold,'y');
  sphere(resetBase,.25,[0,1.18,0],mats.coral,1);
  addTarget('reset','時環再起動装置',[5.3,1.15,-39.2],1.0,'仕掛けを初期状態に戻す',()=>true);
  function gate(z, color, id, label) {
    const g=new THREE.Group();g.position.set(0,3.1,z);g.name=id;root.add(g);
    for(const side of [-1,1]){
      cylinder(g,.48,.68,3.8,8,[side*2.8,-1.35,0],mats.stone);
      sphere(g,.23,[side*2.8,1.15,0],mats.gold,1);
    }
    ring(g,2.52,.22,[0,0,0],mats.metal);
    ring(g,2.53,.075,[0,0,.17],color==='gold'?mats.gold:mats.cyan);
    ring(g,2.27,.06,[0,0,.18],mats.brass);
    const swirlA=ring(g,2.01,.035,[0,0,.27],mats.cyan);
    const swirlB=ring(g,1.55,.027,[0,0,.27],mats.gold);
    const prism=new THREE.Group(); g.add(prism);
    for(let n=0;n<8;n++){
      const a=n*Math.PI/4;
      const spike=sphere(prism,.19,[Math.cos(a)*1.65,Math.sin(a)*1.65,.23],n%2?mats.gold:mats.cyan,0);
      spike.scale.set(.64,1.7,.45);spike.rotation.z=a-Math.PI/2;
    }
    // Procedural energy surface: intentionally one draw call, no bloom/postprocessing dependency.
    const gateMat = material(new THREE.ShaderMaterial({
      uniforms:{uTime:{value:0},uActive:{value:0},uColor:{value:new THREE.Color(color==='gold'?0xffcda2:0x65dfe9)}},
      vertexShader:`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader:`precision mediump float; varying vec2 vUv; uniform float uTime; uniform float uActive; uniform vec3 uColor;
      void main(){vec2 p=vUv-.5;float r=length(p)*2.;float ang=atan(p.y,p.x);float s=sin(14.*r-2.4*uTime+sin(6.*ang+uTime)*.65);float wave=smoothstep(-.8,1.,s);float edge=1.-smoothstep(.64,.98,r);float shards=pow(max(0.,sin(9.*ang+uTime*.65+6.*r)),10.);float a=(.09+.34*wave+.24*shards)*edge*uActive;vec3 c=uColor*(.5+wave*.8)+vec3(.35,.3,.45)*shards;gl_FragColor=vec4(c,a);}`,
      transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false
    }));
    const disc=new THREE.Mesh(geom(new THREE.CircleGeometry(2.22,64)),gateMat);disc.position.z=.06;g.add(disc);
    const fullGlow=ring(g,2.66,.11,[0,0,.05],mats.halo);highDetail.push(fullGlow);
    addTarget(id,label,[0,2.9,z],2.3,'転移門を起動',()=>true);
    return {g,swirlA,swirlB,prism,disc,gateMat,fullGlow,id};
  }
  const mainGate=gate(-23.2,'cyan','gate_main','星環転送ゲート');
  const returnGate=gate(-43.2,'gold','gate_return','帰還転送ゲート');
  const gates=[mainGate,returnGate];
  const sigils=[];
  for(let i=0;i<24;i++) {
    const a=i*Math.PI*2/24;
    const r=2.97;
    const m=box(mainGate.g,[.05,.24,.055],[Math.sin(a)*r,Math.cos(a)*r,.18],i%4===0?mats.gold:mats.cyanDim);
    m.rotation.z=-a;
    sigils.push(m);
  }
  const particlesG=new THREE.Group();particlesG.name='HighDetailMotes';root.add(particlesG);
  const particleGeo=geom(new THREE.SphereGeometry(.045,4,3));
  const particleMesh=new THREE.InstancedMesh(particleGeo,mats.cyan,110);
  particleMesh.frustumCulled=false;particlesG.add(particleMesh);
  const particleData=[];
  for(let i=0;i<110;i++){
    const a=i*2.3999632297,r=4+(i%7)*1.45;
    particleData.push({x:Math.cos(a)*r,z:Math.sin(a)*r-10,y:.6+(i%11)*.52,phase:i*1.43});
  }
  const ghost = new THREE.Object3D();
  function emit(type, details={}) {
    const event={ type, ...details };
    events.push(event); if(events.length>80)events.shift();
    if (typeof options.onEvent==='function') options.onEvent(event);
    return event;
  }
  function relayCount(){return relayDefs.reduce((n,d)=>n+Number(state.relays[d.id]===d.target),0);}
  function isReady(){return relayCount()===3 && state.coreDocked;}
  function syncVisuals(snap=false) {
    for (let i=0;i<relayDefs.length;i++) {
      const {d,rotor,crystal,aura,beam}=relayVisuals[i];
      const aligned=state.relays[d.id]===d.target;
      rotor.rotation.z=-state.relays[d.id]*Math.PI/3;
      crystal.material=aligned?mats.whiteGlow:mats.glass;
      beam.visible=aligned;
      aura.visible=aligned && quality==='high';
    }
    coreFloat.visible=!state.coreHeld&&!state.coreDocked;
    dockedCore.visible=state.coreDocked;
    if (snap) doorProgress=state.unlocked?1:0;
  }
  function unlockIfReady() {
    if(!state.unlocked&&isReady()) {
      state.unlocked=true;emit('vault_unlocked',{message:'六葉封印門のロックが解除された'});
      return true;
    }
    return false;
  }
  function getState(){return JSON.parse(JSON.stringify(state));}
  function setState(value={}) {
    if (!alive) return;
    const old=defaultState();
    const relays=value&&value.relays&&typeof value.relays==='object'?value.relays:{};
    for(const d of relayDefs){const n=Number(relays[d.id]);old.relays[d.id]=Number.isFinite(n)?Math.max(0,Math.min(5,Math.floor(n))):d.initial;}
    old.coreHeld=Boolean(value.coreHeld);old.coreDocked=Boolean(value.coreDocked);
    if (old.coreHeld && old.coreDocked) old.coreHeld=false;
    old.unlocked=Boolean(value.unlocked)||(relayDefs.every(d=>old.relays[d.id]===d.target)&&old.coreDocked);
    old.transfers=Math.max(0,Math.floor(Number(value.transfers)||0));
    old.discoveries=Math.max(0,Math.floor(Number(value.discoveries)||0));
    state=old; syncVisuals(true);emit('state_loaded');
  }
  function reset() {
    state=defaultState();syncVisuals();emit('reset',{message:'星環機関を再起動した'});
    return {ok:true,type:'reset',message:'星環機関を再起動した'};
  }
  function interact(id,context={}) {
    if(!alive)return {ok:false,type:'disposed'};
    const target=targets.get(id);
    if(!target)return {ok:false,type:'unknown_target',id};
    if (context.requireRange===true && context.playerPosition) {
      const p=V().copy(context.playerPosition);root.worldToLocal(p);
      if(p.distanceTo(target.position)>4.25)return {ok:false,type:'out_of_range'};
    }
    if(id.startsWith('relay_')) {
      const d=relayDefs.find(x=>id===`relay_${x.id}`);
      if(!d)return {ok:false,type:'unknown_target'};
      state.relays[d.id]=(state.relays[d.id]+1)%6;
      const aligned=state.relays[d.id]===d.target;
      syncVisuals();
      emit('relay_rotated',{id:d.id,step:state.relays[d.id],aligned,alignedCount:relayCount()});
      unlockIfReady();
      return {ok:true,type:'relay',id:d.id,aligned,message:aligned?`${d.short}の回路が共鳴した`:`${d.short}の位相盤を回転させた`};
    }
    if(id==='cell') {
      if(state.coreHeld)return {ok:false,type:'already_holding',message:'星核を運搬中'};
      if(state.coreDocked)return {ok:false,type:'already_docked',message:'星核は接続済み'};
      state.coreHeld=true;syncVisuals();emit('core_picked_up');
      return {ok:true,type:'pickup',message:'星核を回収した。中枢スロットへ運ぼう'};
    }
    if(id==='socket') {
      if(state.coreHeld) {
        state.coreHeld=false;state.coreDocked=true;syncVisuals();emit('core_inserted');
        unlockIfReady();
        return {ok:true,type:'insert',message:state.unlocked?'動力接続完了。封印門が開く':'星核を接続した。位相器をすべて揃えよう'};
      }
      if(state.coreDocked && !state.unlocked) {
        state.coreDocked=false;state.coreHeld=true;syncVisuals();emit('core_removed');
        return {ok:true,type:'pickup',message:'星核を取り外した'};
      }
      return {ok:false,type:'empty',message:'接続する星核を持っていない'};
    }
    if(id==='door') {
      return {ok:true,type:'inspect',message:state.unlocked?'封印解除。星環転送門へ進める':`封印中：位相器 ${relayCount()}/3、星核 ${state.coreDocked?'接続済み':'未接続'}`};
    }
    if(id==='archive') {
      state.discoveries++;
      emit('archive_read',{count:state.discoveries});
      return {ok:true,type:'lore',message:'端末：各位相盤の金色の目盛りに指針を重ね、星核を中枢へ。'};
    }
    if(id==='reset')return reset();
    if(id==='gate_main') {
      if(!state.unlocked)return {ok:false,type:'locked',message:'転送門は封印門と連動している'};
      if(doorProgress<.88)return {ok:false,type:'opening',message:'封印門の展開を待っている'};
      const localPosition={x:0,y:0,z:-39.1};
      const wp=root.localToWorld(V(localPosition.x,localPosition.y,localPosition.z));
      const position={x:wp.x,y:wp.y,z:wp.z};state.transfers++;
      const e=emit('teleport',{from:'main',to:'overlook',position,localPosition});
      if(typeof options.onTeleport==='function')options.onTeleport(e);
      return {ok:true,type:'teleport',position,localPosition,message:'星海の展望台へ転送した'};
    }
    if(id==='gate_return') {
      const localPosition={x:0,y:0,z:9.5};
      const wp=root.localToWorld(V(localPosition.x,localPosition.y,localPosition.z));
      const position={x:wp.x,y:wp.y,z:wp.z};state.transfers++;
      const e=emit('teleport',{from:'overlook',to:'main',position,localPosition});
      if(typeof options.onTeleport==='function')options.onTeleport(e);
      return {ok:true,type:'teleport',position,localPosition,message:'星環広場へ帰還した'};
    }
    return {ok:false,type:'unknown_target'};
  }
  /**
   * Query nearest aim target. World-space camera ray, optional world-space playerPosition.
   * Operates independently of current renderer/camera or control implementation.
   */
  function findInteractable({origin,direction,playerPosition,maxDistance=22,maxPlayerDistance=4.0}={}) {
    if(!origin||!direction)return null;
    root.updateWorldMatrix(true,false);
    const worldOrigin=V().copy(origin),dir=V().copy(direction).normalize();
    const ray=new THREE.Ray(worldOrigin,dir);
    const pp=playerPosition?V().copy(playerPosition):null;
    let best=null,bestScore=Infinity;
    for(const t of targets.values()) {
      const at=root.localToWorld(t.position.clone());
      const dist=at.distanceTo(worldOrigin);
      const to=at.clone().sub(worldOrigin), along=to.dot(dir);
      if(along<-.2 || along>maxDistance || dist>maxDistance+1)continue;
      const playerDistance=pp?pp.distanceTo(at):dist;
      if(playerDistance>maxPlayerDistance)continue;
      const miss=ray.distanceToPoint(at);
      if(miss>t.radius)continue;
      const score=miss/t.radius*.85+along*.016+(t.id==='door'?.21:0);
      if(score<bestScore){bestScore=score;best={id:t.id,label:t.label,hint:t.actionHint,position:at,distance:playerDistance,available:t.canUse()};}
    }
    return best;
  }
  function getInteractables() {
    root.updateWorldMatrix(true,false);
    return Array.from(targets.values(),t=>({
      id:t.id,label:t.label,action:t.actionHint,position:root.localToWorld(t.position.clone()),radius:t.radius,available:t.canUse()
    }));
  }
  /** Collider descriptors for host physics. Local coords; door obstruction omitted if open. */
  function getColliders() {
    const fixed=[
      {id:'archive',type:'cylinder',center:{x:3.8,y:.62,z:7.8},radius:.70,height:1.25},
      {id:'core_station',type:'cylinder',center:{x:7.6,y:.55,z:6.6},radius:1.0,height:1.3},
      {id:'socket',type:'cylinder',center:{x:0,y:.68,z:-8.15},radius:.98,height:1.35},
      ...relayDefs.map(d=>({id:'relay_'+d.id,type:'cylinder',center:{x:d.pos[0],y:.82,z:d.pos[2]},radius:1.1,height:1.65}))
    ];
    if(doorProgress<.85) fixed.push({id:'iris_closed',type:'box',center:{x:0,y:3.15,z:-12.15},size:{x:6.2,y:6.3,z:.8}});
    return fixed;
  }
  /** Demo-ground helper. Integrators are free to use their own movement/collision world. */
  function isWalkable(x,z) {
    const plaza = x*x + z*z < 13.7*13.7;
    const corridor = Math.abs(x)<4.05 && z<=-10.6 && z>=-29.7;
    const overlook = x*x+(z+40)*(z+40) < 9.05*9.05;
    return plaza || corridor || overlook;
  }
  function isPassageClear(x,z,nx,nz) {
    if(!isWalkable(nx,nz))return false;
    if(doorProgress<.85 && Math.abs(nx)<4.2 && ((z>-11.85 && nz<=-11.85)||(z<-12.45 && nz>=-12.45)))return false;
    return true;
  }
  function update(dt=0,context={}) {
    if(!alive)return;
    dt=Math.min(.075,Math.max(0,Number(dt)||0));time+=dt;
    const target=state.unlocked?1:0;
    doorProgress += (target-doorProgress)*Math.min(1,dt*1.23);
    if(Math.abs(target-doorProgress)<.0001)doorProgress=target;
    const smooth=doorProgress*doorProgress*(3-2*doorProgress);
    for(const {blade,a} of leaves) {
      blade.position.x=Math.cos(a+Math.PI/6)*smooth*4.35;
      blade.position.y=Math.sin(a+Math.PI/6)*smooth*4.35;
      blade.rotation.z=-smooth*.19;
      blade.visible=smooth<.98;
    }
    doorDisk.visible=smooth<.9;
    for (const {d,crystal,rotor} of relayVisuals) {
      const aligned=state.relays[d.id]===d.target;
      crystal.scale.setScalar(1+Math.sin(time*3.1+state.relays[d.id])*(aligned?.08:.025));
    }
    coreFloat.rotation.y=time*.7;
    coreFloat.position.y=2.13+Math.sin(time*1.8)*.13;
    dockedCore.rotation.y=-time*.7;
    dockedCore.position.y=2.04+Math.sin(time*2.1)*.06;
    crown.rotation.y=time*.27;
    crown.children[1].scale.setScalar(1+.12*Math.sin(time*3));
    for(let i=0;i<gates.length;i++) {
      const ga=gates[i];const enabled=ga===returnGate||state.unlocked;
      ga.swirlA.rotation.z=time*.26*(i?-.65:1);
      ga.swirlB.rotation.z=-time*.38;
      ga.prism.rotation.z=-time*.21;
      ga.gateMat.uniforms.uTime.value=time;
      ga.gateMat.uniforms.uActive.value=enabled?1:0;
      ga.swirlA.material=enabled?mats.cyan:mats.inactive;
      ga.fullGlow.visible=enabled && quality==='high';
      ga.disc.visible=enabled;
    }
    if(quality==='high') {
      for(let i=0;i<particleData.length;i++){
        const p=particleData[i];
        ghost.position.set(p.x+.3*Math.sin(time*.6+p.phase),p.y+.19*Math.sin(time*1.15+p.phase),p.z);
        ghost.scale.setScalar(.52+.42*(.5+.5*Math.sin(time*2+p.phase)));
        ghost.updateMatrix();particleMesh.setMatrixAt(i,ghost.matrix);
      }
      particleMesh.instanceMatrix.needsUpdate=true;
    }
    pulse=Math.sin(time*2.3);
    mats.halo.opacity=.12+.07*(.5+.5*pulse);
    mats.goldHalo.opacity=.11+.07*(.5+.5*Math.sin(time*1.7));
  }
  function setQuality(mode='high') {
    quality=modeMap[mode]||'high';
    highDetail.forEach(o=>{o.visible=quality==='high';});
    relayVisuals.forEach(v=>{v.aura.visible=quality==='high' && state.relays[v.d.id]===v.d.target;});
    gates.forEach(g=>{g.fullGlow.visible=quality==='high' && (g===returnGate||state.unlocked);});
    lowDetail.forEach(o=>{o.visible=quality==='low';});
    particlesG.visible=quality==='high';
    for(const beam of beamVisuals){ if(beam.children[1]) beam.children[1].visible=quality==='high'; }
    for(const g of gates){g.disc.material.uniforms.uActive.value=(g===returnGate||state.unlocked)?1:0;}
    return quality;
  }
  function consumeEvents(){return events.splice(0);}
  function dispose() {
    if(!alive)return;alive=false;
    root.parent?.remove(root);
    for(const g of ownedGeometries)g.dispose();
    for(const m of ownedMaterials)m.dispose();
    for(const t of ownedTextures)t.dispose();
    targets.clear();events.length=0;
    root.clear();
  }
  syncVisuals(true);
  setQuality(quality);
  root.userData.getState=getState;
  return {
    root, update, setQuality, dispose, findInteractable, interact,
    getInteractables, getColliders, isWalkable, isPassageClear,
    getState,setState,reset,consumeEvents,
    getQuality:()=>quality,
    getProgress:()=>({aligned:relayCount(),total:3,coreHeld:state.coreHeld,coreDocked:state.coreDocked,unlocked:state.unlocked,doorOpen:doorProgress,transfers:state.transfers}),
    getSpawn:()=>({x:0,y:0,z:10.9}),
    getBounds:()=>({min:{x:-15,y:-6,z:-49.5},max:{x:15,y:9,z:15}})
  };
}
