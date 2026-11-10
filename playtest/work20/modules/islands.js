/**
 * AETHER FRONTIER / TEAM 03
 * SKYWARD ARCHIPELAGO v1.0.0 - Three.js r160
 * Y up, forward -Z, meters. Never creates renderer, camera, lights or input handlers.
 * Modular: createAetherModule(THREE, options) -> {root, update, setQuality, dispose, ...}
 * All visual geometries and materials are procedurally generated.
 */

const ISLAND_DATA = [
  { id:'dock',       name:'蒼風の艇庫',   subtitle:'SKIFF HARBOR',          x:0,   z:70,  y:2,  r:23, kind:'dock',     hue:0x7ac5ac },
  { id:'nexus',      name:'環天の広場',   subtitle:'SKYWARD NEXUS',         x:0,   z:0,   y:9,  r:22, kind:'nexus',    hue:0x8fbf9e },
  { id:'garden',     name:'光花の庭園',   subtitle:'LUMEN GARDENS',         x:72,  z:35,  y:13, r:26, kind:'garden',   hue:0x8bc7a1 },
  { id:'quarry',     name:'蒼晶の採掘島', subtitle:'AZURE CRYSTAL QUARRY', x:80,  z:-41, y:19, r:23, kind:'quarry',   hue:0x84bcb0 },
  { id:'observatory',name:'天球観測院',   subtitle:'CELESTIAL OBSERVATORY',x:10,  z:-103,y:29, r:28, kind:'observatory',hue:0x9cbaae },
  { id:'wind',       name:'風詠みの街',   subtitle:'WINDWARD VILLAGE',      x:-66, z:-71, y:18, r:25, kind:'wind',     hue:0x9fba98 },
  { id:'orchard',    name:'雲上果樹園',   subtitle:'CLOUD ORCHARD',         x:-81, z:14,  y:10, r:25, kind:'orchard',  hue:0xa2c48f },
  { id:'power',      name:'古代環流炉',   subtitle:'ARCANE FLOW REACTOR',  x:-59, z:79,  y:4,  r:21, kind:'power',    hue:0x8baaa8 },
];
const BRIDGE_PAIRS = [
  ['dock','nexus'],['nexus','garden'],['garden','quarry'],
  ['quarry','observatory'],['observatory','wind'],['wind','orchard'],
  ['orchard','power'],['power','dock'],['nexus','orchard'],['nexus','wind'],
];
const BEACON_ISLANDS = ['garden','quarry','wind','orchard','power'];
const SKY_PALETTE = [0x9fd9ff,0x7dc8ef,0xb0c3e9];

function hash(x) { let v=Math.sin(x*91.174+13.27)*43758.5453; return v-Math.floor(v); }
function smooth(t){return t*t*(3-2*t);}
function lerp(a,b,t){return a+(b-a)*t;}

export function createAetherSkiff(THREE) {
  // Separate pure-model factory so teams can attach it to their own vehicle controller.
  const root=new THREE.Group(); root.name='AF03 / Zephyr-class sky skiff';
  const geometries=[],materials=[];
  const mat=(color,metalness=.4,roughness=.4,emissive=0x000000,intensity=0)=>{
    const m=new THREE.MeshStandardMaterial({color,metalness,roughness,emissive,emissiveIntensity:intensity,flatShading:true}); materials.push(m);return m;
  };
  const shell=mat(0x143a50,.65,.31), shellLight=mat(0x346178,.75,.29), gold=mat(0xe7bd7f,.78,.33),
    glass=mat(0x55cfd6,.44,.2,0x0a8fa6,.65), glow=mat(0x49edfa,.3,.18,0x00d5ff,2.2), dark=mat(0x111f31,.85,.3);
  function mesh(geom, material, x=0,y=0,z=0){geometries.push(geom);const m=new THREE.Mesh(geom,material);m.position.set(x,y,z);root.add(m);return m;}
  function box(w,h,d,m,x,y,z){return mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z);}
  function cyl(rt,rb,h,m,x,y,z,s=10){return mesh(new THREE.CylinderGeometry(rt,rb,h,s),m,x,y,z);}
  // Long sharp bow points -Z. This is an explorer craft, not a weapon.
  let hull=mesh(new THREE.CylinderGeometry(1.22,1.55,8.2,7,1),shell,0,0,-.3);hull.rotation.x=Math.PI/2;
  let beak=mesh(new THREE.ConeGeometry(1.13,3.7,7),shellLight,0,0,-5.2);beak.rotation.x=-Math.PI/2;
  box(2.65,.43,4.1,shellLight,0,.68,.1);
  let canopy=mesh(new THREE.SphereGeometry(1,12,8,0,Math.PI*2,0,Math.PI*.5),glass,0,1,-1.1);
  canopy.scale.set(1.05,1.48,2.1);
  box(1.45,.1,2.8,gold,0,1.01,-1.1);
  for(let side of [-1,1]){
    const wing=box(3.8,.18,3.4,shellLight,side*2.47,-.2,.75);
    wing.rotation.z=side*.13;
    box(2.8,.13,.18,gold,side*2.65,-.07,-.87);
    box(1.25,.45,3.4,shell,side*4.25,-.22,.78);
    let engine=cyl(.68,.75,2.15,dark,side*4.1,-.18,2.1,12);engine.rotation.x=Math.PI/2;
    let jet=mesh(new THREE.TorusGeometry(.51,.12,6,18),glow,side*4.1,-.18,3.25);
    box(.25,1.18,2.1,shell,side*1.18,.68,2.38);
    let fin=box(.17,1.1,1.1,gold,side*4.85,.38,1.8);fin.rotation.z=side*.2;
  }
  for(let z=-3.5;z<3.2;z+=.72)box(1.24,.06,.06,gold,0,-1.08,z);
  const light=mesh(new THREE.IcosahedronGeometry(.38,1),glow,0,.35,-7.06);
  root.userData.jetRings=[...root.children.filter(n=>n.geometry?.type==='TorusGeometry')];
  root.userData.tip=light;
  root.userData.dispose=()=>{for(const g of geometries)g.dispose();for(const m of materials)m.dispose();};
  return root;
}

export function createAetherModule(THREE, options={}) {
  const root=new THREE.Group(); root.name='AF03 / Skyward Archipelago';
  const resources={geometries:new Set(),materials:new Set()};
  const registerG=g=>{resources.geometries.add(g);return g;};
  const registerM=m=>{resources.materials.add(m);return m;};
  const standard=(color,metalness=.13,roughness=.75,emissive=0,emissiveIntensity=0,flat=false)=>registerM(new THREE.MeshStandardMaterial({color,metalness,roughness,emissive,emissiveIntensity,flatShading:flat}));
  const basic=(color,params={})=>registerM(new THREE.MeshBasicMaterial({color,...params}));
  const mStone=standard(0x607b84,.22,.81,0,0,true), mStoneBright=standard(0x8ea7a1,.12,.84),
        mMetal=standard(0x2e475b,.78,.38), mDark=standard(0x1b3443,.67,.42),
        mGold=standard(0xe9c187,.73,.38), mIvory=standard(0xe9e1c9,.26,.63),
        mGrass=standard(0x759e8d,.05,.93), mWood=standard(0x886e62,.12,.85),
        mGlass=standard(0x86e9df,.33,.21,0x108c93,.32),
        mCyan=standard(0x77f5f5,.2,.24,0x18d8f1,1.5),
        mBlue=standard(0x94bfff,.24,.2,0x2b79ee,1.2),
        mPurple=standard(0xd1a9ff,.22,.24,0x7c4bdc,1.1),
        mRose=standard(0xfac2d4,.13,.72), mLeaf=standard(0x3f8b7f,.05,.95),
        mCopper=standard(0x987a61,.55,.53);
  const glowLine=basic(0x91ffff);
  const neonBlue=basic(0x4ecff5);
  const neonGold=basic(0xe5cb91);
  const islandMat=registerM(new THREE.MeshStandardMaterial({vertexColors:true,roughness:.86,metalness:.08,flatShading:true}));
  const islandStoneMat=registerM(new THREE.MeshStandardMaterial({vertexColors:true,roughness:.94,metalness:.18,flatShading:true}));
  const qualityRoots={high:new THREE.Group(),ambient:new THREE.Group()};
  qualityRoots.high.name='High quality details'; root.add(qualityRoots.high);
  qualityRoots.ambient.name='Atmosphere';root.add(qualityRoots.ambient);
  const islands=ISLAND_DATA.map(d=>({...d})), islandMap=new Map(islands.map(d=>[d.id,d]));
  const bridges=[],beacons=[],animated=[],updrafts=[];
  const toDispose=[];
  let currentQuality='high',clock=0,sky=null,cloudGroup=null;
  const unitCube=registerG(new THREE.BoxGeometry(1,1,1));
  const unitOct=registerG(new THREE.IcosahedronGeometry(1,0));
  const unitDode=registerG(new THREE.DodecahedronGeometry(1,0));
  const unitCylinder=registerG(new THREE.CylinderGeometry(1,1,1,8));
  const unitSphere=registerG(new THREE.SphereGeometry(1,10,7));
  function add(g,mat,x=0,y=0,z=0,parent=root){const object=new THREE.Mesh(g,mat);object.position.set(x,y,z);parent.add(object);return object;}
  function box(w,h,d,mat,x,y,z,parent=root){const m=add(unitCube,mat,x,y,z,parent);m.scale.set(w,h,d);return m;}
  function cyl(rt,rb,h,mat,x,y,z,parent=root,seg=12){return add(registerG(new THREE.CylinderGeometry(rt,rb,h,seg)),mat,x,y,z,parent);}
  function cone(radius,height,mat,x,y,z,parent=root,seg=7){return add(registerG(new THREE.ConeGeometry(radius,height,seg)),mat,x,y,z,parent);}
  function ring(radius,tube,mat,x,y,z,parent=root,segments=48){const m=add(registerG(new THREE.TorusGeometry(radius,tube,5,segments)),mat,x,y,z,parent);m.rotation.x=Math.PI/2;return m;}
  function line(a,b,r,mat,parent=root){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),dir=bv.clone().sub(av);
    const obj=add(registerG(new THREE.CylinderGeometry(r,r,dir.length(),6)),mat,0,0,0,parent);
    obj.position.copy(av.add(bv).multiplyScalar(.5));obj.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());return obj;}
  function getTop(d){return d.y+.12;}
  function ridge(d,theta,k){return 1+Math.sin(theta*5+d.x*.2)*.032+Math.sin(theta*9+d.z*.11)*.021+Math.sin(theta*13+d.y)*.017;}
  function drawIsland(d){
    const seg=48,rings=7,verts=[],indices=[],colors=[];
    const base=new THREE.Color(d.hue);
    for(let j=0;j<=rings;j++){
      const u=j/rings, r=d.r*u;
      for(let s=0;s<=seg;s++){
        const a=s/seg*Math.PI*2,outer=smooth(Math.max(0,(u-.77)/.23));
        const rr=r*lerp(1,ridge(d,a,1),outer);
        verts.push(d.x+Math.cos(a)*rr,d.y+.12-(outer*1.2)+.11*Math.sin(a*7+d.y)*outer,d.z+Math.sin(a)*rr);
        const c=base.clone().lerp(new THREE.Color(u<.73?0xb2d0a8:0x778e85),u*.38);
        c.multiplyScalar(1+Math.sin(a*9+j*4)*.024);colors.push(c.r,c.g,c.b);
      }
    }
    for(let j=0;j<rings;j++)for(let s=0;s<seg;s++){
      const a=j*(seg+1)+s,b=a+seg+1;indices.push(a,a+1,b,b,a+1,b+1);
    }
    const g=registerG(new THREE.BufferGeometry());g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();add(g,islandMat);
    // Reverse stalactite stone with architectural layers and mineral strata.
    const rows=[{r:1,y:-1.04},{r:.95,y:-3.8},{r:.74,y:-8.1},{r:.59,y:-12.2},{r:.37,y:-17.5},{r:.12,y:-23.0},{r:0.02,y:-29}];
    const pv=[],pc=[],pi=[];
    for(let k=0;k<rows.length;k++)for(let s=0;s<=seg;s++){
      const a=s/seg*Math.PI*2,wave=ridge(d,a,k),rr=d.r*rows[k].r*wave;
      pv.push(d.x+Math.cos(a)*rr,d.y+rows[k].y+Math.sin(a*7+k)*.35,d.z+Math.sin(a)*rr);
      const color=new THREE.Color(0x3b596b).lerp(new THREE.Color(0x8b9391),Math.sin(k*.91+s*.3)*.16+.24);
      if(k===2||k===4)color.lerp(new THREE.Color(0x7b91a1),.24);
      pc.push(color.r,color.g,color.b);
    }
    for(let k=0;k<rows.length-1;k++)for(let s=0;s<seg;s++){
      const a=k*(seg+1)+s,b=a+seg+1;pi.push(a,b,a+1,a+1,b,b+1);
    }
    const ug=registerG(new THREE.BufferGeometry());ug.setAttribute('position',new THREE.Float32BufferAttribute(pv,3));ug.setAttribute('color',new THREE.Float32BufferAttribute(pc,3));ug.setIndex(pi);ug.computeVertexNormals();add(ug,islandStoneMat);
    ring(d.r*.93,.14,mGold,d.x,d.y-2.7,d.z);
    if(d.id!=='dock')ring(d.r*.71,.105,mCyan,d.x,d.y-9,d.z,qualityRoots.high);
    for(let n=0;n<6;n++){
      const a=n/6*Math.PI*2+.45,rd=d.r*.67;
      let blade=cone(1.55,7,mGlass,d.x+Math.cos(a)*rd,d.y-11.8,d.z+Math.sin(a)*rd,qualityRoots.high,5);
      blade.rotation.z=Math.cos(a)*.33;
    }
    // The walkable core is intentionally flat; the rims remain irregular and dangerous.
    const st=ring(d.r*.81,.07,mGold,d.x,d.y+.2,d.z,qualityRoots.high);
    st.material=mGold;
  }
  for(const d of islands)drawIsland(d);

  function makeBridge(aId,bId){
    const a=islandMap.get(aId),b=islandMap.get(bId);
    const dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz),ux=dx/d,uz=dz/d;
    const ar=a.r*.78,br=b.r*.78;
    const start={x:a.x+ux*ar,z:a.z+uz*ar,y:getTop(a)+.3};
    const end={x:b.x-ux*br,z:b.z-uz*br,y:getTop(b)+.3};
    const dv=new THREE.Vector3(end.x-start.x,end.y-start.y,end.z-start.z);
    const len=dv.length(),g=new THREE.Group();
    g.name=`Aether bridge / ${aId}-${bId}`;
    g.position.set((start.x+end.x)/2,(start.y+end.y)/2,(start.z+end.z)/2);
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),dv.normalize());
    root.add(g);
    box(5.2,.54,len,mMetal,0,0,0,g);
    box(4.36,.08,len-.65,mIvory,0,.32,0,g);
    box(.12,.08,len-.6,mCyan,-2.22,.44,0,g);
    box(.12,.08,len-.6,mCyan, 2.22,.44,0,g);
    for(let side of [-1,1]){
      box(.12,.14,len,mGold,side*2.63,.35,0,g);
      for(let j=0,n=Math.floor(len/7);j<=n;j++){
        const z=-len/2+(j/Math.max(1,n))*len;
        box(.15,1.65,.17,mMetal,side*2.67,1.06,z,g);
        box(.24,.12,.24,mCyan,side*2.67,1.91,z,g);
      }
    }
    for(let j=0,n=Math.floor(len/4);j<=n;j++){
      let z=-len/2+(j/Math.max(1,n))*len;
      box(4.8,.036,.08,mCopper,0,.38,z,g);
    }
    for(let j=1,n=Math.floor(len/22);j<=n;j++){
      const z=-len/2+j*(len/(n+1));
      box(.24,5,.24,mGold,-3.1,2.2,z,g);box(.24,5,.24,mGold,3.1,2.2,z,g);
      line([-3.1,4.55,z],[0,6.3,z],.10,mGold,g);line([0,6.3,z],[3.1,4.55,z],.10,mGold,g);
      add(unitOct,mCyan,0,6.25,z,g).scale.set(.35,.55,.35);
    }
    bridges.push({start,end,width:4.85});
  }
  BRIDGE_PAIRS.forEach(([a,b])=>makeBridge(a,b));

  // Batch details into a handful of instanced draw calls.
  const instances={trees:[],crowns:[],shrubs:[],flowers:[],flags:[],crystals:[]};
  const push=(type,x,y,z,s=1,rotation=0,color=null)=>instances[type].push({x,y,z,s,rotation,color});
  for(const d of islands){
    const n=d.kind==='garden'?42:d.kind==='orchard'?53:d.kind==='wind'?15:d.kind==='dock'?7:d.kind==='observatory'?9:12;
    for(let k=0;k<n;k++){
      const angle=(k*.618033+hash(k*11+d.x))*Math.PI*2;
      const rad=(.33+hash(k*17+d.z)*.44)*d.r;
      const x=d.x+Math.cos(angle)*rad,z=d.z+Math.sin(angle)*rad;
      const separation=(d.kind==='dock'&&Math.abs(x-d.x)<13&&Math.abs(z-d.z)<13)||
        (d.kind==='nexus'&&rad<12)||(d.kind==='observatory'&&rad<15)||
        (d.kind==='quarry'&&rad<12)||(d.kind==='power'&&rad<14);
      if(separation)continue;
      const scale=.6+hash(k*31+d.y)*.65;
      push('trees',x,d.y+1.18*scale,z,scale,hash(k)*6.28);
      push('crowns',x,d.y+2.9*scale,z,scale,hash(k*41)*6.28,
        (d.kind==='garden'||d.kind==='orchard')?(hash(k*7)>.40?0xe3a6cf:0x68c6bf):hash(k*2)>.5?0x64a68c:0x80b8a6);
    }
    for(let k=0;k<55;k++){
      const a=hash(k*20+d.x)*Math.PI*2,r=Math.sqrt(hash(k*33+d.z))*(d.r*.8);
      push('flowers',d.x+Math.cos(a)*r,d.y+.23,d.z+Math.sin(a)*r,.5+hash(k+d.y));
    }
  }
  const tempMatrix=new THREE.Matrix4(),tempQuat=new THREE.Quaternion(),tempScale=new THREE.Vector3();
  const tempPos=new THREE.Vector3(),tmpEuler=new THREE.Euler();
  function putInstances(type,g,mat,customize=null){
    const set=instances[type];if(!set.length)return;
    const mesh=new THREE.InstancedMesh(g,mat,set.length);mesh.name='Batched scenery / '+type;
    const c=new THREE.Color();
    for(let i=0;i<set.length;i++){
      const v=set[i];tempPos.set(v.x,v.y,v.z);
      tempQuat.setFromEuler(tmpEuler.set(0,v.rotation,0));
      customize?customize(v,tempScale):tempScale.setScalar(v.s);
      tempMatrix.compose(tempPos,tempQuat,tempScale);mesh.setMatrixAt(i,tempMatrix);
      if(v.color!==null){c.setHex(v.color);mesh.setColorAt(i,c);}
    }
    mesh.instanceMatrix.needsUpdate=true;
    if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    root.add(mesh);
  }
  putInstances('trees',unitCylinder,mWood,(v,out)=>out.set(.33*v.s,2.7*v.s,.33*v.s));
  const canopyMaterial=standard(0xffffff,.02,.83,0,0,true);
  putInstances('crowns',unitOct,canopyMaterial,(v,out)=>out.set(1.8*v.s,2.2*v.s,1.8*v.s));
  putInstances('flowers',unitOct,mRose,(v,out)=>out.set(.16*v.s,.29*v.s,.16*v.s));

  // Reusable architectural vocabulary: rings, fluted columns, ancient metallic joints.
  function column(x,y,z,height=5,mat=mIvory){
    cyl(.6,.85,height,mat,x,y+height/2,z);cyl(1,.96,.4,mGold,x,y+.23,z);cyl(.82,.95,.3,mGold,x,y+height-.16,z);
  }
  function lamp(x,y,z,height=4){
    cyl(.12,.22,height,mGold,x,y+height/2,z);
    const light=add(unitOct,mCyan,x,y+height+.44,z);light.scale.set(.52,.95,.52);
    add(unitOct,mGold,x,y+height+1.35,z).scale.set(.22,.35,.22);
  }
  function tower(x,y,z,height=10,r=4,roof=mGold){
    cyl(r*.88,r,height,mIvory,x,y+height/2,z,root,10);
    for(let j=0;j<6;j++){
      const a=j/6*Math.PI*2;
      box(.25,height*.75,.24,mGold,x+Math.cos(a)*r*.86,y+height*.55,z+Math.sin(a)*r*.86);
    }
    cone(r*1.18,3.8,roof,x,y+height+1.8,z,root,10);
    ring(r*.85,.13,mGold,x,y+height-.8,z);
    ring(r*.98,.13,mGold,x,y+1.8,z);
  }
  function cubicHouse(x,y,z,angle=0,color=mIvory){
    const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=angle;root.add(g);
    box(6.1,4.1,5,color,0,2.05,0,g);
    box(7,.35,5.8,mMetal,0,4.35,0,g);
    box(1.55,2.9,.1,mDark,0,1.45,-2.55,g);
    for(let side of [-1,1]){
      box(1.1,1.4,.07,mGlass,side*1.9,2.6,-2.56,g);
      box(.08,1.65,.16,mGold,side*1.9,2.6,-2.66,g);
    }
    ring(1.0,.085,mCyan,0,4.8,0,g,24);
    box(6.5,.17,.16,mGold,0,3.95,-2.58,g);
  }
  function banner(x,y,z,angle){
    const group=new THREE.Group();group.position.set(x,y,z);group.rotation.y=angle;root.add(group);
    box(.12,6,.12,mGold,0,3,0,group);
    const fabric=box(1.8,2.6,.085,mCyan,1,4.4,0,group);fabric.rotation.z=-.12;
    box(.3,.35,.1,mGold,.3,5.7,0,group);
  }
  function spinningGyro(x,y,z,r=6,parent=root){
    const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);
    const a=ring(r,.2,mGold,0,0,0,g);
    const b=ring(r*.78,.15,mCyan,0,0,0,g);b.rotation.set(Math.PI/3,.5,.35);
    const c=ring(r*.56,.13,mIvory,0,0,0,g);c.rotation.set(.4,0,1.0);
    const orb=add(unitOct,mPurple,0,0,0,g);orb.scale.set(1.8,2.8,1.8);
    animated.push({object:a,axis:'z',speed:.13});
    animated.push({object:b,axis:'y',speed:-.21});
    animated.push({object:c,axis:'x',speed:.32});
    animated.push({object:orb,axis:'y',speed:.33});
    return g;
  }

  const dock=islandMap.get('dock'),nex=islandMap.get('nexus'),gar=islandMap.get('garden'),qua=islandMap.get('quarry'),
        obs=islandMap.get('observatory'),win=islandMap.get('wind'),orc=islandMap.get('orchard'),pow=islandMap.get('power');
  // Harbor: hangar, control tower, landing trusses and skiff access.
  box(27,.9,15,mMetal,dock.x,dock.y+.3,dock.z+1.5);
  for(let n of [-1,1]){
    box(2,6,15,mIvory,n*13,dock.y+3,dock.z+1.5);
    box(.75,1.6,17,mGold,n*12.6,dock.y+6,dock.z+1.5);
    for(let z of [-4,1,6])lamp(n*17,dock.y,dock.z+z,3.8);
  }
  box(15,.35,11,mDark,0,dock.y+.85,dock.z+1.5);
  for(let z=-4;z<=6;z+=2.1){box(20,.065,.13,mCyan,0,dock.y+1.06,dock.z+z);}
  tower(-15,dock.y,dock.z-11,9,3.3);
  banner(14,dock.y,dock.z-8,.2);
  const jetDock=new THREE.Vector3(9,dock.y+3.1,dock.z-3);
  // Nexus: navigational circular plaza and ancient map of islands.
  cyl(12,13,1.1,mIvory,nex.x,nex.y+.56,nex.z,root,32);
  ring(10.7,.26,mGold,nex.x,nex.y+1.18,nex.z,root,48);
  ring(7.3,.13,mCyan,nex.x,nex.y+1.16,nex.z,root,48);
  for(let k=0;k<8;k++){
    const a=k*Math.PI/4;
    column(nex.x+Math.cos(a)*16,nex.y,nex.z+Math.sin(a)*16,6);
    lamp(nex.x+Math.cos(a)*17,nex.y,nex.z+Math.sin(a)*17,3.6);
  }
  const nexusCore=add(unitOct,mCyan,0,nex.y+5,0);nexusCore.scale.set(2.4,3.9,2.4);
  animated.push({object:nexusCore,axis:'y',speed:.2,bob:.35,baseY:nex.y+5});
  spinningGyro(0,nex.y+9,0,3.6);
  // Garden: terraces, blossom canopy, greenhouse and emissive water-like stripes.
  cyl(9.3,10.2,.7,mIvory,gar.x+4,gar.y+.38,gar.z-3,root,24);
  const greenhouse=add(registerG(new THREE.SphereGeometry(7.8,12,8,0,Math.PI*2,0,Math.PI*.5)),mGlass,gar.x+4,gar.y+.45,gar.z-3);
  greenhouse.scale.y=.75;
  for(let a=0;a<6;a++){
    const theta=a*Math.PI/3;
    column(gar.x+Math.cos(theta)*9.5,gar.y,gar.z-3+Math.sin(theta)*9.5,4.9);
  }
  ring(11.8,.13,mRose,gar.x,gar.y+.2,gar.z,qualityRoots.high);
  for(let k=0;k<12;k++){
    const a=k*Math.PI/6;
    const p=add(unitOct,k%3===0?mPurple:mRose,gar.x+Math.cos(a)*17,gar.y+2.3,gar.z+Math.sin(a)*17);
    p.scale.set(.5,1.15,.5);animated.push({object:p,axis:'y',speed:.18+k*.013,bob:.34,baseY:gar.y+2.3});
  }
  // Quarry: mined crystals, loading cranes and immense ring-shaped vein.
  for(let k=0;k<20;k++){
    const a=hash(k*17)*6.283,r=8+hash(k*29)*11;
    const x=qua.x+Math.cos(a)*r,z=qua.z+Math.sin(a)*r;
    const crystal=cone(1.2+hash(k*23)*1.4,4+hash(k*61)*7,k%3?mCyan:mBlue,x,qua.y+2.5+hash(k*61)*2,z,root,5);
    crystal.rotation.z=.14*Math.sin(k*2);
  }
  for(const side of [-1,1]){
    box(1.15,11,1.15,mMetal,qua.x+side*12,qua.y+5.5,qua.z+5);
    box(13,.55,.85,mGold,qua.x+side*6,qua.y+10.8,qua.z+5);
    line([qua.x+side*4,qua.y+10.5,qua.z+5],[qua.x+side*4,qua.y+3.5,qua.z+5],.11,mDark);
  }
  spinningGyro(qua.x+3,qua.y+9,qua.z-2,5.4);
  // Observatory: colossal orrery suspended above a small temple; endgame portal.
  for(let k=0;k<6;k++){
    const a=k*Math.PI/3;
    column(obs.x+Math.cos(a)*17,obs.y,obs.z+Math.sin(a)*17,9);
    line([obs.x+Math.cos(a)*17,obs.y+9,obs.z+Math.sin(a)*17],
      [obs.x+Math.cos(a+.52)*17,obs.y+9,obs.z+Math.sin(a+.52)*17],.31,mGold);
  }
  cyl(10.2,11.3,2,mStoneBright,obs.x,obs.y+1,obs.z,root,20);
  for(let k=0;k<8;k++){
    const a=k*Math.PI/4;box(1.4,5,.5,mGold,obs.x+Math.cos(a)*9,obs.y+4,obs.z+Math.sin(a)*9);
  }
  spinningGyro(obs.x,obs.y+18,obs.z,9);
  const portal=new THREE.Group();portal.position.set(obs.x,obs.y+7,obs.z+15);root.add(portal);
  const portOuter=ring(5.1,.35,mGold,0,0,0,portal);portOuter.rotation.set(0,0,0);
  const portInner=ring(4.4,.18,mCyan,0,0,0,portal);portInner.rotation.set(0,0,0);
  const portCenter=add(unitOct,mPurple,0,0,0,portal);portCenter.scale.set(.95,2.4,.95);
  portal.rotation.y=Math.PI/4;
  animated.push({object:portInner,axis:'z',speed:.19});
  const portalReadyMaterial=registerM(new THREE.MeshBasicMaterial({color:0x72f5ff,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
  const portalPlane=add(registerG(new THREE.CircleGeometry(4.18,48)),portalReadyMaterial,0,0,-.08,portal);
  // Windward village: real rotating wind turbines and small inhabitable-looking streets.
  cubicHouse(win.x+4,win.y,win.z+7,-.24);
  cubicHouse(win.x-9,win.y,win.z+1,.5,mStoneBright);
  cubicHouse(win.x+7,win.y,win.z-11,-.46);
  const windRotors=[];
  for(let i=0;i<3;i++){
    const x=win.x+[-15,0,13][i],z=win.z+[-12,-19,11][i],y=win.y;
    cyl(.58,.94,13,mIvory,x,y+6.5,z);
    const rotor=new THREE.Group();rotor.position.set(x,y+13,z-1.1);root.add(rotor);
    cyl(1.15,.95,1.3,mMetal,0,0,0,rotor).rotation.x=Math.PI/2;
    for(let b=0;b<3;b++){
      const a=b*2*Math.PI/3,blade=box(1.25,5.6,.34,mIvory,Math.sin(a)*2.95,Math.cos(a)*2.95,0,rotor);
      blade.rotation.z=-a;box(.21,4.1,.15,mGold,Math.sin(a)*3.15,Math.cos(a)*3.15,-.21,rotor).rotation.z=-a;
    }
    windRotors.push(rotor);
  }
  // Orchard: hanging seed vault, terraced farming beds and little lanterns.
  for(let k=0;k<5;k++){
    const a=k*Math.PI*2/5;
    const x=orc.x+Math.cos(a)*11,z=orc.z+Math.sin(a)*11;
    box(4.2,.5,9,mWood,x,orc.y+.29,z).rotation.y=a;
    for(let n=0;n<5;n++){
      const p=add(unitOct,(n+k)%2?mRose:mPurple,x+Math.cos(a+.9)*(n-2)*1.35,orc.y+1.2,z+Math.sin(a+.9)*(n-2)*1.35);
      p.scale.set(.45,.8,.45);
    }
  }
  tower(orc.x+3,orc.y,orc.z,9,3.7,mCopper);
  for(let k=0;k<7;k++){
    const a=k*6.28/7;lamp(orc.x+Math.cos(a)*19,orc.y,orc.z+Math.sin(a)*19,3.7);
  }
  // Reactor: glyph pillars and concentric moving regulator rings.
  cyl(11.2,12.3,1.45,mMetal,pow.x,pow.y+.725,pow.z,root,24);
  for(let k=0;k<8;k++){
    const a=k*Math.PI/4;
    cyl(.7,1.15,6.8,mIvory,pow.x+Math.cos(a)*13.5,pow.y+3.4,pow.z+Math.sin(a)*13.5);
    const cap=add(unitOct,mPurple,pow.x+Math.cos(a)*13.5,pow.y+7,pow.z+Math.sin(a)*13.5);cap.scale.set(.5,.85,.5);
  }
  spinningGyro(pow.x,pow.y+10,pow.z,7.5);
  box(7,4,6,mDark,pow.x-9,pow.y+2,pow.z+11);
  ring(14,.19,mCyan,pow.x,pow.y+1.6,pow.z);

  // Updrafts: visualized columns that can boost airborne player in demo.
  function makeUpdraft(d,offsetX,offsetZ){
    const x=d.x+offsetX,z=d.z+offsetZ,bottom=d.y;
    const g=new THREE.Group();g.position.set(x,bottom+1,z);root.add(g);
    for(let j=0;j<4;j++){
      const rr=3.3+j*.24;
      const r=ring(rr,.105,mCyan,0,j*2.1,0,g);r.rotation.x=Math.PI*.5-.08*j;
      animated.push({object:r,axis:'y',speed:(j%2?-1:1)*(.18+j*.06),bob:.37,baseY:j*2.1});
    }
    const core=add(unitOct,mBlue,0,2.2,0,g);core.scale.set(.58,1.3,.58);
    animated.push({object:core,axis:'y',speed:.8,bob:.46,baseY:2.2});
    updrafts.push({x,z,y:bottom,radius:3.8,height:19,name:'上昇気流'});
  }
  makeUpdraft(gar,-15,-4); makeUpdraft(qua,-13,3);makeUpdraft(win,15,1);

  // Five discoverable beacon shrines, all interactable on foot / after dismounting.
  const BEACON_OFFSETS={garden:[0,14],quarry:[0,-11],wind:[-2,12],orchard:[-13,-7],power:[0,-14]};
  function createBeacon(d){
    const [ox,oz]=BEACON_OFFSETS[d.id]; const x=d.x+ox,z=d.z+oz,y=d.y;
    cyl(2.4,2.8,.75,mStoneBright,x,y+.38,z,root,12);
    for(let k=0;k<4;k++){
      const a=k*Math.PI/2;
      column(x+Math.cos(a)*2.15,y,z+Math.sin(a)*2.15,2.7,mGold);
    }
    const crown=add(unitOct,mBlue,x,y+3.7,z);crown.scale.set(.95,1.7,.95);
    const halo=ring(1.65,.15,mGold,x,y+4.1,z);
    animated.push({object:crown,axis:'y',speed:.28,bob:.3,baseY:y+3.7});
    const energy=add(unitOct,mCyan,x,y+6.0,z);energy.scale.set(.26,.48,.26);
    energy.visible=false;
    beacons.push({id:d.id,name:d.name,x,y:y+.15,z,active:false,crown,halo,energy});
  }
  BEACON_ISLANDS.forEach(id=>createBeacon(islandMap.get(id)));

  // Airy cloudscape: instanced geometry = minimal draw calls and no overdraw-heavy sprite billboards.
  const cloudMat=registerM(new THREE.MeshBasicMaterial({color:0xdceffe,transparent:true,opacity:.29,depthWrite:false,blending:THREE.NormalBlending}));
  const cloudGeometry=registerG(new THREE.SphereGeometry(1,8,5));
  cloudGroup=new THREE.Group();cloudGroup.name='Distant cloud stratum';qualityRoots.ambient.add(cloudGroup);
  const cloudCount=180;const cloudMesh=new THREE.InstancedMesh(cloudGeometry,cloudMat,cloudCount);
  for(let i=0;i<cloudCount;i++){
    const ang=hash(i*5.3)*Math.PI*2,dist=26+Math.sqrt(hash(i*9.9))*340;
    const height=-18+hash(i*13)*18,cs=4.5+hash(i*19)*8;
    tempPos.set(Math.sin(ang)*dist,height,Math.cos(ang)*dist);
    tempScale.set(cs*(1.1+hash(i*23)),cs*.28,cs*.73);
    tempQuat.setFromEuler(tmpEuler.set(0,hash(i*7)*Math.PI*2,0));
    tempMatrix.compose(tempPos,tempQuat,tempScale);cloudMesh.setMatrixAt(i,tempMatrix);
  }
  cloudMesh.instanceMatrix.needsUpdate=true;cloudGroup.add(cloudMesh);
  // A second, softer low-volume cloud deck sits beneath the entire archipelago.
  const mist=add(registerG(new THREE.PlaneGeometry(1200,1200)),registerM(new THREE.MeshBasicMaterial({
    color:0xc2ddf1,transparent:true,opacity:.2,depthWrite:false,side:THREE.DoubleSide
  })),0,-30,0,qualityRoots.high);mist.rotation.x=-Math.PI/2;
  // Background islands are deliberately non-walkable; save geometry with primitive silhouettes.
  for(let j=0;j<18;j++){
    const a=j*2.3999,dist=210+hash(j*15)*160,x=Math.sin(a)*dist,z=Math.cos(a)*dist,y=18+hash(j*19)*95;
    const group=j%3===0?root:qualityRoots.high;
    let top=add(registerG(new THREE.CylinderGeometry(9+hash(j)*13,5+hash(j)*4,3,7)),mStoneBright,x,y,z,group);
    let bottom=cone(10+hash(j)*12,16+hash(j*7)*20,mStone,x,y-9-hash(j*7)*5,z,group,7);bottom.rotation.z=.04;
    const m=add(unitOct,j%2?mPurple:mCyan,x,y+6,z,group);m.scale.set(1.8,4.1,1.8);
  }

  if(options.includeSky!==false){
    const skyMat=registerM(new THREE.ShaderMaterial({
      side:THREE.BackSide,depthWrite:false,fog:false,
      vertexShader:`varying vec3 vDirection;void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`varying vec3 vDirection;void main(){vec3 d=normalize(vDirection);float h=d.y;vec3 deep=vec3(.12,.24,.42);vec3 mid=vec3(.42,.66,.81);vec3 horizon=vec3(.78,.88,.93);vec3 low=vec3(.86,.83,.89);vec3 col=mix(horizon,mid,smoothstep(.00,.46,h));col=mix(col,deep,smoothstep(.47,1.0,h));col=mix(low,col,smoothstep(-.3,.12,h));float sun=pow(max(dot(d,normalize(vec3(-.62,.17,-.54))),0.),24.);col+=vec3(.32,.18,.09)*sun;gl_FragColor=vec4(col,1.);}`
    }));
    sky=add(registerG(new THREE.SphereGeometry(880,24,16)),skyMat,0,0,0);
    sky.renderOrder=-200;
  }

  // Walkable architectural decks and simple collision footprints.
  // Both are optional helpers. Integration teams may replace them with their physics engine.
  const extraSurfaces=[
    {type:'rect',x:dock.x,z:dock.z+1.5,w:27,d:15,top:dock.y+.75},
    {type:'circle',x:nex.x,z:nex.z,r:12,top:nex.y+1.11},
    {type:'circle',x:gar.x+4,z:gar.z-3,r:9.3,top:gar.y+.73},
    {type:'circle',x:obs.x,z:obs.z,r:10.2,top:obs.y+2},
    {type:'circle',x:pow.x,z:pow.z,r:11.2,top:pow.y+1.45},
  ];
  for(const b of beacons)extraSurfaces.push({type:'circle',x:b.x,z:b.z,r:2.4,top:b.y+.63});
  const obstacles=[
    {x:win.x+4,z:win.z+7,r:3.8,y:win.y,h:4.5},
    {x:win.x-9,z:win.z+1,r:3.8,y:win.y,h:4.5},
    {x:win.x+7,z:win.z-11,r:3.8,y:win.y,h:4.5},
    {x:orc.x+3,z:orc.z,r:3.1,y:orc.y,h:10},
    {x:dock.x-15,z:dock.z-11,r:2.9,y:dock.y,h:9},
    {x:pow.x-9,z:pow.z+11,r:4.2,y:pow.y,h:4.5},
  ];
  function resolveFootCollision(position,radius=.45){
    for(const o of obstacles){
      if(position.y>o.y+o.h+.35||position.y<o.y-.75)continue;
      let dx=position.x-o.x,dz=position.z-o.z,dist=Math.hypot(dx,dz),minDist=o.r+radius;
      if(dist<minDist){
        if(dist<.0001){dx=1;dz=0;dist=1;}
        position.x=o.x+dx/dist*minDist;position.z=o.z+dz/dist*minDist;
      }
    }
    return position;
  }
  // Data-facing functions. No renderer, camera, or global scene is created here.
  function sampleGround(x,z,currentFeetY=Infinity){
    let ground=-Infinity,source=null;
    for(const d of islands){
      const distance=Math.hypot(x-d.x,z-d.z);
      if(distance<d.r*.79){
        const height=d.y+.12;
        if(height<=currentFeetY+1.8 && height>ground){ground=height;source='island';}
      }
    }
    for(const platform of extraSurfaces){
      const inside=platform.type==='circle'?Math.hypot(x-platform.x,z-platform.z)<platform.r:
        Math.abs(x-platform.x)<platform.w/2&&Math.abs(z-platform.z)<platform.d/2;
      if(inside&&platform.top<=currentFeetY+1.8&&platform.top>ground){ground=platform.top;source='platform';}
    }
    for(const b of bridges){
      const dx=b.end.x-b.start.x,dz=b.end.z-b.start.z,d2=dx*dx+dz*dz;
      const t=((x-b.start.x)*dx+(z-b.start.z)*dz)/d2;
      if(t<-.035||t>1.035)continue;
      const px=b.start.x+dx*t,pz=b.start.z+dz*t;
      if(Math.hypot(x-px,z-pz)>b.width*.5)continue;
      const height=lerp(b.start.y,b.end.y,t)+.27;
      if(height<=currentFeetY+1.8&&height>ground){ground=height;source='bridge';}
    }
    return Number.isFinite(ground)?{height:ground,source}:null;
  }
  function closestBeacon(pos,maxRange=6.5){
    let best=null,dist=maxRange;
    for(const b of beacons){if(b.active)continue;
      const dd=Math.hypot(pos.x-b.x,pos.y-b.y,pos.z-b.z);
      if(dd<dist){dist=dd;best=b;}}
    return best;
  }
  function activateBeacon(id){
    const b=beacons.find(v=>v.id===id);
    if(!b||b.active)return false;
    b.active=true;b.crown.material=mCyan;b.energy.visible=true;b.halo.material=mCyan;
    return true;
  }
  function activatedCount(){return beacons.filter(b=>b.active).length;}
  function getUpdraft(pos){
    for(const a of updrafts){
      if(Math.hypot(pos.x-a.x,pos.z-a.z)<a.radius&&pos.y>a.y-1&&pos.y<a.y+a.height)return a;
    }
    return null;
  }
  function update(dt=0,context={}){
    if(!Number.isFinite(dt)||dt<0)return;
    const delta=Math.min(dt,.07);clock+=delta;
    for(const a of animated){
      if(a.axis)a.object.rotation[a.axis]+=delta*a.speed;
      if(a.bob!==undefined)a.object.position.y=a.baseY+Math.sin(clock*1.75+a.speed*9)*a.bob;
    }
    for(let i=0;i<windRotors.length;i++)windRotors[i].rotation.z+=delta*(.7+i*.18);
    if(cloudGroup)cloudGroup.position.x=Math.sin(clock*.008)*13;
    const count=activatedCount();
    portalReadyMaterial.opacity=count===beacons.length ? .27+Math.sin(clock*2.2)*.09 : 0;
    portalPlane.visible=count===beacons.length;
    portInner.rotation.z+=delta*.19;
    for(const b of beacons){if(b.active)b.energy.rotation.y+=delta*.52;}
  }
  // Static geometry bake: combines decorative meshes sharing a material. With hundreds of
  // small rails, doors and structural details this drastically reduces GPU draw calls.
  // Skips all changing/translucent/instanced objects, preserves high-quality visibility.
  function bakeStaticBatches(){
    if(typeof root.updateMatrixWorld!=='function')return; // allows headless interface tests
    root.updateMatrixWorld(true);
    const protectedMeshes=new Set(animated.map(a=>a.object));
    protectedMeshes.add(nexusCore);protectedMeshes.add(portalPlane);
    for(const b of beacons){protectedMeshes.add(b.crown);protectedMeshes.add(b.halo);protectedMeshes.add(b.energy);}
    const dynamicGroups=new Set([portal,...windRotors]);
    const buckets=new Map();
    function visit(object,qualityScope='base',insideDynamic=false){
      const scope=object===qualityRoots.high?'high':object===qualityRoots.ambient?'ambient':qualityScope;
      const dynamic=insideDynamic||dynamicGroups.has(object);
      const material=object.material,geo=object.geometry;
      if(object.isMesh&&!object.isInstancedMesh&&!dynamic&&!protectedMeshes.has(object)&&
        material&&!Array.isArray(material)&&!material.transparent&&!material.isShaderMaterial&&
        material!==islandMat&&material!==islandStoneMat&&geo?.attributes?.position&&geo.attributes.normal){
        const key=scope+'|'+material.uuid;
        if(!buckets.has(key))buckets.set(key,{scope,material,meshes:[]});
        buckets.get(key).meshes.push(object);
      }
      for(const c of object.children)visit(c,scope,dynamic);
    }
    visit(root);
    for(const batch of buckets.values()){
      if(batch.meshes.length<2)continue;
      const geometries=[],counts=[];let vCount=0,iCount=0,hasUV=true;
      for(const mesh of batch.meshes){
        const baked=mesh.geometry.clone();baked.applyMatrix4(mesh.matrixWorld);
        const count=baked.attributes.position.count;
        geometries.push(baked);counts.push(count);
        vCount+=count;iCount+=baked.index?baked.index.count:count;
        if(!baked.attributes.uv)hasUV=false;
      }
      const positions=new Float32Array(vCount*3),normals=new Float32Array(vCount*3),uvs=hasUV?new Float32Array(vCount*2):null;
      const indices=new Uint32Array(iCount);
      let vi=0,ii=0;
      for(let k=0;k<geometries.length;k++){
        const g=geometries[k],p=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv;
        for(let j=0;j<p.count;j++){
          const at=(vi+j)*3;
          positions[at]=p.getX(j);positions[at+1]=p.getY(j);positions[at+2]=p.getZ(j);
          normals[at]=n.getX(j);normals[at+1]=n.getY(j);normals[at+2]=n.getZ(j);
          if(uvs){uvs[(vi+j)*2]=u.getX(j);uvs[(vi+j)*2+1]=u.getY(j);}
        }
        const index=g.index;
        if(index){for(let j=0;j<index.count;j++)indices[ii++]=vi+index.getX(j);}
        else {for(let j=0;j<p.count;j++)indices[ii++]=vi+j;}
        vi+=p.count;g.dispose();
      }
      const combined=registerG(new THREE.BufferGeometry());
      combined.setAttribute('position',new THREE.BufferAttribute(positions,3));
      combined.setAttribute('normal',new THREE.BufferAttribute(normals,3));
      if(uvs)combined.setAttribute('uv',new THREE.BufferAttribute(uvs,2));
      combined.setIndex(new THREE.BufferAttribute(indices,1));combined.computeBoundingSphere();
      const merged=new THREE.Mesh(combined,batch.material);
      merged.name=`AF03 / baked ${batch.scope} scenery x${batch.meshes.length}`;
      for(const original of batch.meshes)original.parent.remove(original);
      (batch.scope==='high'?qualityRoots.high:batch.scope==='ambient'?qualityRoots.ambient:root).add(merged);
    }
  }
  function setQuality(mode){
    currentQuality=mode==='low'||mode==='lite'?'low':'high';
    qualityRoots.high.visible=currentQuality==='high';
    cloudMat.opacity=currentQuality==='high'?.29:.18;
    cloudMesh.count=currentQuality==='high'?cloudCount:85;
    return currentQuality;
  }
  function dispose(){
    for(const child of [...root.children])root.remove(child);
    for(const g of resources.geometries)g.dispose();
    for(const m of resources.materials)m.dispose();
    resources.geometries.clear();resources.materials.clear();
    bridges.length=0;beacons.length=0;animated.length=0;updrafts.length=0;
  }
  if(options.bakeStatic!==false)bakeStaticBatches();
  setQuality(options.quality||'high');
  const metadata={name:'Skyward Archipelago',version:'1.0.0',team:'03',units:'meter',upAxis:'Y',forward:'-Z',
    bounds:{radius:430,minY:-35,maxY:150},spawn:{x:4,y:dock.y+.12,z:dock.z-8},
    skiffSpawn:{x:jetDock.x,y:jetDock.y,z:jetDock.z},islands:islands.map(({id,name,subtitle,x,y,z,r})=>({id,name,subtitle,x,y,z,r})),
    beaconIds:[...BEACON_ISLANDS],bridges:BRIDGE_PAIRS.map(pair=>[...pair])};
  return {root,update,setQuality,dispose,metadata,sampleGround,resolveFootCollision,closestBeacon,activateBeacon,activatedCount,getUpdraft,
    getBeacons:()=>beacons.map(({id,name,x,y,z,active})=>({id,name,x,y,z,active})),getQuality:()=>currentQuality};
}
