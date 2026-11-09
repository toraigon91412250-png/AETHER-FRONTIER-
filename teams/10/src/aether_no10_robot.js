/**
 * AETHER FRONTIER / NO.10
 * ARCHAION-10 "SKYWAKER" | mechanical transformable guardian
 * Three.js r160.0 | +Y up, -Z forward | 1 unit ~ 1 meter
 * Public API: createAetherModule(THREE, options)
 * No scene / renderer / camera / DOM ownership.
 */
export function createAetherModule(THREE, options = {}) {
  const root = new THREE.Group();
  root.name = 'AF_No10_Archaion_Root';
  root.userData.moduleId = 'AF-No10';
  root.userData.forward = '-Z';
  root.userData.nominalHeightMeters = 7.0;
  root.userData.forms = ['robot', 'flight'];

  const geos = new Set();
  const mats = new Set();
  const cache = new Map();
  const highDetails = [];
  let disposed = false;

  const M = {};
  function material(name, color, metalness = .6, roughness = .35, emissive = 0, intensity = 0) {
    const m = new THREE.MeshStandardMaterial({ color, metalness, roughness, emissive, emissiveIntensity: intensity });
    m.name = name; mats.add(m); return m;
  }
  M.shell = material('Obsidian ceramic shell', 0x1c2b40, .8, .26);
  M.shellDark = material('Black seam armor', 0x0a1424, .72, .42);
  M.armor = material('Titanium-blue armor', 0x365773, .78, .3);
  M.edge = material('Champagne gold edges', 0xc19b61, .81, .29);
  M.edgeDark = material('Deep brass joints', 0x6b5d4b, .84, .36);
  M.mechanics = material('Graphite machinery', 0x3a4554, .95, .34);
  M.hydraulic = material('Polished pistons', 0xadb9c0, .92, .24);
  M.white = material('Porcelain silver enamel', 0x93acb7, .59, .34);
  M.glow = material('Azure arc energy', 0x18dffc, .26, .22, 0x06c9f9, 2.35);
  M.glowSoft = material('Cyan inlays', 0x236f8a, .35, .3, 0x12bfe7, 1.15);
  M.glowGold = material('Amber runic energy', 0xecb864, .22, .22, 0xe6a44b, 1.4);
  M.darkGlass = material('Deep sapphire optics', 0x07334b, .22, .12, 0x0379ae, .75);

  const shared = (key, fn) => {
    if (!cache.has(key)) { const g = fn(); cache.set(key, g); geos.add(g); }
    return cache.get(key);
  };
  function roundedBox(w, h, d, radius=.07) {
    const key=`rb:${w}:${h}:${d}:${radius}`;
    return shared(key, () => {
      const r=Math.min(radius,w*.24,h*.24);
      const s=new THREE.Shape();
      s.moveTo(-w/2+r,-h/2);
      s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);
      s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);
      s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);
      s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
      const b=Math.min(.038,r*.5,d*.18);
      const g=new THREE.ExtrudeGeometry(s,{depth:d-2*b,steps:1,bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:1,curveSegments:3});
      g.translate(0,0,-d/2+b);g.computeVertexNormals();return g;
    });
  }
  function polyShape(vertices,depth=.1) {
    const key='p:'+JSON.stringify(vertices)+':'+depth;
    return shared(key,()=>{
      const s = new THREE.Shape();s.moveTo(vertices[0][0],vertices[0][1]);
      for(let i=1;i<vertices.length;i++)s.lineTo(vertices[i][0],vertices[i][1]);
      s.closePath(); const g = new THREE.ExtrudeGeometry(s,{depth,steps:1,bevelEnabled:true,bevelThickness:.018,bevelSize:.025,bevelSegments:1,curveSegments:1});
      g.translate(0,0,-depth/2);g.computeVertexNormals();return g;
    });
  }
  const cyl=(r1,r2,h,n=12) => shared(`cy:${r1}:${r2}:${h}:${n}`,()=>new THREE.CylinderGeometry(r1,r2,h,n,1));
  const sphere=(r, w=12, h=8) => shared(`sp:${r}:${w}:${h}`,()=>new THREE.SphereGeometry(r,w,h));
  const torus=(r,t=.025,n=40) => shared(`to:${r}:${t}:${n}`,()=>new THREE.TorusGeometry(r,t,5,n));
  const box=(w,h,d) => shared(`bx:${w}:${h}:${d}`,()=>new THREE.BoxGeometry(w,h,d));
  const cone=(r,h,n=5) => shared(`co:${r}:${h}:${n}`,()=>new THREE.ConeGeometry(r,h,n));
  const create=(parent,geometry,mat,name='',pos=null,rot=null,high=false) => {
    const mesh=new THREE.Mesh(geometry,mat);mesh.name=name;
    if(pos) mesh.position.set(...pos);if(rot)mesh.rotation.set(...rot);
    parent.add(mesh);if(high)highDetails.push(mesh);return mesh;
  };
  const group=(parent,name,pos) => {
    const g=new THREE.Group();g.name=name;if(pos)g.position.set(...pos);parent.add(g);return g;
  };
  const plate=(p,w,h,d,mat,pos,rot=null,high=false,name='Armor plate')=>
    create(p,roundedBox(w,h,d),mat,name,pos,rot,high);
  const polygon=(p,points,thick,mat,pos,rot=null,high=false,name='Polygon plate')=>
    create(p,polyShape(points,thick),mat,name,pos,rot,high);
  const orb=(p,r,mat,pos,high=false)=>create(p,sphere(r),mat,'Ball bearing',[...pos],null,high);
  const rod=(p,a,b,r,mat,high=false)=>{
    const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b);
    const diff=vb.clone().sub(va);const o=create(p,cyl(r,r,diff.length(),9),mat,'Mechanical strut',va.clone().add(vb).multiplyScalar(.5).toArray(),null,high);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),diff.normalize());return o;
  };
  const ring=(p,r,t,mat,pos,rotation=null,high=false)=>
    create(p,torus(r,t),mat,'Arcane ring',pos,rotation,high);
  const lightStrip=(p,w,h,pos,rot=null,high=false)=>plate(p,w,h,.025,M.glow,pos,rot,high,'Illuminated tracery');
  const rivet=(p,xyz,high=true)=>create(p,sphere(.045,7,5),M.edge,'Rivet',xyz,null,high);

  // Motion pivot: translating the main frame does not change the API's world anchor.
  const motionRoot=group(root,'Suspension/hover transform');
  const frame=group(motionRoot,'Central pelvis / pitch origin',[0,3.39,0]);

  // Pelvis: locking girdle, floating collar, segmented belly plate.
  create(frame,cyl(.48,.50,.40,10),M.mechanics,'Waist gyro',[0,.13,0]);
  plate(frame,1.74,.55,.82,M.shell,[0,-.10,0],null,false,'Pelvic undercarriage');
  polygon(frame,[[-.88,.11],[-.37,.29],[.37,.29],[.88,.11],[.68,-.34],[0,-.45],[-.68,-.34]],.20,M.armor,[0,-.10,-.38]);
  plate(frame,.50,.36,.09,M.edge,[0,-.16,-.50]);
  lightStrip(frame,.35,.08,[0,-.15,-.57]);
  for(const s of [-1,1]){
    create(frame,cyl(.44,.44,.23,14),M.edgeDark,'Hip rotor',[s*.66,-.2,0], [0,0,Math.PI/2]);
    create(frame,cyl(.30,.30,.25,14),M.mechanics,'Hip bearing',[s*.66,-.2,0],[0,0,Math.PI/2]);
    polygon(frame,[[s*.55,.21],[s*.95,.08],[s*.92,-.41],[s*.43,-.40]],.16,M.shell,[0,-.14,-.33]);
    plate(frame,.15,.23,.06,M.glowSoft,[s*.75,-.24,-.44],null,true);
  }

  // Torso is the transform chassis: the entire central mass pitches toward -Z.
  const chassis=group(frame,'TRANSFORM / main chassis');
  create(chassis,cyl(.48,.54,.43,10),M.edgeDark,'Abdomen bearing',[0,.38,0]);
  plate(chassis,.98,.62,.64,M.shell,[0,.53,-.01]);
  for(const s of [-1,1]) {
    plate(chassis,.26,.44,.08,M.edge,[s*.42,.56,-.37], [0,0,-s*.09]);
    lightStrip(chassis,.09,.34,[s*.46,.56,-.44],null,true);
  }
  plate(chassis,2.42,1.72,.97,M.shell,[0,1.41,.03],null,false,'Thoracic core / main hull');
  // Offset shoulder shields and faceted chest breastplate.
  polygon(chassis,[[-1.17,1.83],[-.58,2.14],[0,1.87],[.58,2.14],[1.17,1.83],[.96,.70],[.54,.45],[0,.64],[-.54,.45],[-.96,.70]],.13,M.armor,[0,0,-.54]);
  polygon(chassis,[[-1.11,1.94],[-.72,2.17],[-.37,1.98],[-.77,1.54],[-1.17,1.49]],.09,M.white,[0,0,-.64]);
  polygon(chassis,[[1.11,1.94],[.72,2.17],[.37,1.98],[.77,1.54],[1.17,1.49]],.09,M.white,[0,0,-.64]);
  for(const s of [-1,1]){
    plate(chassis,.23,.80,.10,M.edge,[s*.95,1.03,-.62],[0,0,-s*.20]);
    lightStrip(chassis,.10,.56,[s*.99,1.08,-.705],[0,0,-s*.20]);
    polygon(chassis,[[s*.2,1.92],[s*.56,2.11],[s*.65,1.95],[s*.33,1.71]],.09,M.shell,[0,0,-.68]);
  }
  // Arc reactor: concentric independently animated ring cage.
  const reactor=group(chassis,'ARC CORE: counterrotating stellar ring',[0,1.34,-.67]);
  create(reactor,cyl(.52,.52,.11,32),M.shellDark,'Reactor cavity',[0,0,.025],[Math.PI/2,0,0]);
  ring(reactor,.49,.039,M.edge,[0,0,-.09]);
  ring(reactor,.39,.019,M.glowSoft,[0,0,-.12]);
  const reactorOuter=group(reactor,'Outer ring motion',[0,0,-.14]);
  ring(reactorOuter,.44,.019,M.glowGold,[0,0,0]);
  for(let j=0;j<12;j++){
    const a=j*Math.PI/6;
    const chip=plate(reactorOuter,.18,.055,.06,j%3===0?M.glowGold:M.edge,[Math.cos(a)*.45,Math.sin(a)*.45,0],[0,0,a+Math.PI/2]);
    chip.name='Rotating sector '+j;
  }
  const reactorInner=group(reactor,'Inner glyph orbit',[0,0,-.20]);
  ring(reactorInner,.28,.024,M.glow,[0,0,0]);
  for(let j=0;j<8;j++){
    const a=Math.PI*2*j/8;
    plate(reactorInner,.12,.045,.05,M.glow,[Math.cos(a)*.30,Math.sin(a)*.30,0],[0,0,a+Math.PI/2]);
  }
  const crystal=create(reactor,shared('reactor-ico',()=>new THREE.IcosahedronGeometry(.205,1)),M.glow,'Captive arc crystal',[0,0,-.24]);
  // Back turbine spine, visible in either silhouette.
  plate(chassis,1.32,1.54,.45,M.mechanics,[0,1.28,.64]);
  plate(chassis,.48,1.40,.26,M.edgeDark,[0,1.20,.88]);
  lightStrip(chassis,.10,1.08,[0,1.22,1.05]);
  for(const s of [-1,1]) {
    plate(chassis,.33,1.04,.33,M.shell,[s*.76,1.20,.70]);
    create(chassis,cyl(.20,.20,.19,12),M.edgeDark,'Back impulse coil',[s*.75,1.72,.91],[Math.PI/2,0,0]);
    ring(chassis,.16,.033,M.glow,[s*.75,1.72,1.025]);
    for(let k=0;k<4;k++){
      plate(chassis,.08,.10,.05,M.edge,[s*(.7+.1*(k%2)),.85+k*.22,1.00],null,true);
    }
  }
  // Open collar and retracting crown.
  plate(chassis,1.33,.34,.79,M.edgeDark,[0,2.23,.04]);
  polygon(chassis,[[-.68,2.20],[-.37,2.43],[.37,2.43],[.68,2.20],[.26,2.02],[-.26,2.02]],.16,M.armor,[0,0,-.35]);
  const neck=group(chassis,'Head retraction rail',[0,2.34,-.03]);
  create(neck,cyl(.23,.25,.31,12),M.mechanics,'Neck gyroscope',[0,.08,0]);
  const head=group(neck,'Head / articulated scanning mask',[0,.20,-.06]);
  create(head,sphere(.48,16,11),M.shell,'Helmet skull',[0,.28,0]);
  polygon(head,[[-.38,.47],[0,.75],[.38,.47],[.43,.13],[.22,-.08],[-.22,-.08],[-.43,.13]],.42,M.white,[0,0,-.24]);
  plate(head,.83,.17,.09,M.darkGlass,[0,.28,-.50],null,false,'Optical visor');
  lightStrip(head,.62,.065,[0,.29,-.565]);
  polygon(head,[[-.14,.32],[.14,.32],[.22,-.10],[0,-.23],[-.22,-.10]],.09,M.armor,[0,0,-.51]);
  polygon(head,[[-.10,.65],[0,1.11],[.12,.65],[.06,.50],[-.06,.50]],.20,M.edge,[0,0,-.14],null,false,'Crown fin');
  for(const s of [-1,1]){
    polygon(head,[[s*.33,.49],[s*.59,.81],[s*.55,.26],[s*.35,.12]],.12,M.edgeDark,[0,0,-.16]);
    plate(head,.12,.19,.09,M.glowSoft,[s*.39,.27,-.48]);
    plate(head,.20,.43,.09,M.armor,[s*.46,.05,-.17],[0,0,-s*.23]);
  }
  // A symmetrical limb kit is retained during transformation (no swapped meshes).
  const arms=[], legs=[], wings=[], boosters=[];
  for (const s of [-1,1]) {
    // Shoulder: revolute hinge, upper arm, elbow, forearm, individual fingers.
    const shoulder=group(chassis,s===-1?'Left shoulder gimbal':'Right shoulder gimbal',[s*1.29,1.63,0]);
    create(shoulder,cyl(.39,.39,.36,15),M.edgeDark,'Shoulder axis',[0,0,0],[0,0,Math.PI/2]);
    create(shoulder,sphere(.36,12,9),M.mechanics,'Shoulder spherical bearing',[s*.07,-.08,0]);
    polygon(shoulder,[[s*(-.49),.15],[s*.25,.39],[s*.59,.16],[s*.47,-.39],[s*(-.28),-.26]],.43,M.armor,[0,0,-.12]);
    plate(shoulder,.49,.17,.10,M.white,[s*.12,.18,-.40],[0,0,-s*.13]);
    lightStrip(shoulder,.31,.065,[s*.19,.16,-.47]);
    const upper=group(shoulder,'Upper arm',[s*.14,-.32,0]);
    plate(upper,.55,.79,.55,M.mechanics,[0,-.40,0]);
    polygon(upper,[[-.32,.02],[.34,.02],[.34,-.74],[.13,-.96],[-.27,-.70]],.17,M.armor,[0,0,-.32]);
    lightStrip(upper,.11,.46,[0,-.43,-.44]);
    for(const sd of [-1,1]) rod(upper,[sd*.29,-.05,.12],[sd*.26,-.78,.12],.065,M.hydraulic,true);
    const elbow=group(upper,'Elbow flexion',[0,-.88,.02]);
    create(elbow,cyl(.25,.25,.54,12),M.edgeDark,'Elbow wheel',[0,0,0],[0,0,Math.PI/2]);
    create(elbow,cyl(.17,.17,.59,12),M.mechanics,'Elbow pivot',[0,0,0],[0,0,Math.PI/2]);
    const forearm=group(elbow,'Forearm / folded flight stabilizer',[0,-.24,0]);
    plate(forearm,.68,.95,.56,M.shell,[0,-.32,0]);
    polygon(forearm,[[-.43,.10],[.36,.10],[.46,-.60],[.14,-.95],[-.45,-.74]],.20,M.white,[0,-.1,-.32]);
    polygon(forearm,[[-.37,.05],[.32,.05],[.29,-.35],[-.35,-.42]],.08,M.armor,[0,-.1,-.47]);
    plate(forearm,.08,.60,.06,M.edge,[s*.23,-.39,-.50],[0,0,s*.08]);
    lightStrip(forearm,.08,.39,[-s*.23,-.38,-.50]);
    // Secondary folding fins will fan out as the arms become wing-root spars.
    const blade=group(forearm,'Forearm aerofoil hinge',[s*.26,-.37,.07]);
    polygon(blade,[[0,0],[s*.37,.43],[s*.72,-.14],[s*.40,-.72],[0,-.58]],.13,M.edgeDark,[0,0,.13]);
    polygon(blade,[[0,0],[s*.26,.30],[s*.58,-.13],[s*.26,-.57]],.055,M.armor,[0,0,.03]);
    const hand=group(forearm,'Retracting hand',[0,-.91,-.02]);
    plate(hand,.40,.31,.30,M.mechanics,[0,-.08,-.05]);
    for(let finger=-1;finger<=1;finger++){
      const dx=finger*.12;
      plate(hand,.085,.31,.15,M.edgeDark,[dx,-.35,-.04], [0,0,dx*.3],true);
      plate(hand,.09,.15,.18,M.white,[dx,-.49,-.04],null,true);
    }
    arms.push({s,shoulder,upper,elbow,blade,hand});

    // Hip/knee/ankle linkage; retains visible support pistons and jet heels.
    const hip=group(frame,s===-1?'Left articulated hip':'Right articulated hip',[s*.66,-.28,0]);
    create(hip,sphere(.34,13,9),M.mechanics,'Hip knuckle',[0,0,0]);
    plate(hip,.61,.36,.68,M.armor,[s*.07,-.08,-.04]);
    const thigh=group(hip,'Thigh transmission',[0,-.22,0]);
    plate(thigh,.66,1.21,.62,M.shell,[0,-.59,0]);
    polygon(thigh,[[-.37,.09],[.34,.09],[.40,-.95],[.15,-1.15],[-.37,-1.02]],.22,M.armor,[0,-.04,-.35]);
    plate(thigh,.20,.87,.08,M.white,[s*.22,-.56,-.51],[0,0,s*.10]);
    lightStrip(thigh,.07,.69,[-s*.10,-.55,-.50]);
    rod(thigh,[s*.39,-.07,.13],[s*.35,-1.14,.18],.075,M.hydraulic,true);
    const knee=group(thigh,'Knee compression joint',[0,-1.25,-.02]);
    create(knee,cyl(.28,.28,.69,14),M.edgeDark,'Knee ring',[0,0,0],[0,0,Math.PI/2]);
    create(knee,sphere(.22,11,8),M.mechanics,'Knee core',[0,0,0]);
    polygon(knee,[[-.34,.10],[.34,.10],[.28,-.28],[-.27,-.28]],.10,M.edge,[0,0,-.36]);
    const calf=group(knee,'Shin / flight drive assembly',[0,-.18,0]);
    plate(calf,.60,1.12,.64,M.mechanics,[0,-.51,0]);
    polygon(calf,[[-.27,.06],[.29,.06],[.43,-.75],[.14,-1.07],[-.28,-.91]],.20,M.white,[0,-.04,-.31]);
    polygon(calf,[[-.30,.01],[.30,.01],[.35,-.47],[0,-.64],[-.35,-.47]],.09,M.armor,[0,-.02,-.48]);
    lightStrip(calf,.08,.48,[0,-.43,-.55]);
    for(const x of [-.35,.35]) rod(calf,[x,-.07,.2],[x,-.88,.26],.068,M.hydraulic,true);
    const ankle=group(calf,'Ankle / vector nozzle',[0,-1.04,0]);
    create(ankle,cyl(.20,.20,.48,12),M.edgeDark,'Ankle spindle',[0,0,0],[0,0,Math.PI/2]);
    const foot=group(ankle,'Transformable foot and impulse cone',[0,-.16,0]);
    plate(foot,.72,.26,1.05,M.shell,[0,-.08,-.21]);
    polygon(foot,[[-.39,.03],[0,.17],[.39,.03],[.30,-.30],[0,-.55],[-.30,-.30]],.15,M.armor,[0,-.16,-.50]);
    plate(foot,.50,.10,.37,M.edgeDark,[0,-.08,.39]);
    lightStrip(foot,.37,.07,[0,-.09,-.88]);
    // Jet nozzle directly aft (+Z), used as the humanoid heel and flight drive.
    const nozzle=group(foot,'Vectored heel thruster',[0,-.04,.56]);
    create(nozzle,cyl(.28,.31,.42,16),M.mechanics,'Thruster drum',[0,0,.09],[Math.PI/2,0,0]);
    ring(nozzle,.25,.043,M.edge,[0,0,.34]);
    ring(nozzle,.19,.038,M.glow,[0,0,.355]);
    create(nozzle,cyl(.17,.12,.02,16),M.glowSoft,'Nozzle luminance',[0,0,.365],[Math.PI/2,0,0]);
    for(let q=0;q<6;q++){
      const a=q*Math.PI/3;
      rod(nozzle,[Math.cos(a)*.20,Math.sin(a)*.20,.34],[Math.cos(a)*.12,Math.sin(a)*.12,.45],.018,M.edge,true);
    }
    legs.push({s,hip,thigh,knee,calf,ankle,foot,nozzle});boosters.push(nozzle);

    // Two-joint folding crystal-metal wings. Folded vertically in mech form.
    const wingRoot=group(chassis,s===-1?'Port wing unfolding':'Starboard wing unfolding',[s*.80,1.05,.66]);
    create(wingRoot,cyl(.21,.21,.22,14),M.edgeDark,'Wing gearbox',[0,0,0],[Math.PI/2,0,0]);
    create(wingRoot,cyl(.13,.13,.27,12),M.mechanics,'Wing hinge core',[0,0,.03],[Math.PI/2,0,0]);
    const primary=group(wingRoot,'First aerofoil');
    polygon(primary,[[0,0],[s*.82,.32],[s*2.20,.48],[s*3.02,.08],[s*2.45,-.39],[s*.68,-.22]],.18,M.shell,[0,0,0]);
    polygon(primary,[[s*.12,.03],[s*.89,.22],[s*2.15,.35],[s*2.77,.08],[s*2.31,-.25],[s*.73,-.13]],.10,M.armor,[0,0,-.14]);
    polygon(primary,[[s*.4,.02],[s*1.0,.16],[s*2.46,.16],[s*2.17,-.01],[s*.88,-.09]],.052,M.white,[0,0,-.22]);
    rod(primary,[0,0,.18],[s*2.75,.065,.19],.075,M.edge);
    rod(primary,[s*.30,-.15,.16],[s*2.28,-.30,.16],.045,M.hydraulic,true);
    for(let k=0;k<5;k++) {
      const x=s*(.57+k*.42);
      plate(primary,.19,.05,.03,k%2?M.glowSoft:M.edge,[x,.10,-.245],[0,0,s*.07],true);
    }
    // Outboard section folds inward to make tall back spires in robot mode.
    const tip=group(primary,'Outer wing hinge / true articulated fold',[s*2.81,.05,0]);
    polygon(tip,[[0,0],[s*.55,.24],[s*1.68,.39],[s*1.90,.11],[s*1.04,-.31],[s*.16,-.22]],.13,M.shell,[0,0,0]);
    polygon(tip,[[s*.08,.02],[s*.60,.15],[s*1.64,.26],[s*1.74,.09],[s*.96,-.18],[s*.2,-.15]],.07,M.white,[0,0,-.10]);
    polygon(tip,[[s*.86,.07],[s*1.90,.11],[s*1.71,.40]],.10,M.edge,[0,0,-.09]);
    rod(tip,[0,0,.08],[s*1.66,.12,.08],.055,M.edge);
    lightStrip(tip,.28,.045,[s*1.27,.12,-.20],[0,0,s*.04]);
    // Flight control vertical fins extend above the wing tip in pitched formation.
    const fin=group(tip,'Deploying dorsal fin',[s*1.15,.05,.11]);
    polygon(fin,[[0,0],[s*.18,.92],[s*.63,.11]],.13,M.edgeDark,[0,0,.09]);
    polygon(fin,[[s*.09,.10],[s*.20,.69],[s*.43,.10]],.055,M.glowSoft,[0,0,-.02]);
    wings.push({s,wingRoot,primary,tip,fin});
  }

  // Tail / energy stabilizer from continuous non-vanishing geometry.
  const tail=group(chassis,'Tail stabilizer',[0,.25,.90]);
  polygon(tail,[[-.29,.02],[0,-.66],[.29,.02],[.15,.28],[-.15,.28]],.20,M.armor,[0,0,0]);
  lightStrip(tail,.09,.47,[0,-.19,-.14]);
  for(const s of [-1,1]){
    plate(chassis,.17,.63,.27,M.edgeDark,[s*.96,1.70,.58],[0,0,-s*.18]);
    polygon(chassis,[[s*.90,1.96],[s*1.17,2.48],[s*1.24,1.60]],.13,M.shell,[0,0,.45]);
  }

  let mode= options.quality === 'lite' ? 'lite' : 'high';
  let progress=options.initialForm === 'flight' ? 1 : 0;
  let target=progress;
  let duration=2.8;
  let motion= options.motion === 'walk' ? 'walk' : options.motion === 'hover' ? 'hover' : 'idle';
  let clock=0,walkPhase=0,pulse=0;
  const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
  const smooth=x=>x*x*(3-2*x);
  const lerp=(a,b,t)=>a+(b-a)*t;
  function setQuality(q) {
    if(disposed)return false;
    mode=q==='lite'?'lite':'high';
    highDetails.forEach(o=>o.visible=mode==='high');
    return mode;
  }
  function setTransformProgress(v) {
    if(disposed)return;
    progress=target=clamp(Number.isFinite(v)?v:0);
    applyPose(0);
  }
  function transformTo(form, seconds=2.8) {
    if(disposed)return;
    target= form==='flight'||form===1 ? 1 : 0;
    duration=Math.max(.3,Math.min(20,Number(seconds)||2.8));
  }
  function setMotion(v) {
    if(disposed)return;
    if(['idle','walk','hover'].includes(v)) motion=v;
  }
  function applyPose(dt=0) {
    const t=smooth(progress),robot=1-t,flight=t;
    const walk=(motion==='walk'?1:0)*robot;
    const hover=(motion==='hover'?1:0)*flight;
    const stepped=Math.sin(walkPhase);
    motionRoot.position.y = .026*Math.sin(clock*1.3)*robot + (.12*Math.sin(clock*2.0)+.1)*hover;
    frame.rotation.z = .01*Math.sin(clock*1.8)*robot + .025*Math.sin(clock*.9)*flight;
    chassis.rotation.x=lerp(0,-1.24,t)+.008*Math.sin(clock*1.7)*robot;
    chassis.rotation.y=.025*Math.sin(clock*.8)*flight;
    // Head retreats inside the flight's forward nose sheath.
    neck.position.y=2.34-.39*t;
    neck.position.z=-.03+.24*t;
    head.rotation.x=.12*t+.028*Math.sin(clock*1.15)*robot;
    head.rotation.y=.08*Math.sin(clock*.47)*robot;
    for(const a of arms) {
      const phase=stepped*a.s;
      a.shoulder.rotation.z=a.s*lerp(.035,1.40,t);
      a.shoulder.rotation.x=lerp(-.05-.25*walk*phase,-.32,t);
      a.upper.rotation.z=a.s*lerp(-.055,.15,t);
      a.elbow.rotation.x=lerp(.05,.24,t);
      a.elbow.rotation.z=a.s*.12*t;
      a.blade.rotation.z=a.s*(.1+1.06*t);
      a.hand.position.y=-.91+.18*t; // hand retracts inside the forearm rail
      a.hand.rotation.x=-.5*t;
    }
    for(const l of legs){
      const stride=stepped*l.s;
      l.hip.rotation.x=lerp(.31*walk*stride,-1.39,t);
      l.hip.rotation.z=l.s*.08*t;
      l.knee.rotation.x=lerp(.08*walk*Math.max(0,-stride),.43,t);
      l.ankle.rotation.x=lerp(-.03*walk*stride,-.31,t);
      l.foot.rotation.x=-.23*t;
      // Heel nozzles stay mechanically rigid through both configurations.
    }
    for(const w of wings){
      w.wingRoot.rotation.z=w.s*lerp(1.42,-.055,t);
      w.wingRoot.rotation.y=w.s*lerp(.13,-.12,t);
      w.tip.rotation.z=w.s*lerp(-2.22,.04,t);
      w.fin.rotation.x=lerp(.30,-.45,t);
      w.wingRoot.rotation.x=.025*Math.sin(clock*1.4+w.s)*flight;
    }
    tail.rotation.x=-.25*t;
    reactorOuter.rotation.z=clock*.54;
    reactorInner.rotation.z=-clock*.92;
    crystal.rotation.y=clock*.72;
    crystal.rotation.z=Math.sin(clock*.7)*.13;
    pulse=.5+.5*Math.sin(clock*3.4);
    // Mutate per-module material only: materials are owned by this module.
    M.glow.emissiveIntensity=1.85+.6*pulse;
    M.glowGold.emissiveIntensity=1.0+.42*(1-pulse);
  }
  function update(dt=0,context={}) {
    if(disposed)return;
    dt=clamp(Number.isFinite(dt)?dt:0,0,.075);
    clock+=dt;
    walkPhase+=dt*(motion==='walk'?4.5:0);
    // Optional host control channels; module doesn't read keyboard/DOM itself.
    if(context && (context.transformTo==='flight'||context.transformTo==='robot')) {
      if((context.transformTo==='flight'?1:0)!==target) transformTo(context.transformTo);
    }
    if(context && typeof context.transformProgress === 'number') {
      setTransformProgress(context.transformProgress);
    } else if (Math.abs(target-progress)>1e-6) {
      const amount=clamp(dt/duration,0,.5);
      // Transform progresses at near-constant speed, stopping exactly at target.
      progress=Math.abs(target-progress)<=amount ? target : progress+Math.sign(target-progress)*amount;
    }
    applyPose(dt);
  }
  function getState(){return {moduleId:'AF-No10',form:progress>=.99?'flight':progress<=.01?'robot':'transforming',progress,target,quality:mode,motion,dimensions:{robotHeight:7.0,flightSpan:11.0}};}
  function dispose(){
    if(disposed)return;
    disposed=true;
    if(root.parent)root.parent.remove(root);
    geos.forEach(g=>g.dispose());
    mats.forEach(m=>m.dispose());
    cache.clear();highDetails.length=0;root.clear();
  }
  setQuality(mode);applyPose();
  return {root,update,setQuality,dispose,transformTo,setTransformProgress,setMotion,getState};
}
