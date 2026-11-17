/**
 * AETHER FRONTIER / No.13  -  VHALKOR, THE AETHERFORGED WYRM
 * Three.js r160 / Y-up / faces -Z / 1 unit = 1 metre
 * Integration entry: createAetherModule(THREE, options)
 * No renderer, camera, controls or global event listeners are created here.
 * Original procedural geometry. No image or texture assets required.
 */
export function createAetherModule(THREE, options = {}) {
  if (!THREE || !THREE.Group || !THREE.Mesh) throw new Error('Three.js THREE namespace required');
  const root = new THREE.Group();
  root.name = 'AF13_VHALKOR_Root';
  root.userData.aetherModule = { team: 13, id: 'VHALKOR', scaleMeters: 1, forward: '-Z' };
  const highDetail = new THREE.Group(); highDetail.name = 'HighQualityOnly'; root.add(highDetail);
  const energyDetail = new THREE.Group(); energyDetail.name = 'EnergyDetail'; root.add(energyDetail);
  const effects = new THREE.Group(); effects.name = 'BossAttackEffects'; root.add(effects);
  const geometries = new Set(), materials = new Set();
  const UP = new THREE.Vector3(0,1,0);
  let disposed = false, elapsed = 0, quality = 'high', currentPhase = 'idle', phaseTime = 0;
  let lastExternalPhase = null;
  function mat(color, metalness=.62, roughness=.38, glow=0x000000, intensity=0, extra={}) {
    const m = new THREE.MeshStandardMaterial({color,metalness,roughness,emissive:glow,emissiveIntensity:intensity,...extra});
    materials.add(m); return m;
  }
  const P = {
    shadow: mat(0x101723,.72,.43), obsidian: mat(0x1c2633,.82,.32), hull: mat(0x344358,.82,.29),
    blueSteel: mat(0x566b83,.86,.23), bevel: mat(0x91a8b8,.88,.23), pale: mat(0xa4c4cb,.60,.31),
    gold: mat(0xc0a06e,.79,.25), bronze: mat(0x78654d,.80,.36),
    cyan: mat(0x43dce5,.25,.23,0x10d9f4,2.6), ice: mat(0x9dfbff,.15,.14,0x43edff,3.0),
    amber: mat(0xffac65,.29,.25,0xff6b32,1.9), deepGlow: mat(0x0d748c,.36,.36,0x008fba,1.4),
    horn: mat(0xadbfc8,.69,.26), eye: mat(0xff7b43,.18,.20,0xff6d26,3.1)
  };
  const sphereGeom = new THREE.SphereGeometry(1,16,10); geometries.add(sphereGeom);
  const octaGeom = new THREE.OctahedronGeometry(1,0); geometries.add(octaGeom);
  const tetraGeom = new THREE.TetrahedronGeometry(1,0); geometries.add(tetraGeom);
  const boxGeom = new THREE.BoxGeometry(1,1,1); geometries.add(boxGeom);
  function addMesh(parent,geometry,material,name='',detail=false) {
    geometries.add(geometry);
    const mesh=new THREE.Mesh(geometry,material);mesh.name=name;
    mesh.castShadow=true; mesh.receiveShadow=true;
    parent.add(mesh); if(detail) mesh.userData.highDetail=true;
    return mesh;
  }
  function ell(parent,p,s,m,name='',d=false) {
    const mesh = new THREE.Mesh(sphereGeom,m); mesh.position.set(...p);mesh.scale.set(...s);mesh.name=name;
    mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);if(d)mesh.userData.highDetail=true;return mesh;
  }
  function box(parent,p,s,m,name='',rot=null,d=false){
    const obj=new THREE.Mesh(boxGeom,m);obj.position.set(...p);obj.scale.set(...s);obj.name=name;
    if(rot)obj.rotation.set(...rot);obj.castShadow=true;obj.receiveShadow=true;parent.add(obj);if(d)obj.userData.highDetail=true;return obj;
  }
  function bone(parent,a,b,r1,r2,m,sideCount=7,name='',d=false){
    const A=new THREE.Vector3(...a), B=new THREE.Vector3(...b), delta=B.clone().sub(A);
    const g=new THREE.CylinderGeometry(r2,r1,delta.length(),sideCount,1,false);
    const ob=addMesh(parent,g,m,name,d);ob.position.copy(A).add(B).multiplyScalar(.5);
    ob.quaternion.setFromUnitVectors(UP,delta.normalize());return ob;
  }
  function crystal(parent,p,s,m,name='',d=false){
    const ob=new THREE.Mesh(octaGeom,m);ob.position.set(...p);ob.scale.set(...s);
    ob.rotation.set(.2,.785,.3);ob.name=name;ob.castShadow=true;parent.add(ob);if(d)ob.userData.highDetail=true;return ob;
  }
  function torus(parent,p,rad,tube,m,rot=[0,0,0],detail=false,name=''){const g=new THREE.TorusGeometry(rad,tube,5,40);const ob=addMesh(parent,g,m,name,detail);ob.position.set(...p);ob.rotation.set(...rot);return ob;}
  function loftZ(parent,rings,m,name=''){ // rings: [z, radiusX, radiusY, centerY]
    const slices=12,verts=[],idx=[];
    for(const [z,rx,ry,cy] of rings){
      for(let i=0;i<slices;i++){
        const a=2*Math.PI*i/slices;verts.push(Math.cos(a)*rx,cy+Math.sin(a)*ry,z);
      }
    }
    for(let j=0;j<rings.length-1;j++)for(let i=0;i<slices;i++){
      let n=j*slices+i,k=j*slices+(i+1)%slices;
      idx.push(n,k,n+slices,k,k+slices,n+slices);
    }
    for(let cap of [0,rings.length-1]){
      const ring=rings[cap];const c=verts.length/3;verts.push(0,ring[3],ring[0]);
      for(let i=0;i<slices;i++){
        const a=cap*slices+i,b=cap*slices+(i+1)%slices;
        if(cap===0)idx.push(c,b,a);else idx.push(c,a,b);
      }
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(idx);g.computeVertexNormals();
    return addMesh(parent,g,m,name);
  }
  function fin(parent,base,tip,width,m,d=false,angle=0){
    const bx=base[0],by=base[1],bz=base[2],tx=tip[0],ty=tip[1],tz=tip[2];
    const a=new THREE.Vector3(bx-width/2,by,bz),b=new THREE.Vector3(bx+width/2,by,bz);
    const t=new THREE.Vector3(tx,ty,tz), mid=new THREE.Vector3(bx,by+.12,bz+Math.max(.12,width*.42));
    const pos=[...a.toArray(),...b.toArray(),...t.toArray(),...a.toArray(),...t.toArray(),...mid.toArray(),...b.toArray(),...mid.toArray(),...t.toArray()];
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.computeVertexNormals();
    const mesh=addMesh(parent,g,m,'CarapaceBlade',d);mesh.material.side=THREE.DoubleSide;return mesh;
  }
  function claw(parent,a,b,r=.22){bone(parent,a,b,r,.012,P.horn,5,'AetheriumTalon');}
  // MAIN HULL: independent anatomical shells; massive silhouette even in low quality.
  const chest = new THREE.Group();chest.name='TorsoAndArcFurnace';root.add(chest);
  loftZ(chest,[[-4.40,.22,.32,7.75],[-3.65,2.25,1.86,7.85],[-2.25,2.93,2.05,7.82],[.2,3.12,2.04,7.55],[2.7,2.72,1.91,7.32],[4.45,1.70,1.32,7.32],[5.1,.42,.5,7.1]],P.shadow,'VertebralReactorHull');
  loftZ(chest,[[-4.14,.08,.09,7.77],[-3.35,2.05,1.72,7.84],[-1.6,2.77,1.83,7.87],[.65,2.95,1.80,7.58],[2.9,2.48,1.68,7.34],[4.55,1.35,1.15,7.30]],P.hull,'PrimaryFacetedArmor');
  // Layered dorsal back and belly plates
  for(let i=0;i<8;i++){
    const z=-3.38+i*1.05;const taper=Math.sin((i+1)/9*Math.PI)*.70+.34;
    box(chest,[0,9.56-.22*i/8,z],[3.15*taper,.22,.68],i%2===0?P.blueSteel:P.bevel,'ArticulatedDorsalShield',[-.07,0,0]);
    bone(chest,[-2.5*taper,8.55,z],[2.5*taper,8.55,z],.10,.10,P.bronze,6,'RibReinforcement',true);
    // Dorsal armored blades have distinct stepped heights.
    const h=(i<4?2.1:1.7)*(0.85+.15*Math.cos(i));
    fin(chest,[0,9.65,z],[0,9.65+h,z+.35],.77*taper,i%3===0?P.gold:P.bevel,i>4);
    crystal(chest,[0,10.05+h*.61,z+.4],[.12,.28,.13],P.cyan,'SpinalEnergyVane',true);
  }
  for(const s of [-1,1]){
    for(let i=0;i<7;i++){
      const z=-3.16+i*1.15,st=.87+.18*Math.sin((i+1)*.59);
      const shoulder=box(chest,[s*(2.42*st),8.15,z],[.55,.91,.79],i%2?P.hull:P.blueSteel,'LateralInterlockingArmor',[.05,s*.06,s*.15]);
      box(chest,[s*(2.57*st),8.58,z],[.17,.18,.65],P.gold,'ArcaneCircuitTrim',null,true);
      crystal(chest,[s*(2.6*st),8.92,z],[.14,.14,.30],P.deepGlow,'Radiator',true);
    }
    // Converging chest struts
    bone(chest,[s*2.2,8.85,-2.95],[s*.95,7.60,-4.13],.19,.12,P.bevel,6,'PectoralBrace');
    bone(chest,[s*2.56,7.08,-1.95],[s*.68,7.40,-4.05],.14,.11,P.gold,6,'FurnaceCage');
    for(let i=0;i<5;i++){
      const z=-2.45+i*1.12;
      fin(chest,[s*2.8,9.0,z],[s*(3.6+i*.04),10.42,z+.26],.65,P.blueSteel,true);
    }
  }
  // FURNACE. Forward facing, recessed stacked rings and rotating star-core.
  const furnace=new THREE.Group();furnace.name='SixfoldAetherHeart';furnace.position.set(0,7.65,-4.25);root.add(furnace);
  ell(furnace,[0,0,.05],[1.14,1.26,.30],P.shadow,'ReactorSocket');
  torus(furnace,[0,0,-.28],1.05,.135,P.gold,[0,0,0],false,'GoldLockRing');
  torus(furnace,[0,0,-.35],.83,.055,P.cyan,[0,0,0],false,'LuminousSeal');
  torus(furnace,[0,0,-.45],.56,.035,P.bevel,[0,0,0],true,'InnerStabilizerRing');
  const heart=crystal(furnace,[0,0,-.50],[.56,.72,.40],P.ice,'AetherCrystalHeart');
  const heartShield=new THREE.Group();furnace.add(heartShield);
  for(let i=0;i<6;i++){
    const a=i/6*Math.PI*2;
    crystal(heartShield,[Math.cos(a)*1.00,Math.sin(a)*1.00,-.35],[.13,.26,.13],P.amber,'SixfoldLock',true).rotation.z=-a;
  }
  // NECK, 6 interlocked armored segments, fixed silhouette + small active aiming joint.
  const neck=new THREE.Group();neck.name='NeckServoAssembly';neck.position.set(0,8.55,-3.71);root.add(neck);
  for(let i=0;i<6;i++){
    const z=-i*.99, rise=.10+i*.15, radius=1.14-i*.073;
    ell(neck,[0,rise,z],[radius,1.02-i*.06,.72],P.shadow,'FlexibleCervicalLink');
    bone(neck,[0,rise,z-.54],[0,rise+.075,z+.43],radius*.89,radius*.83,P.blueSteel,9,'HexagonalVertebra');
    box(neck,[0,rise+.92-i*.035,z],[radius*1.75,.26,.75],i%2?P.hull:P.bevel,'CervicalArmorCrown');
    for(let s of [-1,1]){
      box(neck,[s*(radius*.88),rise+.34,z],[.25,.80,.61],P.gold,'CervicalLockingClip',null,i%2===1);
      crystal(neck,[s*radius,rise+.46,z-.2],[.12,.18,.19],P.cyan,'NeckVessel',true);
    }
    if(i<5)fin(neck,[0,rise+1.0,z],[0,rise+1.8,z+.37],.55,P.blueSteel,i%2===1);
  }
  const head=new THREE.Group();head.name='DragonHead_JawEyesHorns';head.position.set(0,.90,-6.2);neck.add(head);
  loftZ(head,[[.70,.60,.46,.0],[.28,1.40,.92,.03],[-1.20,1.45,1.06,0],[-2.28,1.12,.65,-.16],[-3.45,.77,.45,-.28],[-4.20,.42,.32,-.33]],P.shadow,'SkullInnerStructure');
  loftZ(head,[[.61,.62,.46,.12],[.05,1.31,.90,.17],[-1.1,1.37,.95,.17],[-1.82,1.17,.62,.08],[-3.17,.75,.38,-.12],[-3.95,.44,.25,-.19]],P.blueSteel,'ArmoredDragonCranium');
  // Forehead heavy overlapping crests, snout nose and temple armor
  box(head,[0,.91,-.98],[1.66,.18,1.54],P.bevel,'ForeheadCrown',[-.16,0,0]);
  box(head,[0,.31,-3.10],[1.49,.33,1.61],P.hull,'SerratedMuzzle');
  box(head,[0,.42,-3.97],[1.22,.25,.36],P.gold,'NasalCuttingEdge');
  const jaw=new THREE.Group();jaw.name='MotorJaw';jaw.position.set(0,-.42,-.58);head.add(jaw);
  loftZ(jaw,[[0,.65,.16,-.12],[-.8,1.05,.26,-.17],[-2.05,.98,.20,-.22],[-3.25,.72,.23,-.22],[-3.55,.40,.15,-.17]],P.obsidian,'LowerMandible');
  for(const s of [-1,1]){
    bone(jaw,[s*.64,-.19,-.29],[s*.77,-.21,-3.32],.19,.10,P.bevel,6,'JawlineTitanium');
    // individual teeth, visible when mouth opens
    for(let i=0;i<6;i++){
      const z=-1.28-i*.41,x=s*(.91-i*.055);
      bone(head,[x,-.35,z],[x,-.75+(i%2)*.09,z-.10],.075,.006,P.horn,5,'UpperFang',i>3);
      bone(jaw,[x,-.09,z],[x,.20+(i%2)*.07,z-.07],.068,.007,P.horn,5,'LowerFang',i>3);
    }
    const eye=ell(head,[s*1.27,.33,-1.41],[.105,.22,.43],P.eye,'ThermalOculus');eye.rotation.y=s*.2;
    box(head,[s*1.33,.68,-1.20],[.24,.20,.95],P.gold,'EyeBrowPlate',[.10,s*.22,-s*.14]);
    for(let j=0;j<4;j++){
      const z=-.22-j*.38;
      const hornOb=bone(head,[s*(.86+j*.14),.76,z],[s*(1.35+j*.13),1.63-j*.22,z+.67],.19-j*.021,.02,P.horn,6,'AntlerHorns');
    }
    // huge swept-back signature horn
    bone(head,[s*1.01,.81,-.25],[s*1.72,2.18,.48],.43,.25,P.gold,8,'MainCrownHornBase');
    bone(head,[s*1.72,2.18,.48],[s*2.16,3.03,1.75],.25,.016,P.horn,7,'MainCrownHornTip');
    // glowing gill slots on temple
    for(let k=0;k<3;k++)box(head,[s*1.32,.13-k*.18,-.25+k*.38],[.10,.095,.31],P.cyan,'GillLightSlot',null,true);
    crystal(head,[s*.50,.64,-3.78],[.17,.12,.38],P.cyan,'NostrilIgnition',true);
  }
  const mouthLight=crystal(head,[0,-.24,-2.72],[.40,.10,.79],P.amber,'MouthIgniter');
  // REAL LEGS: pivotable hip groups with articulated kneecaps, 3 talons per foot.
  const legs=[];
  for(const [s,z,front] of [[-1,-2.45,true],[1,-2.45,true],[-1,3.22,false],[1,3.22,false]]) {
    const g=new THREE.Group();g.position.set(s*(front?2.12:2.35),7.25,z);g.name=(front?'Fore':'Hind')+(s<0?'Left':'Right')+'Leg';root.add(g);legs.push({g,s,z,front});
    const knee=[s*(front?1.11:1.18),-2.92,front?-.70:.87];
    const ankle=[s*1.39,-6.50,front?-.90:.48];
    ell(g,[0,0,0],[.92,.97,.95],P.hull,'BallHipSocket');
    bone(g,[0,0,0],knee,.73,.56,P.shadow,9,'HydraulicFemur');
    bone(g,[0,-.19,-.02],knee,.61,.46,P.blueSteel,7,'FemurArmor');
    ell(g,knee,[.65,.67,.70],P.gold,'KneeBearing');
    crystal(g,[knee[0]+s*.38,knee[1],knee[2]],[.18,.23,.34],P.cyan,'KneeIgnition');
    bone(g,knee,ankle,.56,.30,P.shadow,8,'DigitigradeShin');
    bone(g,[knee[0]+s*.13,knee[1]+.09,knee[2]],[ankle[0]+s*.08,ankle[1]+.4,ankle[2]],.40,.22,P.bevel,6,'ShinArmor');
    box(g,[knee[0]+s*.45,knee[1]-.62,knee[2]+.08],[.27,1.07,.62],P.gold,'PistonCover',null,true);
    ell(g,[ankle[0],ankle[1]-.22,ankle[2]-.37],[.75,.34,1.05],P.hull,'WeightedDragonPaw');
    for(let t=-1;t<=1;t++){
      const xx=ankle[0]+t*.48,zz=ankle[2]-1.0;
      bone(g,[xx,ankle[1]-.32,zz+.15],[xx+t*.12,ankle[1]-.51,zz-.6],.21,.13,P.blueSteel,6,'ToeSegment');
      claw(g,[xx+t*.12,ankle[1]-.51,zz-.6],[xx+t*.16,ankle[1]-.68,zz-1.14],.19);
    }
    for(let n=0;n<3;n++)box(g,[s*(.50+n*.25),-1.03-n*.47,front?-.33:.43],[.31,.55,.71],P.hull,'LayeredLimbShield',[0,0,-s*.14],true);
  }
  // SEGMENTED TAIL, real hierarchical joint chain with separate internal actuators.
  const tailBase=new THREE.Group();tailBase.name='Tail_Base';tailBase.position.set(0,7.26,4.66);root.add(tailBase);
  const tailJoints=[];let parent=tailBase;
  for(let i=0;i<9;i++){
    const joint=new THREE.Group();joint.name='CaudalServo_'+(i+1);
    joint.position.set(0,i===0?0:-.18, i===0?0:1.64);parent.add(joint);tailJoints.push(joint);
    const r=Math.max(.21,1.03-i*.095);
    bone(joint,[0,0,-.10],[0,-.16,1.78],r,r*.75,P.obsidian,8,'InnerTailCable');
    bone(joint,[0,.03,.18],[0,-.10,1.51],r*.84,r*.68,i%2?P.blueSteel:P.hull,7,'CaudalArmorRing');
    torus(joint,[0,.02,.26],r*.85,.075,P.gold,[Math.PI/2,0,0],i>2,'SegmentArticulationRing');
    if(i<7)fin(joint,[0,r*.70,.55],[0,r*(1.4+(i<3?.55:0)),1.02],r*.95,P.bevel,i>4);
    for(let s of [-1,1])box(joint,[s*r*.81,.04,.79],[r*.22,r*.45,.76],P.bronze,'TailHydraulicShroud',null,i>3);
    parent=joint;
  }
  const tip=new THREE.Group();tip.position.set(0,-.10,1.9);parent.add(tip);
  bone(tip,[0,0,-.15],[0,0,2.18],.24,.012,P.gold,8,'TailSpear');
  crystal(tip,[0,0,.66],[.73,.51,1.48],P.ice,'LivingTailCrystal');
  for(let s of [-1,1])fin(tip,[s*.30,0,.41],[s*1.37,.56,1.78],.30,P.blueSteel);
  // WINGS: articulated span frames, separate translucent membrane and tracer network.
  const wings=[];
  function makeMembrane(group,side) {
    const V = (x,y,z)=>[x*side,y,z];
    const rootA=V(.4,-.25,1.5),shoulder=V(3.5,.24,-1.35),elbow=V(7.1,1.1,-1.55),wrist=V(11.45,1.55,.35);
    const fingers=[V(16.2,1.1,-6.7),V(18.9,.48,-2.60),V(19.65,-.36,3.10),V(16.3,-1.05,9.9),V(10.25,-1.13,12.4)];
    const trailing=V(2.8,-.65,5.7);
    const verts=[],colors=[],tris=[];
    const c1=new THREE.Color(0x294b6c),c2=new THREE.Color(0x2aa0b2),c3=new THREE.Color(0x0b1729);
    function tri(a,b,c,region){
      const base=verts.length/3;
      for(const [j,v] of [a,b,c].entries()){
        verts.push(...v);
        const tint=region===0?c1:region===1?c2:c3;
        const col=tint.clone().lerp(new THREE.Color(0x9fe7e8),j===1?.24:.04);
        colors.push(col.r,col.g,col.b);
      }
      tris.push(base,base+1,base+2);
    }
    tri(rootA,shoulder,trailing,0);tri(shoulder,elbow,trailing,0);tri(elbow,wrist,trailing,1);
    for(let i=0;i<fingers.length-1;i++){
      tri(wrist,fingers[i],fingers[i+1],i%2);if(i>=1)tri(trailing,wrist,fingers[i+1],2);
    }
    tri(trailing,fingers[4],V(7.1,-1.05,8.7),0);
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(tris);g.computeVertexNormals();
    const membraneMaterial = new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,transparent:true,opacity:.88,depthWrite:false,metalness:.34,roughness:.43,emissive:0x103946,emissiveIntensity:.36});materials.add(membraneMaterial);
    const skin=addMesh(group,g,membraneMaterial,'TitaniumWeaveAndEtherMembrane');skin.castShadow=false;
    bone(group,V(0,0,0),shoulder,.55,.42,P.hull,8,'HumerusWing');
    bone(group,shoulder,elbow,.48,.32,P.bevel,8,'WingElbow');
    bone(group,elbow,wrist,.37,.25,P.gold,8,'WingForearm');
    ell(group,elbow,[.48,.45,.50],P.obsidian,'WingElbowHydraulics');
    crystal(group,elbow,[.33,.34,.39],P.cyan,'WingElbowCrystal');
    crystal(group,wrist,[.50,.36,.46],P.gold,'PteroidWrist');
    for(let i=0;i<fingers.length;i++){
      bone(group,wrist,fingers[i],.21-i*.018,.026,P.blueSteel,6,'RadialWingSpar');
      bone(group,trailing,fingers[i],.085,.018,P.deepGlow,5,'WingRunicSuture',i>0);
      if(i<4){
        const a=fingers[i],b=fingers[i+1];bone(group,a,b,.10,.015,P.gold,5,'MembraneOuterFrame',i>=2);
      }
    }
    bone(group,trailing,rootA,.21,.17,P.blueSteel,6,'WingTrailingRim');
    for(let k=0;k<6;k++){
      const t=(k+.5)/6;
      const pt=V(4+t*8, .4+t*.7, -1.48+t*.5);
      crystal(group,pt,[.12,.13,.33],k%2?P.cyan:P.amber,'AncientWingGlyph',true);
    }
    return skin;
  }
  for(let s of [-1,1]){
    const wing=new THREE.Group();wing.position.set(s*2.52,9.18,-.55);wing.name=s===1?'StarboardAetherWing':'PortAetherWing';root.add(wing);
    ell(wing,[0,0,0],[.79,.76,1.25],P.gold,'RotaryWingJoint');
    makeMembrane(wing,s);wings.push({group:wing,side:s});
    for(let i=0;i<3;i++){
      const x=s*(1.15+i*.40),z= -.4+i*.63;
      box(wing,[x,.35,z],[.32,.48,1.04],P.hull,'WingRootShield',[0,0,-s*.23]);
    }
  }
  // Energy constructs/visual only. Never tied to hitboxes or game damage.
  const aura=new THREE.Group();aura.name='RitualOrbitals';energyDetail.add(aura);
  for(let i=0;i<3;i++){
    torus(aura,[0,7.65,-4.75],1.50+i*.27,.012,P.cyan,[0,0,i*Math.PI/3],false,'ArcaneHalo');
  }
  const beamGroup=new THREE.Group();beamGroup.name='AetherBreathPurelyVisual';effects.add(beamGroup);
  beamGroup.position.set(0,9.17,-13.20);
  beamGroup.visible=false;
  // Beam extends in local -Z, starts at dragon muzzle.
  const beamOuter=bone(beamGroup,[0,0,-.05],[0,0,-21.0],.77,1.85,P.deepGlow,12,'AetherBreathOuter');
  const beamInner=bone(beamGroup,[0,0,-.15],[0,0,-21.1],.28,.60,P.ice,9,'AetherBreathCore');
  for(let i=0;i<9;i++){
    const ring=torus(beamGroup,[0,0,-1.2-i*2.30],.74+i*.09,.05,P.cyan,[0,0,0],false,'BreathPulseRing');
  }
  const chargeGlow=new THREE.Group();chargeGlow.position.set(0,9.17,-13.2);effects.add(chargeGlow);
  const chargeCrystal=crystal(chargeGlow,[0,0,0],[.84,.84,.84],P.ice,'MouthChargeCore');chargeGlow.visible=false;
  const pulse1=torus(chargeGlow,[0,0,.02],1.25,.085,P.cyan,[0,0,0]);
  const pulse2=torus(chargeGlow,[0,0,-.10],1.65,.04,P.gold,[0,0,Math.PI/4]);
  // Shadow-free decorative instanced rivets, high only; one draw call per metal.
  const rivetGeom=new THREE.IcosahedronGeometry(.085,0);geometries.add(rivetGeom);
  const rivets=new THREE.InstancedMesh(rivetGeom,P.gold,66);rivets.name='PrecisionRivets_Instanced';
  const dummy=new THREE.Object3D();
  for(let i=0;i<66;i++){
    const z=-3.15+(i%11)*.73,s=i%2===0?-1:1,section=Math.floor(i/22);
    dummy.position.set(s*(2.69-section*.19),8.25+(section-1)*.35,z);
    dummy.rotation.set(0,0,0);dummy.scale.setScalar(.75+(i%4)*.12);dummy.updateMatrix();rivets.setMatrixAt(i,dummy.matrix);
  }
  rivets.instanceMatrix.needsUpdate=true;highDetail.add(rivets);
  // Expose named anchors for combat/VFX integrators; module never governs damage.
  const anchors={head,mouth:mouthLight,core:heart,tail:tip,wingLeft:wings[0].group,wingRight:wings[1].group,body:chest};
  root.userData.anchors=anchors;
  const sampleClamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const smooth=(a,b,x)=>{const t=sampleClamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
  function setQuality(mode){
    quality=(mode==='low'||mode==='lite'||mode==='light')?'low':'high';
    highDetail.visible=quality==='high'; energyDetail.visible=quality==='high';
    root.traverse(o=>{if(o.userData.highDetail)o.visible=quality==='high';});
    // On low quality, avoid transparent full-wing overdraw (retains opaque structure).
    for(const w of wings){w.group.traverse((o)=>{
      if(o.name==='TitaniumWeaveAndEtherMembrane') {
        o.material.opacity=quality==='low'?.95:.88;
        o.material.transparent=quality==='high';
        o.material.depthWrite=quality==='low';
        o.material.needsUpdate=true;
      }
    });}
    return quality;
  }
  function setPhase(name) {
    const accepted=['idle','roar','charge','breath','flight','land'];
    if(!accepted.includes(name))name='idle';
    if(currentPhase!==name){currentPhase=name;phaseTime=0;}
    return currentPhase;
  }
  function update(dt,context={}) {
    if(disposed)return;
    dt=sampleClamp(Number.isFinite(dt)?dt:0,0,.075);
    elapsed+=dt;phaseTime+=dt;
    if(context.phase && context.phase!==lastExternalPhase){setPhase(context.phase);lastExternalPhase=context.phase;}
    if(!context.phase)lastExternalPhase=null;
    const t=elapsed, action=currentPhase;
    const fly=action==='flight', breathe=action==='breath', charging=action==='charge';
    const roar=action==='roar';
    const power=charging ? smooth(0,1.9,phaseTime) : breathe?1:0;
    // Hover and controlled spinal flex; do not move root or hijack game locomotion.
    chest.position.y=Math.sin(t*1.35)*.065+(fly?.48:0);
    furnace.position.y=7.65+Math.sin(t*1.35)*.065+(fly?.48:0);
    heart.rotation.y=t*1.8;heart.rotation.z=t*.57;
    heartShield.rotation.z=t*.32;
    for(let i=0;i<tailJoints.length;i++){
      const j=tailJoints[i];j.rotation.y=Math.sin(t*(fly?2.5:1.13)-i*.43)*(fly?.20:.12);
      j.rotation.x=.07+Math.sin(t*.95-i*.53)*.045+(roar?-.035:0);
    }
    neck.rotation.x=(roar?-.20: charging?-.12: fly?.08:0)+Math.sin(t*1.2)*.024;
    neck.rotation.y=Math.sin(t*.45)*.024;
    head.rotation.x=(roar?-.18: charging?-.05:0)+Math.sin(t*1.4)*.03;
    jaw.rotation.x=roar?-.53-.07*Math.sin(t*14):breathe?-.40:charging?-.30:-.045-Math.sin(t*1.7)*.017;
    for(let i=0;i<wings.length;i++){
      const w=wings[i],s=w.side;
      const flap=fly ? Math.sin(t*3.3)*.34 +.12 :
        roar ? .39+Math.sin(t*5.0)*.05 :charging? .26 : .16+Math.sin(t*1.18+i*.09)*.08;
      w.group.rotation.z=s*flap;
      w.group.rotation.x=(roar?-.14:fly?.12:0)+s*Math.sin(t*1.1)*.02;
    }
    for(let i=0;i<legs.length;i++){
      const leg=legs[i];leg.g.rotation.x=(fly?(i<2?-.29:.23):0)+Math.sin(t*(fly?3.3:1.1)+i*1.8)*(fly?.055:.016);
    }
    beamGroup.visible=breathe;
    if(breathe){
      beamGroup.scale.set(1+Math.sin(t*24)*.055,1+Math.sin(t*21)*.06,smooth(0,.55,phaseTime));
      beamGroup.rotation.z=t*.7;
    }
    chargeGlow.visible=charging || (breathe && phaseTime<.55);
    if(chargeGlow.visible){
      const scale=charging?.35+power*1.15:1.4;
      chargeGlow.scale.setScalar(scale*(1+Math.sin(t*8)*.065));
      chargeGlow.rotation.z=t*.65;
    }
    aura.rotation.z=t*.14;
    aura.scale.setScalar(1+Math.sin(t*2.4)*.028+power*.16);
    // Material emissive changes are inexpensive and independent from external lighting.
    P.cyan.emissiveIntensity=(quality==='high'?2.2:1.3)+(power*2.3);
    P.ice.emissiveIntensity=(quality==='high'?2.8:1.7)+power*2.1;
    P.eye.emissiveIntensity=roar?4.8:2.6+power;
  }
  function dispose(){
    if(disposed)return;disposed=true;
    root.traverse(o=>{if(o.isInstancedMesh)o.dispose?.();});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
    root.removeFromParent();
  }
  setQuality(options.quality || 'high');
  if(options.phase)setPhase(options.phase);
  return {root,update,setQuality,dispose,setPhase,anchors,
    get quality(){return quality;}, get phase(){return currentPhase;},
    metadata:Object.freeze({id:'AF13-VHALKOR',name:'VHALKOR',version:'1.0.0',heightMeters:14,approxWingSpanMeters:43,forward:'-Z',up:'+Y',units:'metres'})};
}
