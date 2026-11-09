/**
 * AETHER FRONTIER / Team No.14
 * VESTIGE-Ω (Vestige Omega), the Hexa-Seal Guardian
 * Three.js r160, Y-up, front -Z, 1 world unit ~= 1 metre
 * No renderer, camera, lighting, audio, combat system or global listeners are created here.
 *
 * @param {typeof import('three')} THREE - host's THREE namespace
 * @param {object} options - { quality:'low'|'high', onEvent:(event)=>void }
 * @returns {{root:THREE.Group,update, setQuality, dispose, setMotion, startAttack, receiveHit, getStatus, getAttackSpec}}
 */
export function createAetherModule(THREE, options = {}) {
  const root = new THREE.Group();
  root.name = 'AF14_VESTIGE_OMEGA';
  root.userData.moduleId = 'AF-NO14';
  root.userData.forward = '-Z';
  root.userData.unitMetres = 1;
  const allGeo = new Set();
  const allMat = new Set();
  const geometry = (g) => { allGeo.add(g); return g; };
  const material = (m) => { allMat.add(m); return m; };
  const lowHidden = []; // Fine engraving / reinforcing rods are skipped in lightweight mode.
  const highDetail = new THREE.Group();
  highDetail.name = 'highDetail';
  root.add(highDetail);

  const STONE = material(new THREE.MeshStandardMaterial({color: 0x38484e, roughness: .93, metalness: .06, flatShading: true}));
  const STONE_DARK = material(new THREE.MeshStandardMaterial({color: 0x202d37, roughness: .88, metalness: .12, flatShading: true}));
  const STONE_LIGHT = material(new THREE.MeshStandardMaterial({color: 0x677c7c, roughness: .86, metalness: .08, flatShading: true}));
  const EDGE = material(new THREE.MeshStandardMaterial({color: 0x938568, roughness: .46, metalness: .72}));
  const EDGE_DARK = material(new THREE.MeshStandardMaterial({color: 0x554e45, roughness: .56, metalness: .58}));
  const IRON = material(new THREE.MeshStandardMaterial({color: 0x15212c, roughness: .4, metalness: .83}));
  const ENERGY = material(new THREE.MeshStandardMaterial({color: 0x75fff0, emissive: 0x18d7cb, emissiveIntensity: 1.5, roughness: .17, metalness: .18}));
  const ENERGY_INNER = material(new THREE.MeshStandardMaterial({color: 0xd3fff4, emissive: 0x61fef1, emissiveIntensity: 1.7, roughness: .14}));
  const RED = material(new THREE.MeshBasicMaterial({color: 0xff6b3b}));
  const LINE = material(new THREE.LineBasicMaterial({color: 0x58c9bd, transparent: true, opacity: .74}));
  const DAMAGE = material(new THREE.MeshBasicMaterial({color: 0xffb782, transparent: true, opacity: 0, depthWrite: false}));
  const GLOW = material(new THREE.MeshBasicMaterial({color: 0x39ffde, transparent: true, opacity: .27, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide}));

  const boxGeo = (x,y,z) => geometry(new THREE.BoxGeometry(x,y,z));
  const sphereGeo = (r,d=1) => geometry(new THREE.IcosahedronGeometry(r,d));
  function mesh(p,g,m,x=0,y=0,z=0) {
    const a = new THREE.Mesh(g,m);
    a.position.set(x,y,z); a.castShadow = true; a.receiveShadow = true;
    p.add(a); return a;
  }
  function box(p,x,y,z, sx,sy,sz, m=STONE) { return mesh(p,boxGeo(sx,sy,sz),m,x,y,z); }
  function ico(p,r,x,y,z,m=STONE,d=0) { return mesh(p,sphereGeo(r,d),m,x,y,z); }
  function torus(p,r,t,x,y,z,m=EDGE,arc=Math.PI*2,radial=8,tubular=40) {
    return mesh(p,geometry(new THREE.TorusGeometry(r,t,radial,tubular,arc)),m,x,y,z);
  }
  function cyl(p,r1,r2,h,x,y,z,m=STONE,segments=8) {
    return mesh(p,geometry(new THREE.CylinderGeometry(r1,r2,h,segments,1)),m,x,y,z);
  }
  function rod(p,a,b,r,m=IRON,n=7) {
    const v1=new THREE.Vector3(...a), v2=new THREE.Vector3(...b);
    const mid=v1.clone().add(v2).multiplyScalar(.5);
    const part=cyl(p,r,r,v1.distanceTo(v2),mid.x,mid.y,mid.z,m,n);
    part.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v2.sub(v1).normalize());
    lowHidden.push(part);
    return part;
  }
  function panel(p,pts,x,y,z,depth=.18,m=STONE,outline=true) {
    const s = new THREE.Shape();
    pts.forEach(([px,py],i) => i===0 ? s.moveTo(px,py) : s.lineTo(px,py));
    s.closePath();
    const g=geometry(new THREE.ExtrudeGeometry(s,{depth,steps:1,bevelEnabled:true,bevelSegments:1,bevelThickness:.055,bevelSize:.075,curveSegments:2}));
    const ob=mesh(p,g,m,x,y,z); ob.rotation.y=Math.PI;
    if(outline) {
      const path=pts.map(([px,py])=>new THREE.Vector3(-px,py,-.13));
      const loop=new THREE.LineLoop(geometry(new THREE.BufferGeometry().setFromPoints(path)),LINE);
      loop.position.set(x,y,z); p.add(loop);lowHidden.push(loop);
    }
    return ob;
  }
  function rune(p,sz,x,y,z,flip=0) {
    const v=[];
    // Hand-etched monoline ancient circuitry, not texture-dependent.
    const strokes=[[-.48,0,0,.47],[0,.47,.48,0],[.48,0,0,-.47],[0,-.47,-.48,0],[-.24,0,.24,0],[0,.23,0,-.23],[-.15,.18,0,.33],[0,.33,.15,.18]];
    for(const [x1,y1,x2,y2] of strokes) v.push(x1*sz,y1*sz,0,x2*sz,y2*sz,0);
    const l=new THREE.LineSegments(geometry(new THREE.BufferGeometry()),LINE);
    l.geometry.setAttribute('position',new THREE.Float32BufferAttribute(v,3));
    l.position.set(x,y,z);l.rotation.z=flip;p.add(l);lowHidden.push(l);return l;
  }
  // Thicker bevelled core silhouette, visible even with low-quality details hidden.
  const pelvis = new THREE.Group(); pelvis.name='pelvis'; root.add(pelvis); pelvis.position.y=4.8;
  box(pelvis,0,0,0, 2.65,1.35,1.5,STONE_DARK);
  box(pelvis,0,-.18,-.63, 2.35,.71,.19,EDGE_DARK);
  panel(pelvis,[[-1.4,.4],[-1.1,-.57],[0,-.88],[1.1,-.57],[1.4,.4]],0,-.03,-.76,.16,STONE);
  ico(pelvis,.38,0,-.19,-.99,ENERGY,0);

  const torso=new THREE.Group(); torso.name='torso'; pelvis.add(torso);torso.position.y=.64;
  box(torso,0,1.15,0, 3.15,3.0,1.8,STONE_DARK);
  box(torso,0,1.15,-.91, 2.65,2.28,.24,EDGE_DARK);
  panel(torso,[[-1.68,2.53],[-1.97,1.52],[-1.29,.1],[-.4,-.32],[.4,-.32],[1.29,.1],[1.97,1.52],[1.68,2.53]],0,0,-.99,.18,STONE);
  panel(torso,[[-1.4,1.83],[-1.56,1.14],[-.74,.66],[-.52,1.42]],-.01,.02,-1.23,.09,STONE_LIGHT);
  panel(torso,[[.52,1.42],[.74,.66],[1.56,1.14],[1.4,1.83]],0,.02,-1.24,.09,STONE_LIGHT);
  panel(torso,[[-1.03,-.13],[0,-.46],[1.03,-.13],[.64,.4],[-.64,.4]],0,0,-1.22,.14,STONE_DARK);
  box(torso,0,2.59,-.18, 3.35,.38,1.67,EDGE_DARK);
  // Warm pulse across armor makes being hit visible at medium camera distance.
  panel(torso,[[-1.5,2.34],[-1.8,1.52],[-1.16,.17],[0,-.26],[1.16,.17],[1.8,1.52],[1.5,2.34]],0,.06,-1.44,.045,DAMAGE,false);
  // Raised spinal vanes for a readable silhouette from all camera angles.
  const back=new THREE.Group();back.name='arcaneSpine';torso.add(back);
  for(const side of [-1,1]) {
    const f=ico(back,.86,side*1.28,2.25,1.0,STONE,0);f.scale.set(.7,1.5,.5);
    const b=ico(back,.75,side*1.53,1.27,1.2,EDGE_DARK,0);b.scale.set(.55,1.1,.45);
    rod(back,[side*.85,.4,.91],[side*1.3,2.74,1.03],.10,EDGE);
    const jet=ico(back,.28,side*1.25,-.06,1.18,ENERGY,1);jet.scale.y=2.25;
  }
  for(let i=0;i<3;i++)box(back,0,.25+i*.52,1.06+i*.13,.55,.22,.34,EDGE);

  // Six-seal heart: three nested rings, crystalline floating capacitor and animated petals.
  const core=new THREE.Group();core.name='hexSealCore';torso.add(core);core.position.set(0,1.10,-1.51);
  const coreGuard=torus(core,.72,.16,0,0,.16,IRON,Math.PI*2,8,48);
  const coreRing1=torus(core,.62,.067,0,0,-.02,ENERGY,Math.PI*2,6,48);
  const coreRing2=torus(core,.46,.033,0,0,-.09,EDGE,Math.PI*2,5,36);
  const coreGem=ico(core,.40,0,0,-.12,ENERGY_INNER,1);coreGem.scale.z=.53;
  for(let i=0;i<6;i++) {
    const a=i*Math.PI/3;
    const q=box(core,Math.sin(a)*.83,Math.cos(a)*.83,.075,.19,.35,.19,EDGE);
    q.rotation.z=-a;
    const x=Math.sin(a)*1.05, y=Math.cos(a)*1.05;
    rod(torso,[x*1.05,1.1+y*.85,-1.12],[x*.75,1.1+y*.65,-1.42],.06,ENERGY,5);
  }

  // Head with an offset jaw, a three-slit visor and paired crown horns.
  const neck=new THREE.Group();neck.name='neck';torso.add(neck);neck.position.set(0,2.66,-.06);
  cyl(neck,.61,.7,.62,0,.22,0,IRON,10);
  torus(neck,.49,.07,0,.40,-.25,EDGE,Math.PI*2,7,32);
  const head=new THREE.Group();head.name='head';neck.add(head);head.position.y=.73;
  const face=ico(head,.9,0,0,-.18,STONE_DARK,0);face.scale.set(1.1,1.05,.83);
  panel(head,[[-.91,.51],[-.76,-.3],[-.33,-.7],[.33,-.7],[.76,-.3],[.91,.51],[.44,.75],[-.44,.75]],0,.05,-.77,.15,STONE);
  box(head,0,-.42,-.95,1.11,.19,.18,IRON);
  for(let i=-1;i<=1;i++) {
    const eye=box(head,i*.34,.17,-1.02,.25,.095,.06,ENERGY_INNER);
    eye.rotation.z=-i*.22;
  }
  const brow=box(head,0,.44,-.88,1.62,.19,.23,EDGE_DARK);
  for(const side of [-1,1]) {
    const horn=ico(head,.49,side*.77,.67,-.08,STONE_LIGHT,0);
    horn.scale.set(.55,1.33,.65);horn.rotation.z=-side*.23;
    const e=ico(head,.23,side*.9,.88,-.27,ENERGY,0);e.scale.y=1.25;
  }
  rune(head,.55,0,-.16,-1.1);
  panel(head,[[-.82,.44],[-.61,-.32],[0,-.57],[.61,-.32],[.82,.44]],0,0,-1.16,.04,DAMAGE,false);

  // Split halo communicates magical technology and offers a distinct boss silhouette.
  const halo=new THREE.Group();halo.name='floatingHalo';torso.add(halo);halo.position.set(0,3.21,.96);
  for(let j=0;j<3;j++) {
    const seg=torus(halo,2.13,.13,0,0,0,j===1?EDGE:STONE_LIGHT,1.72,7,30);
    seg.rotation.z=j*2.094+.19;
    const trim=torus(halo,1.93,.035,0,0,-.07,ENERGY,j===1?1.55:1.65,5,28);
    trim.rotation.z=j*2.094+.25;
  }
  const haloCenter=torus(halo,1.39,.055,0,0,-.1,EDGE_DARK,Math.PI*2,5,46);
  for(let j=0;j<6;j++) {
    const a=j*Math.PI/3;
    const n=ico(halo,.20,Math.sin(a)*2.17,Math.cos(a)*2.17,-.09,ENERGY,0);
    n.scale.set(.8,1.55,.6);n.rotation.z=-a;
  }

  // Hip-knee-ankle hierarchy. The leg pivots are exposed for animation without bone skinning.
  const legs=[];
  for(const side of [-1,1]) {
    const hip=new THREE.Group();hip.name=side<0?'leg_L':'leg_R';hip.position.set(side*1.08,4.39,0);root.add(hip);
    ico(hip,.66,0,.18,0,IRON,1);
    cyl(hip,.68,.68,.5,0,.12,0,EDGE_DARK,12).rotation.z=Math.PI/2;
    const thigh=box(hip,0,-1.02,0, 1.27,1.84,1.14,STONE);
    thigh.rotation.z=-side*.04;
    panel(hip,[[-.64,.02],[-.82,-.44],[-.57,-1.81],[.55,-1.81],[.74,-.48],[.61,.05]],0,-.09,-.67,.13,STONE_LIGHT);
    box(hip,side*.64,-.83,-.01,.22,1.12,.7,EDGE_DARK);
    rod(hip,[side*.47,-.46,-.34],[side*.51,-1.65,-.35],.07,EDGE);
    const knee=new THREE.Group();knee.name='knee';hip.add(knee);knee.position.y=-2.03;
    cyl(knee,.63,.63,.77,0,0,0,IRON,10).rotation.z=Math.PI/2;
    ico(knee,.60,0,0,-.46,EDGE_DARK,0);
    ico(knee,.28,0,-.02,-.93,ENERGY,0);
    const shin=box(knee,0,-.99,.16, 1.15,1.79,1.1,STONE_DARK);
    panel(knee,[[-.54,-.17],[-.72,-.57],[-.46,-1.94],[.49,-1.94],[.67,-.57],[.54,-.17]],0,-.02,-.51,.19,STONE);
    box(knee,side*.5,-1.05,.14,.20,1.40,.81,EDGE_DARK);
    rod(knee,[side*.31,-.36,.78],[side*.36,-1.74,.7],.10,IRON);
    const ankle=new THREE.Group();ankle.name='ankle';knee.add(ankle);ankle.position.y=-2.03;
    ico(ankle,.45,0,.28,0,IRON,1);
    box(ankle,0,-.07,-.4, 1.42,.60,1.88,STONE_DARK);
    box(ankle,0,.18,-.63,1.27,.27,1.57,STONE_LIGHT);
    for(let j=0;j<3;j++) {
      const px=(j-1)*.43;
      const toe=box(ankle,px,-.16,-1.29,.39,.34,.72,STONE);
      toe.rotation.x=-.08;
      box(ankle,px,-.01,-1.66,.3,.06,.12,EDGE);
    }
    box(ankle,0,-.35,-.52,1.56,.14,2.11,IRON);
    legs.push({hip,knee,ankle,side});
  }

  // Shoulder / elbow / wrist, asymmetric heavy impact arm + warding arm.
  const arms=[];
  for(const side of [-1,1]) {
    const shoulder=new THREE.Group(); shoulder.name=side<0?'shoulder_L':'shoulder_R';
    torso.add(shoulder);shoulder.position.set(side*1.90,2.13,0);
    ico(shoulder,.77,0,0,0,IRON,1);
    const armor=ico(shoulder,1.04,side*.23,.20,-.16,STONE,0);
    armor.scale.set(1.23,.93,1.0);
    box(shoulder,side*.12,.40,-.7,1.8,.57,.32,EDGE_DARK);
    panel(shoulder,[[-.91,.73],[-1.0,.08],[-.74,-.72],[.73,-.72],[1.04,.06],[.81,.73]],0,.09,-.86,.13,STONE_LIGHT);
    const runeBadge=ico(shoulder,.27,.03,.1,-1.14,ENERGY,0);runeBadge.scale.z=.48;
    const upper=box(shoulder,0,-1.08,-.02,1.11,1.95,1.07,STONE_DARK);
    box(shoulder,0,-1.12,-.64,1.20,1.40,.18,EDGE_DARK);
    rod(shoulder,[side*.39,-.62,.35],[side*.31,-1.76,.35],.10,EDGE);
    const elbow=new THREE.Group();elbow.name='elbow';shoulder.add(elbow);elbow.position.y=-2.02;
    cyl(elbow,.56,.56,.9,0,0,0,IRON,12).rotation.z=Math.PI/2;
    torus(elbow,.48,.07,0,0,-.56,ENERGY,Math.PI*2,5,28);
    const forearm=box(elbow,0,-1.0,-.04,side>0?1.56:1.25,1.82,1.24,STONE_DARK);
    forearm.rotation.z=-side*.025;
    panel(elbow,[[-.66,-.10],[-.82,-.72],[-.67,-1.94],[.67,-1.94],[.82,-.72],[.66,-.10]],0,-.12,-.76,.18,STONE);
    const fist=new THREE.Group();fist.name='fist';elbow.add(fist);fist.position.y=-2.08;
    if(side>0) {
      // Impact fist: wide, flattened hammer-shaped basalt knuckles.
      box(fist,0,-.11,-.26,1.75,1.09,1.55,STONE_DARK);
      panel(fist,[[-.96,.4],[-1.06,-.24],[-.68,-.77],[.7,-.77],[1.06,-.24],[.96,.4]],0,0,-1.12,.19,STONE_LIGHT);
      for(let i=0;i<4;i++)box(fist,-.64+i*.43,-.64,-.80,.30,.29,.52,EDGE_DARK);
      box(fist,0,-.24,-1.33,1.52,.18,.12,EDGE);
      rune(fist,.68,0,.08,-1.36);
    } else {
      // Guard arm: six-sided floating shield around a compact stone hand.
      box(fist,0,-.13,-.22,1.12,.92,1.02,STONE);
      const shield=panel(fist,[[-.87,.74],[-1.26,-.06],[-.68,-1.13],[0,-1.41],[.68,-1.13],[1.26,-.06],[.87,.74]],0,-.32,-.94,.23,EDGE_DARK);
      const crest=ico(fist,.48,0,-.52,-1.23,ENERGY,0);crest.scale.z=.36;
      rune(fist,.72,0,-.49,-1.57);
      box(fist,0,-.31,-.67,1.25,.18,.72,EDGE);
    }
    arms.push({shoulder,elbow,fist,side});
  }

  // Only decorative micro-detail is hidden in 'low'. All essential forms remain.
  const floatingBits=[];
  for(let side of [-1,1]) {
    for(let i=0;i<5;i++) {
      const x=side*(1.06+(i%3)*.36),y=.25+i*.39,z=-1.30;
      const v=ico(highDetail,.11,x,y+5.0,z,ENERGY,0);
      v.scale.set(.6,1.35,.55);floatingBits.push(v);
    }
  }
  for(let side of [-1,1])for(let i=0;i<4;i++) {
    const c=ico(highDetail,.20,side*(2.68+i*.13),6.9+i*.34,.32,STONE_LIGHT,0);
    c.scale.set(.6,1.2,.5);floatingBits.push(c);
  }
  for(let i=0;i<8;i++) {
    const a=i*Math.PI/4;
    const e=ico(highDetail,.09,Math.sin(a)*1.7,6.9+Math.cos(a)*1.7,1.23,ENERGY,0);
    floatingBits.push(e);
  }

  // VFX are module-owned and keep local-space attachment to world placement.
  function floorRing(r0,r1,color,op) {
    const m=material(new THREE.MeshBasicMaterial({color,transparent:true,opacity:op,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));
    const obj=mesh(root,geometry(new THREE.RingGeometry(r0,r1,64)),m);
    obj.rotation.x=-Math.PI/2;obj.castShadow=false;obj.receiveShadow=false;
    return obj;
  }
  const slamZone = new THREE.Group();slamZone.name='slamWarning';root.add(slamZone);slamZone.position.set(0,.068,-3.45);
  const warmMat=material(new THREE.MeshBasicMaterial({color:0xffa543,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
  const warmLine=material(new THREE.MeshBasicMaterial({color:0xff5a31,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));
  const disc=mesh(slamZone,geometry(new THREE.CircleGeometry(3.25,64)),warmMat); disc.rotation.x=-Math.PI/2;disc.castShadow=false;
  const warningRing=mesh(slamZone,geometry(new THREE.RingGeometry(3.02,3.19,64)),warmLine);warningRing.rotation.x=-Math.PI/2;warningRing.position.y=.012;warningRing.castShadow=false;
  const innerRing=mesh(slamZone,geometry(new THREE.RingGeometry(2.25,2.31,64)),warmLine);innerRing.rotation.x=-Math.PI/2;innerRing.position.y=.018;innerRing.castShadow=false;
  const ticks=new THREE.Group();slamZone.add(ticks);
  for(let i=0;i<12;i++) {
    const a=i*Math.PI/6;
    const bar=mesh(ticks,boxGeo(.13,.025,.51),warmLine,Math.sin(a)*2.60,.026,Math.cos(a)*2.60);
    bar.rotation.y=a; bar.castShadow=false;
  }
  const pulseRing=mesh(root,geometry(new THREE.RingGeometry(4.20,5.50,64)),warmMat);
  pulseRing.rotation.x=-Math.PI/2;pulseRing.position.y=.065;pulseRing.castShadow=false;
  const pulseInner=mesh(root,geometry(new THREE.RingGeometry(4.45,4.56,64)),warmLine);
  pulseInner.rotation.x=-Math.PI/2;pulseInner.position.y=.085;pulseInner.castShadow=false;
  const impactRing=floorRing(.86,1,0x80ffe2,0);
  impactRing.name='shockwave';impactRing.position.y=.10;
  const impactCore=floorRing(.04,.75,0xffffff,0);
  impactCore.position.y=.108;
  const sparkGroup=new THREE.Group();root.add(sparkGroup);
  for(let i=0;i<13;i++) {
    const o=ico(sparkGroup,.065,0,0,0,i%3===0?ENERGY_INNER:ENERGY,0);
    o.visible=false;o.castShadow=false;o.userData.sparkIndex=i;
  }

  let quality='high';
  let motion='idle';
  let elapsed=0, gaitTime=0, attack=null, hit=null, impact=null, frame=0;
  let attackSerial=0;
  let disposed=false;
  const noop=()=>{};
  const onEvent=typeof options.onEvent==='function'?options.onEvent:noop;
  const attackSpecs={
    slam:{kind:'slam', shape:'circle', center:{x:0,y:0,z:-3.45},radius:3.25,telegraphSeconds:1.43,impactSeconds:1.44,durationSeconds:2.62},
    pulse:{kind:'pulse',shape:'annulus',center:{x:0,y:0,z:0},innerRadius:4.2,outerRadius:5.5,telegraphSeconds:1.57,impactSeconds:1.59,durationSeconds:2.83}
  };
  const smooth=(a,b,t)=>{const p=Math.max(0,Math.min(1,(t-a)/(b-a)));return p*p*(3-2*p);};
  const lerp=(a,b,t)=>a+(b-a)*t;
  const emit=(type,extra={})=>onEvent({moduleId:'AF-NO14',type,worldPosition:{x:root.position.x,y:root.position.y,z:root.position.z},...extra});
  function setMotion(name) {
    if(name!=='idle' && name!=='walk') return false;
    motion=name;return true;
  }
  function startAttack(kind='slam') {
    if(disposed || attack || hit || !attackSpecs[kind])return false;
    attack={kind,t:0,impacted:false,id:++attackSerial};
    emit('telegraphStart',{attack:kind,attackId:attack.id,zone:getAttackSpec(kind)});
    return true;
  }
  function receiveHit(input={}) {
    if(disposed)return false;
    const strength=typeof input==='number'?input:(Number(input.strength)||1);
    const interrupted=!!attack;
    if(attack) {emit('attackInterrupted',{attack:attack.kind,attackId:attack.id});attack=null;}
    hit={t:0,strength:Math.max(.2,Math.min(2.2,strength))};
    emit('hitReact',{strength:hit.strength,interrupted});
    return true;
  }
  function getAttackSpec(kind='slam') {
    const s=attackSpecs[kind];return s?JSON.parse(JSON.stringify(s)):null;
  }
  function setQuality(mode) {
    quality=mode==='low'?'low':'high';
    highDetail.visible=quality==='high';
    for(const item of lowHidden)item.visible=quality==='high';
    halo.children.forEach((o,i)=>{if(o.material===ENERGY) o.visible=quality==='high' || i<4;});
    GLOW.opacity=quality==='high'?.27:.14;
    return quality;
  }
  function getStatus(){return {motion,action:hit?'hit':attack?attack.kind:'none',actionTime:hit?.t??attack?.t??0,quality,disposed};}
  function update(dt, context={}) {
    if(disposed)return;
    dt=Math.max(0,Math.min(Number(dt)||0,.05));
    if(typeof context.motion==='string')setMotion(context.motion);
    if(typeof context.quality==='string' && context.quality!==quality)setQuality(context.quality);
    elapsed+=dt;frame++;
    if(motion==='walk' && !attack && !hit)gaitTime+=dt*Math.max(.35,Math.min(2.1,(Number(context.walkSpeed)||1)))*3.05;
    if(attack)attack.t+=dt;
    if(hit)hit.t+=dt;
    if(impact)impact.t+=dt;

    const walking=(motion==='walk' && !attack && !hit)?1:0;
    const stride=Math.sin(gaitTime), opposite=Math.sin(gaitTime+Math.PI);
    const breath=Math.sin(elapsed*1.35);
    const hitAlpha=hit?Math.sin(Math.PI*Math.min(hit.t/.67,1))*hit.strength:0;
    let slamLift=0,slamDown=0,slamFwd=0, pulseCharge=0,pulseDrop=0;
    warmMat.opacity=0;warmLine.opacity=0;disc.visible=false;warningRing.visible=false;innerRing.visible=false;ticks.visible=false;
    pulseRing.visible=false;pulseInner.visible=false;
    if(attack) {
      const t=attack.t;
      if(attack.kind==='slam') {
        slamLift=smooth(.10,.89,t)*(1-smooth(1.19,1.46,t));
        slamDown=smooth(1.20,1.47,t)*(1-smooth(1.77,2.56,t));
        slamFwd=smooth(1.20,1.52,t)*(1-smooth(1.82,2.56,t));
        const warn=smooth(.07,.27,t)*(1-smooth(1.42,1.55,t));
        warmMat.opacity=.10*warn; warmLine.opacity=(.3+.38*Math.sin(elapsed*17)**2)*warn;
        disc.visible=warningRing.visible=innerRing.visible=ticks.visible=warn>.001;
        slamZone.scale.setScalar(lerp(.78,1,smooth(.2,1.3,t)));
        ticks.rotation.y=elapsed*.53;
        if(!attack.impacted && t>=attackSpecs.slam.impactSeconds) {
          attack.impacted=true;impact={t:0,kind:'slam'};
          emit('impact',{attack:'slam',attackId:attack.id,zone:getAttackSpec('slam')});
        }
      } else {
        pulseCharge=smooth(.05,1.15,t)*(1-smooth(1.63,2.55,t));
        pulseDrop=smooth(1.54,1.73,t)*(1-smooth(2.00,2.72,t));
        const warn=smooth(.12,.32,t)*(1-smooth(1.55,1.73,t));
        warmMat.opacity=(.08+.035*Math.sin(elapsed*14)**2)*warn;
        warmLine.opacity=(.22+.35*Math.sin(elapsed*19)**2)*warn;
        pulseRing.visible=pulseInner.visible=warn>.001;
        pulseRing.rotation.z=elapsed*.22; pulseInner.rotation.z=-elapsed*.3;
        if(!attack.impacted && t>=attackSpecs.pulse.impactSeconds) {
          attack.impacted=true;impact={t:0,kind:'pulse'};
          emit('impact',{attack:'pulse',attackId:attack.id,zone:getAttackSpec('pulse')});
        }
      }
      if(t>=attackSpecs[attack.kind].durationSeconds) {
        const a=attack;attack=null;emit('attackEnd',{attack:a.kind,attackId:a.id});
      }
    }
    if(hit && hit.t>=.67)hit=null;

    const bob=walking*(.10*Math.abs(stride)+.055*Math.sin(2*gaitTime));
    pelvis.position.y=4.8+bob-.40*pulseDrop-.12*slamDown-.30*hitAlpha;
    pelvis.rotation.x=.012*breath-.16*slamLift+.26*slamDown-.22*hitAlpha-.11*pulseCharge;
    pelvis.rotation.z=.018*Math.sin(elapsed*.7)+.04*walking*stride+.11*hitAlpha;
    torso.rotation.x=.023*breath-.10*slamLift+.21*slamFwd+.22*hitAlpha;
    torso.rotation.z=.023*Math.sin(elapsed*.85)+.055*walking*stride-.15*hitAlpha;
    head.rotation.x=-.025*breath+.08*slamLift-.13*slamDown+.15*hitAlpha-.08*pulseCharge;
    head.rotation.y=.07*Math.sin(elapsed*.52);
    neck.rotation.z=.05*hitAlpha;

    for(let i=0;i<legs.length;i++) {
      const {hip,knee,ankle,side}=legs[i];const wave=side<0?stride:opposite;
      hip.rotation.x=.33*wave*walking-.22*pulseCharge+.16*slamDown+(side>0?.10:-.12)*hitAlpha;
      hip.rotation.z=.03*side+.045*wave*walking+.08*side*pulseCharge;
      knee.rotation.x=(.08+Math.max(0,-wave)*.53)*walking+.40*pulseCharge+.14*slamDown;
      ankle.rotation.x=-hip.rotation.x*.39-knee.rotation.x*.23;
    }
    for(const {shoulder,elbow,side} of arms) {
      const right=side>0;
      shoulder.rotation.x=.05*breath+.11*walking*(right?stride:opposite)+(right?(2.52*slamLift+.89*slamDown):(.18*slamLift-.15*slamDown))+.36*pulseCharge+.25*hitAlpha;
      shoulder.rotation.z=side*(.11+.77*pulseCharge)+(right?.12*slamLift:.08*slamLift)+side*.06*hitAlpha;
      elbow.rotation.x=-.13+(right?-.64*slamLift+.61*slamDown:-.20*slamLift)+.30*pulseCharge;
      elbow.rotation.z=side*(.05+.10*pulseCharge);
    }
    // Animated ring rate doubles during charging, but rest remains slow and heavy.
    halo.rotation.z=elapsed*(attack?.kind==='pulse'?.27:.08)+Math.sin(elapsed*.33)*.035;
    halo.rotation.y=Math.sin(elapsed*.42)*.06;
    coreRing1.rotation.z=elapsed*(pulseCharge>0?.75:.20);
    coreRing2.rotation.z=-elapsed*.27;
    coreGem.rotation.y=elapsed*.47;
    coreGem.rotation.z=.15*Math.sin(elapsed*1.2);
    ENERGY.emissiveIntensity=1.40+.27*Math.sin(elapsed*2.1)+pulseCharge*.85;
    ENERGY_INNER.emissiveIntensity=1.6+.30*Math.sin(elapsed*2.6)+pulseCharge*1.7;
    RED.color.setHex(attack?0xff9b4e:0xff6b3b);
    DAMAGE.opacity=hitAlpha*.25;
    for(let i=0;i<floatingBits.length;i++)floatingBits[i].position.y+=dt*Math.sin(elapsed*1.1+i)*.022;

    if(impact) {
      const p=impact.t,phase=Math.min(1,p/.74);
      const spec=attackSpecs[impact.kind];
      const shockPos=impact.kind==='slam'?spec.center:{x:0,y:0,z:0};
      impactRing.position.x=shockPos.x;impactRing.position.z=shockPos.z;
      impactCore.position.x=shockPos.x;impactCore.position.z=shockPos.z;
      impactRing.scale.setScalar(lerp(.5,impact.kind==='slam'?3.9:6.15,smooth(0,1,phase)));
      impactCore.scale.setScalar(lerp(.3,impact.kind==='slam'?2.4:4.0,smooth(0,1,phase)));
      impactRing.material.opacity=.75*(1-phase)**1.1;
      impactCore.material.opacity=.28*(1-phase)**1.5;
      for(let i=0;i<sparkGroup.children.length;i++){
        const s=sparkGroup.children[i],a=i*Math.PI*2/sparkGroup.children.length;
        s.visible=quality==='high'&&p<.65;
        s.position.set(shockPos.x+Math.sin(a)*p*7.4,.18+Math.sin(phase*Math.PI)*(1+(i%4)*.35),shockPos.z+Math.cos(a)*p*7.4);
        s.scale.setScalar(Math.max(.01,(1-phase))*(i%3===0?1.4:.85));
      }
      if(p>.76) {
        impact=null;impactRing.material.opacity=impactCore.material.opacity=0;
        sparkGroup.children.forEach(s=>s.visible=false);
      }
    }
  }
  function dispose() {
    if(disposed)return;
    disposed=true;root.removeFromParent();
    for(const geo of allGeo)geo.dispose();
    for(const mat of allMat)mat.dispose();
    allGeo.clear();allMat.clear();
    root.clear();
  }
  setQuality(options.quality||'high');
  return {root,update,setQuality,dispose,setMotion,startAttack,receiveHit,getStatus,getAttackSpec};
}
