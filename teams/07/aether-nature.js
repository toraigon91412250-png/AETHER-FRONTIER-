/**
 * AETHER FRONTIER / No.07  |  STARVEIN WILDS : 星脈の大地
 * Three.js r160 / Y-up, forward -Z, 1 unit ~= 1 metre.
 * Independent of camera, renderer, scene and input. No build or assets required.
 *
 *   import { createAetherModule } from './aether-nature.js';
 *   const zone = createAetherModule(THREE, { quality: 'low' });
 *   scene.add(zone.root);
 *   zone.update(dt, { playerPosition: player.position });
 *   zone.setQuality('high');
 *   zone.dispose();
 */
export function createAetherModule(THREE, options = {}) {
  const root = new THREE.Group();
  root.name = 'AF07_STARVEIN_WILDS';
  root.userData.moduleId = '07';
  root.userData.zoneName = '星脈の大地';
  const size = 720, half = size / 2;
  const qualityDefault = options.quality === 'high' ? 'high' : 'low';
  let quality = qualityDefault, clock = 0, disposed = false;
  const disposables = new Set();
  const mats = new Set();
  const geo = g => (disposables.add(g), g);
  const mat = m => (mats.add(m), m);
  const seed=(options.seed ?? 73017) >>> 0;
  const seeded = offset => { let s=(seed+offset)>>>0;return () => ((s = (1664525 * s + 1013904223) >>> 0) / 4294967296); };
  const rnd=seeded(0);
  const smooth = (a,b,x) => { const t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); };
  const mix = (a,b,t) => a + (b-a)*t;
  const hash = (x,z) => { let n=Math.imul(x, 374761393)+Math.imul(z,668265263)+1013904223; n=Math.imul(n ^ (n>>>13),1274126177); return ((n^(n>>>16))>>>0)/4294967295; };
  function noise(x,z) { const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz; const u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz); return mix(mix(hash(ix,iz),hash(ix+1,iz),u),mix(hash(ix,iz+1),hash(ix+1,iz+1),u),v)*2-1; }
  function fbm(x,z) { return 0.53*noise(x,z) + 0.28*noise(x*2.03,z*2.03) + 0.14*noise(x*4.07,z*4.07) + 0.05*noise(x*8.01,z*8.01); }
  const canyonX = z => 27 + 20*Math.sin(z*.010);
  function terrainHeight(x,z) {
    const n = 5.3*fbm(x*.009,z*.009)+2.2*fbm(x*.032,z*.032);
    const edge = smooth(232,351,Math.max(Math.abs(x),Math.abs(z)));
    const mountains = 33*edge*(.72+.28*noise(x*.014,z*.014));
    const hill = 8.0*Math.exp(-(((x-175)/135)**2 + ((z-78)/130)**2))* (.58+.42*noise(x*.028,z*.028));
    const lakeD = Math.hypot((x+148)/103,(z+80)/89);
    const lake = -16.0*(1-smooth(.50,1.18,lakeD));
    const canyonLength = 1-smooth(-95,-32,z); // 1 north of -95, 0 south of -32
    const canyonWidth = Math.abs(x-canyonX(z));
    const ravine = -27*(1-smooth(13,39,canyonWidth))*canyonLength;
    const walls = 6.5*(smooth(13,41,canyonWidth)-smooth(43,78,canyonWidth))*canyonLength;
    const bridgeApproach = Math.exp(-(((z+164)/13)**2)) * smooth(27,48,canyonWidth);
    const base = n + mountains + hill + lake + ravine + walls;
    return mix(base,4.8,bridgeApproach*.92);
  }
  function surfaceHeight(x,z) {
    let h=terrainHeight(x,z);
    const d=Math.hypot((x+148)/103,(z+80)/89);
    if (d<.84) h=Math.max(h,-2.05);
    if (Math.abs(z+164)<5.5 && x>-44 && x<93) h=Math.max(h,5.12);
    return h;
  }
  function groundColor(x,z,h) {
    const forest = smooth(0,115,x)*(.6+.4*(1-smooth(80,240,z)));
    const desert = (1-smooth(-140,-65,z))*(1-smooth(-30,160,Math.abs(x-25)));
    const rockiness = Math.max(smooth(13,35,h),desert*.7);
    const grass = new THREE.Color(0x365f56).lerp(new THREE.Color(0x619276),Math.min(.8,.32+.3*noise(x*.035,z*.035)));
    grass.lerp(new THREE.Color(0x1f594f),forest*.63);
    grass.lerp(new THREE.Color(0x997c6e),desert*.8);
    grass.lerp(new THREE.Color(0x888d91),rockiness*.8);
    if(h>30) grass.lerp(new THREE.Color(0xc0c6c3),smooth(30,47,h)*.65);
    const lakeD=Math.hypot((x+148)/103,(z+80)/89);
    if(lakeD<1.2) grass.lerp(new THREE.Color(0x687b77),.36*(1-smooth(.86,1.2,lakeD)));
    grass.multiplyScalar(.89+.20*noise(x*.09,z*.09));
    return grass;
  }
  // Both resolutions remain local to this module and are switched without recreating the world.
  const terrainLayers = new THREE.Group(); terrainLayers.name='Ground LODs'; root.add(terrainLayers);
  const terrainMat=mat(new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:.03,flatShading:false,side:THREE.DoubleSide}));
  function createTerrain(segments) {
    const g=geo(new THREE.PlaneGeometry(size,size,segments,segments)); g.rotateX(-Math.PI/2);
    const p=g.attributes.position, colors=new Float32Array(p.count*3);
    const col = new THREE.Color();
    for(let i=0;i<p.count;i++) {
      const x=p.getX(i),z=p.getZ(i),h=terrainHeight(x,z); p.setY(i,h);
      col.copy(groundColor(x,z,h)); colors[i*3]=col.r;colors[i*3+1]=col.g;colors[i*3+2]=col.b;
    }
    g.setAttribute('color',new THREE.BufferAttribute(colors,3)); g.computeVertexNormals();
    const m=new THREE.Mesh(g,terrainMat); m.name='Terrain '+segments; m.receiveShadow=true;
    return m;
  }
  const groundLow=createTerrain(124), groundHigh=createTerrain(224); terrainLayers.add(groundLow,groundHigh);
  // Shared rock, crystal, metal and wood palette.
  const rockMat=mat(new THREE.MeshStandardMaterial({color:0x6b777c,roughness:.91,metalness:.06,flatShading:true}));
  const darkRockMat=mat(new THREE.MeshStandardMaterial({color:0x344e5b,roughness:.96,flatShading:true}));
  const stoneMat=mat(new THREE.MeshStandardMaterial({color:0x697f83,roughness:.83,metalness:.16,flatShading:true}));
  const oldGold=mat(new THREE.MeshStandardMaterial({color:0xab9474,metalness:.74,roughness:.37}));
  const bronze=mat(new THREE.MeshStandardMaterial({color:0x263d47,metalness:.77,roughness:.31}));
  const glow=mat(new THREE.MeshBasicMaterial({color:0x65f4e2,toneMapped:false}));
  const glowBlue=mat(new THREE.MeshBasicMaterial({color:0x59bfff,toneMapped:false}));
  const glowAmber=mat(new THREE.MeshBasicMaterial({color:0xffd18d,toneMapped:false}));
  const crystalMat=mat(new THREE.MeshStandardMaterial({color:0x74e6ef,emissive:0x138e9d,emissiveIntensity:1.65,roughness:.18,metalness:.23,flatShading:true}));
  const stumpMat=mat(new THREE.MeshStandardMaterial({color:0x3a3a3e,roughness:1}));
  const leafMat=mat(new THREE.MeshStandardMaterial({color:0x32695c,roughness:1,flatShading:true}));
  const leafLight=mat(new THREE.MeshStandardMaterial({color:0x519381,roughness:1,flatShading:true}));
  const leafDark=mat(new THREE.MeshStandardMaterial({color:0x214b54,roughness:1,flatShading:true}));
  function mesh(geometry,material,parent=root, name) { const m=new THREE.Mesh(geometry,material);if(name)m.name=name;parent.add(m);return m; }
  const cylinder = geo(new THREE.CylinderGeometry(1,1,1,8));
  const cube = geo(new THREE.BoxGeometry(1,1,1));
  const ico = geo(new THREE.IcosahedronGeometry(1,0));
  const sphere=geo(new THREE.SphereGeometry(1,12,8));
  const octa=geo(new THREE.OctahedronGeometry(1,0));
  const ringGeom=geo(new THREE.TorusGeometry(1,.045,6,64));
  function beam(parent, a,b,r, material, sides=8) {
    const p1=new THREE.Vector3(...a),p2=new THREE.Vector3(...b),v=p2.clone().sub(p1);
    const m=mesh(cylinder,material,parent);m.position.copy(p1).add(p2).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.clone().normalize());m.scale.set(r,v.length(),r);return m;
  }
  function block(parent,pos,scale,material,rotation=0) { const m=mesh(cube,material,parent);m.position.set(...pos);m.scale.set(...scale);m.rotation.y=rotation;return m; }
  function orb(parent,pos,scale,material) {const m=mesh(sphere,material,parent);m.position.set(...pos);m.scale.setScalar(scale);return m;}
  // Instanced vegetation: a small number of draw calls even in the high detail mode.
  const lodLow=new THREE.Group(),lodHigh=new THREE.Group();root.add(lodLow,lodHigh);
  const trunkGeo=geo(new THREE.CylinderGeometry(.24,.42,1,5));
  const pineGeo=geo(new THREE.ConeGeometry(1,1,7));
  const crownGeo=geo(new THREE.IcosahedronGeometry(1,1));
  const tuftsGeo=geo(new THREE.ConeGeometry(1,1,3));
  const leafVariants=[leafMat,leafLight,leafDark];
  const helper=new THREE.Object3D();
  function createInstanceBatch(parent,geom,material,transforms,name) {
    const inst=new THREE.InstancedMesh(geom,material,transforms.length); inst.name=name;inst.frustumCulled=false;
    transforms.forEach((t,i)=>{ helper.position.set(t.x,t.y,t.z);helper.rotation.set(0,t.ry||0,0);helper.scale.set(t.sx,t.sy,t.sz);helper.updateMatrix();inst.setMatrixAt(i,helper.matrix); });
    inst.instanceMatrix.needsUpdate=true; parent.add(inst);return inst;
  }
  function canPlant(x,z) {
    const dLake=Math.hypot((x+148)/103,(z+80)/89);
    if(dLake<1.16) return false;
    if(z<-96 && Math.abs(x-canyonX(z))<44) return false;
    if(Math.hypot(x,z-12)<46) return false;
    if(Math.hypot(x-87,z-160)<49 || Math.hypot(x-165,z+182)<28) return false;
    if(Math.hypot(x+175,z-170)<33 || Math.hypot(x-183,z+10)<34) return false;
    return true;
  }
  function makeVegetation(parent, count, grassCount) {
    const rand=seeded(7007);
    const trunk=[],cones1=[],cones2=[],crowns=[[],[],[]],grass=[];
    for(let i=0;i<count;i++) {
      const x=mix(-317,317,rand()),z=mix(-310,316,rand());
      const forest=(.4+.6*smooth(-105,155,x))*(.73+.27*smooth(160,-70,z));
      if(rand()>.36+forest*.55 || !canPlant(x,z)) continue;
      const y=terrainHeight(x,z),h=(3.4+rand()*6.9)*(1+.27*forest),wide=.77+rand()*.78,ry=rand()*Math.PI*2;
      if(rand()<.66) {
        trunk.push({x,y:y+h*.22,z,sx:wide*.29,sy:h*.44,sz:wide*.29,ry});
        cones1.push({x,y:y+h*.59,z,sx:wide*1.7,sy:h*.77,sz:wide*1.7,ry});
        cones2.push({x,y:y+h*.85,z,sx:wide*1.10,sy:h*.47,sz:wide*1.10,ry:ry+.24});
      } else {
        trunk.push({x,y:y+h*.27,z,sx:wide*.38,sy:h*.54,sz:wide*.38,ry});
        crowns[Math.floor(rand()*3)].push({x,y:y+h*.79,z,sx:wide*2.25,sy:h*.30,sz:wide*2.3,ry});
      }
    }
    createInstanceBatch(parent,trunkGeo,stumpMat,trunk,'Forest / trunks');
    createInstanceBatch(parent,pineGeo,leafDark,cones1,'Forest / lower pine crowns');
    createInstanceBatch(parent,pineGeo,leafLight,cones2,'Forest / upper pine crowns');
    crowns.forEach((c,i)=>createInstanceBatch(parent,crownGeo,leafVariants[i],c,'Forest / leaf canopy '+i));
    for(let i=0;i<grassCount;i++) {
      const x=mix(-325,325,rand()),z=mix(-320,325,rand());if(!canPlant(x,z)||rand()<.1)continue;
      const y=terrainHeight(x,z), s=.48+rand()*1.1;
      grass.push({x,y:y+s*.35,z,sx:s*.22,sy:s*.8,sz:s*.22,ry:rand()*6.28});
    }
    createInstanceBatch(parent,tuftsGeo,leafLight,grass,'Instanced grass');
  }
  makeVegetation(lodLow,1300,3200);
  makeVegetation(lodHigh,3100,10500);
  const rockLow=new THREE.Group(),rockHigh=new THREE.Group();root.add(rockLow,rockHigh);
  function rocks(parent,count) {
    const rand=seeded(1107);
    const regular=[],dark=[];
    for(let i=0;i<count;i++) {
      const x=mix(-334,334,rand()),z=mix(-332,333,rand()),y=terrainHeight(x,z);
      if(Math.hypot((x+148)/103,(z+80)/89)<.82)continue;
      const canyon=z<-75&&Math.abs(x-canyonX(z))<100;
      const h=(.7+rand()*3.0)*(canyon?1.8:1),r=.65+rand()*2.5;
      const item={x,y:y+h*.25,z,sx:r,sy:h,sz:r*(.55+rand()*.66),ry:rand()*6.28};
      (canyon?dark:regular).push(item);
    }
    createInstanceBatch(parent,ico,rockMat,regular,'Scattered rock formations');
    createInstanceBatch(parent,ico,darkRockMat,dark,'Canyon basalt');
  }
  rocks(rockLow,230);rocks(rockHigh,700);
  // The lake's surface is a lightweight moving shader, not a flat blue disc.
  const waterGeo=geo(new THREE.CircleGeometry(1,110));waterGeo.rotateX(-Math.PI/2);
  const waterUniforms={uTime:{value:0},uOpacity:{value:0.88}};
  const waterMat=mat(new THREE.ShaderMaterial({uniforms:waterUniforms,transparent:true,depthWrite:false,side:THREE.DoubleSide,
    vertexShader:`varying vec2 vUv;varying vec3 vPos;void main(){vUv=uv;vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`uniform float uTime;uniform float uOpacity;varying vec2 vUv;varying vec3 vPos;
    void main(){vec2 p=vPos.xz;float r=sin(p.x*18.0+uTime*.9+sin(p.y*9.0-uTime*.6));
    float q=sin((p.x+p.y)*29.0-uTime*1.25);float shimmer=pow(max(0.,r*q),9.)*.33;
    vec3 deep=vec3(.018,.19,.23),shallow=vec3(.055,.43,.45);
    float sh=.5+.5*sin(p.y*7.+p.x*3.+uTime*.25);
    vec3 c=mix(deep,shallow,.48+sh*.18)+vec3(.13,.3,.32)*shimmer;
    gl_FragColor=vec4(c,uOpacity);}` }));
  const lake=mesh(waterGeo,waterMat,root,'Lake of mirrored stars');lake.scale.set(95,1,78);lake.position.set(-148,-1.85,-80);lake.renderOrder=3;
  // Concentric subtle reeds and water-light at the shore.
  const shoreGroup=new THREE.Group();root.add(shoreGroup);
  const reedMat=mat(new THREE.MeshBasicMaterial({color:0x91bcb1,transparent:true,opacity:.58,depthWrite:false}));
  const shoreReeds=[];
  for(let i=0;i<340;i++) {
    const angle=rnd()*Math.PI*2,r=1.00+rnd()*.16,x=-148+Math.cos(angle)*99*r,z=-80+Math.sin(angle)*83*r;
    const y=terrainHeight(x,z),h=.5+rnd()*1.4;
    shoreReeds.push({x,y:y+h*.5,z,sx:.07,sy:h,sz:.07,ry:rnd()*6.28});
  }
  createInstanceBatch(shoreGroup,tuftsGeo,reedMat,shoreReeds,'Lake reeds');
  // Canyon arch bridge. Collision surface coordinates are returned by surfaceHeight().
  const bridge=new THREE.Group();bridge.name='Skybreak Canyon crossing';root.add(bridge);
  const by=5.0,bz=-164;
  for(let i=0;i<38;i++) {
    const x=-45+i*3.7;
    block(bridge,[x,by-.33,bz],[3.61,.58,8.2],i%2?stoneMat:darkRockMat);
    if(i%3===0) {
      for(const dz of [-5.25,5.25]) {
        block(bridge,[x,by+1.2,bz+dz],[.8,2.7,.7],stoneMat);
        block(bridge,[x,by+2.6,bz+dz],[1.05,.3,1.0],oldGold);
      }
    }
  }
  for(const dz of [-5.25,5.25])beam(bridge,[-44,by+2.2,bz+dz],[93,by+2.2,bz+dz],.13,oldGold);
  for(const x of [-40,87]) {
    const pillarY=terrainHeight(x,bz);
    block(bridge,[x,(pillarY+by)/2,bz],[9,Math.max(2,by-pillarY),11],darkRockMat);
  }
  // Tall cliff needles echo the layered canyon.
  const cliffNeedles=new THREE.Group();root.add(cliffNeedles);
  for(let i=0;i<37;i++) {
    const z=-96-rnd()*205,c=canyonX(z),side=rnd()<.5?-1:1,x=c+side*(42+rnd()*28);
    const y=terrainHeight(x,z),h=8+rnd()*23;
    const shard=mesh(geo(new THREE.CylinderGeometry(.25,2.2+rnd()*2.7,1,5)),i%4===0?stoneMat:darkRockMat,cliffNeedles);
    shard.position.set(x,y+h*.43,z);shard.scale.set(1,h,1);shard.rotation.z=(rnd()-.5)*.2;
  }
  // World landmarks: five discoverable memory shards and one final synthesis ring.
  const nodes=[
    {id:'lake',name:'湖畔の音叉', subtitle:'鏡湖に眠る水の記憶',x:-246,z:-69,color:0x69edeb,tip:'湖岸の共鳴装置が、失われた水路の記録を映し出す。'},
    {id:'forest',name:'原生樹の心核',subtitle:'森の奥で鼓動する根脈',x:185,z:8,color:0xa5f2b2,tip:'巨大樹の根元で、自然と機械がつながる信号を発見した。'},
    {id:'canyon',name:'断層の道標',subtitle:'崩れた峡谷を渡る古橋',x:-31,z:-164,color:0xffc17d,tip:'古い橋の碑文には、星脈を渡る旅人の道が刻まれている。'},
    {id:'crystal',name:'晶洞の灯火',subtitle:'地表に露出した魔力結晶',x:-174,z:163,color:0x9fa8ff,tip:'結晶群は、遠い都市に向けて微かな光を送っていた。'},
    {id:'tower',name:'星痕の観測塔',subtitle:'山岳に残された観測装置',x:163,z:-182,color:0xffe2a1,tip:'天球儀が再起動し、かつての大地の姿が浮かび上がった。'},
    {id:'ring',name:'星脈の石環',subtitle:'五つの記憶が集う古代祭壇',x:87,z:162,color:0x7dffff,tip:'五つの記憶が星脈を循環し、眠っていた大地の門が開いた。',final:true}
  ];
  for(const n of nodes)n.y=surfaceHeight(n.x,n.z);
  const collected=new Set(),activated={ring:false};
  let lastDiscoveryId=null;
  const animated=[], emitters=[];
  function anchoredGroup(x,z,name){ const group=new THREE.Group();group.position.set(x,terrainHeight(x,z),z);group.name=name;root.add(group);return group; }
  function energyNode(node,parent,y=3.1) {
    const base=mesh(cylinder,bronze,parent);base.position.y=.55;base.scale.set(3.25,1.15,3.25);
    for(let j=0;j<3;j++) {
      const g=mesh(cylinder,j%2?oldGold:stoneMat,parent);g.position.y=1.15+j*.23;g.scale.set(2.6-j*.3,.17,2.6-j*.3);
    }
    const core=new THREE.Group();core.position.y=y;parent.add(core);
    const orbMat=mat(new THREE.MeshStandardMaterial({color:node.color,emissive:node.color,emissiveIntensity:1.6,metalness:.3,roughness:.18}));
    const main=mesh(octa,orbMat,core);main.scale.set(1.12,2.0,1.12);
    const inner=mesh(sphere,glow,core);inner.scale.setScalar(.35);
    const halo=mesh(ringGeom,oldGold,core);halo.scale.set(2.3,2.3,2.3);halo.rotation.x=.55;
    const halo2=mesh(ringGeom,glow,core);halo2.scale.set(2.7,2.7,2.7);halo2.rotation.set(Math.PI/2,0,0);
    animated.push({type:'node',group:core,main,halo,halo2,node,baseY:y});
    node.core=core;node.coreMaterial=orbMat;
    return core;
  }
  // Lake: terraces, wave forks, luminous pier.
  {
    const n=nodes[0],g=anchoredGroup(n.x,n.z,'Lake / resonance pier');
    for(let i=0;i<11;i++) {
      const x=4+i*2.8,y=terrainHeight(n.x+x,n.z)-g.position.y;
      block(g,[x,Math.max(-1.5,y)+.3,0],[2.55,.55,5.2],i%2?stoneMat:darkRockMat);
      for(const s of [-1,1]) if(i%2===0)block(g,[x,.8,s*3.1],[.4,2,.4],oldGold);
    }
    energyNode(n,g,3.8);
    for(const s of [-1,1]) {
      const m=mesh(geo(new THREE.TorusGeometry(1.6,.13,8,40,Math.PI*1.5)),oldGold,g);
      m.position.set(-3,4.3,s*2.25);m.rotation.y=Math.PI/2;m.rotation.z=s*.2;
    }
  }
  // Forest: a monumental tree, roots and a veined mechanical heart.
  {
    const n=nodes[1],g=anchoredGroup(n.x,n.z,'Forest / ancient heartwood');
    const bark=mat(new THREE.MeshStandardMaterial({color:0x4e4a48,roughness:.95,flatShading:true}));
    const crown=mat(new THREE.MeshStandardMaterial({color:0x2c7b68,roughness:1,flatShading:true}));
    const trunk=mesh(geo(new THREE.CylinderGeometry(3.5,6.8,31,9,5)),bark,g);trunk.position.y=15.5;
    for(let i=0;i<8;i++) {
      const a=i*Math.PI*.25;
      beam(g,[Math.cos(a)*4,2,Math.sin(a)*4],[Math.cos(a)*14,.9,Math.sin(a)*14],1.25,bark);
      const branch=mesh(ico,crown,g);branch.position.set(Math.cos(a)*12,28+Math.sin(a*4)*2,Math.sin(a)*12);branch.scale.set(9,8,9);
    }
    const top=mesh(ico,crown,g);top.position.y=36;top.scale.set(11,10,11);
    for(let i=0;i<11;i++) {
      const a=i*2.399,dist=7+rnd()*6,p=mesh(sphere,i%3?glow:glowAmber,g);
      p.position.set(Math.cos(a)*dist,11+rnd()*21,Math.sin(a)*dist);p.scale.setScalar(.13+rnd()*.19);
    }
    energyNode(n,g,3.5);
  }
  // Canyon: layered gate columns, direction arrows, chasm silhouettes.
  {
    const n=nodes[2],g=anchoredGroup(n.x,n.z,'Canyon / old waymark');
    for(const s of [-1,1]) {
      block(g,[s*5,4.3,0],[2.3,8.6,2.4],stoneMat);
      block(g,[s*5,8.85,0],[3.2,.9,3],oldGold);
      const cap=mesh(octa,glowAmber,g);cap.position.set(s*5,10.15,0);cap.scale.set(1.0,1.8,1.0);
    }
    block(g,[0,8.2,0],[11,1.0,1.6],oldGold);
    energyNode(n,g,3.4);
  }
  // Crystalline grotto exposed on the surface.
  {
    const n=nodes[3],g=anchoredGroup(n.x,n.z,'Crystalline hollow');
    const cavity=mesh(ico,darkRockMat,g);cavity.position.y=-.3;cavity.scale.set(17,5,18);
    for(let i=0;i<47;i++) {
      const a=rnd()*6.283,r=Math.sqrt(rnd())*23,x=Math.cos(a)*r,z=Math.sin(a)*r,h=2+rnd()*10;
      const m=mesh(geo(new THREE.ConeGeometry(.75+rnd()*1.1,1,5)),i%5===0?glowBlue:crystalMat,g);
      m.position.set(x,terrainHeight(n.x+x,n.z+z)-g.position.y+h*.45,z);m.scale.set(1,h,1);m.rotation.z=(rnd()-.5)*.4;
    }
    energyNode(n,g,5.3);
    for(let i=0;i<4;i++) {
      const r=mesh(ringGeom,glowBlue,g);r.position.y=4.7+i*1.15;r.rotation.x=Math.PI/2;r.scale.setScalar(5.5+i*2.25);
      animated.push({type:'ring',group:r,speed:(i%2?-.04:.06)});
    }
  }
  // Observatory: telescope, moving celestial rings, ruined pylons.
  {
    const n=nodes[4],g=anchoredGroup(n.x,n.z,'Observatory / astrolabe tower');
    for(let j=0;j<6;j++) {
      const m=mesh(cylinder,j%2?darkRockMat:stoneMat,g);
      m.position.y=j*3+1.7;m.scale.set(8-j*.55,3.5,8-j*.55);
    }
    for(let i=0;i<12;i++) {
      const a=i*6.283/12,x=Math.cos(a)*12,z=Math.sin(a)*12;
      const pillar=mesh(cylinder,stoneMat,g);pillar.position.set(x,5.3,z);pillar.scale.set(.8,10,.8);
      const light=mesh(octa,glowAmber,g);light.position.set(x,10.7,z);light.scale.set(.36,.72,.36);
    }
    for(let i=0;i<3;i++) {
      const ring=mesh(geo(new THREE.TorusGeometry(7.5+i*1.55,.15,8,80)),i===1?glowAmber:oldGold,g);
      ring.position.y=20;ring.rotation.set(i*.7+.4,i*.85,.4);animated.push({type:'astrolabe',group:ring,speed:.13+(i*.12)});
    }
    const core=mesh(octa,glowBlue,g);core.position.y=20;core.scale.set(2.1,3,2.1);
    energyNode(n,g,3.1);
    const slab=block(g,[0,16,0],[6,.7,6],oldGold);slab.rotation.y=Math.PI/4;
  }
  // Final sanctuary: nine tall megaliths surround a floating aperture.
  {
    const n=nodes[5],g=anchoredGroup(n.x,n.z,'Ancient / Starvein stone circle');
    const floor=mesh(geo(new THREE.CylinderGeometry(18,19,1.5,36)),darkRockMat,g);floor.position.y=.2;
    for(let i=0;i<3;i++) {
      const ring=mesh(geo(new THREE.TorusGeometry(8+i*4,.11,5,96)),i===2?glow:oldGold,g);
      ring.rotation.x=Math.PI/2;ring.position.y=1.02;
    }
    for(let i=0;i<9;i++) {
      const a=i*2*Math.PI/9,x=Math.cos(a)*16,z=Math.sin(a)*16;
      block(g,[x,6.5,z],[2.45,13.0,3.2],stoneMat,-a);
      const light=mesh(octa,glow,g);light.position.set(x,13.6,z);light.scale.set(.7,1.3,.7);
      for(let j=0;j<3;j++) {
        const glyph=block(g,[x*.98,4.5+j*2.6,z*.98],[2.6,.16,.12],glow,-a);
      }
    }
    const portal=new THREE.Group();portal.position.set(0,8,0);g.add(portal);
    const arch=mesh(geo(new THREE.TorusGeometry(7,.33,10,110)),oldGold,portal);
    const archLight=mesh(geo(new THREE.TorusGeometry(6.6,.14,7,100)),glow,portal);
    const disc=mesh(geo(new THREE.CircleGeometry(6.45,64)),mat(new THREE.MeshBasicMaterial({color:0x30c3cd,transparent:true,opacity:.07,depthWrite:false,side:THREE.DoubleSide})),portal);
    animated.push({type:'portal',group:portal,disc,archLight});
    energyNode(n,g,3.25);
    n.portal=portal;n.portalDisc=disc;
  }
  // Distant ridges give scale without loading terrain beyond the playable square.
  const horizonGroup=new THREE.Group();root.add(horizonGroup);
  const ridgeMat=mat(new THREE.MeshStandardMaterial({color:0x53636b,roughness:1,flatShading:true}));
  for(let i=0;i<52;i++) {
    const a=i*2*Math.PI/52,rad=395+rnd()*65,x=Math.cos(a)*rad,z=Math.sin(a)*rad;
    const h=40+rnd()*56,w=22+rnd()*44;
    const m=mesh(geo(new THREE.ConeGeometry(w,h,5)),ridgeMat,horizonGroup);
    m.position.set(x,h*.37-8,z);m.rotation.y=rnd()*Math.PI;
  }
  // Slow drifting aurora / pollen in high quality, tiny motes in low.
  const pollenGroup=new THREE.Group();root.add(pollenGroup);
  const pollenHigh=[],pollenLow=[];
  function createPollen(count, material, dst) {
    const positions=new Float32Array(count*3);
    for(let i=0;i<count;i++) {
      const x=mix(-285,285,rnd()),z=mix(-285,285,rnd());
      positions[i*3]=x;positions[i*3+1]=terrainHeight(x,z)+4+rnd()*25;positions[i*3+2]=z;
    }
    const g=geo(new THREE.BufferGeometry());g.setAttribute('position',new THREE.BufferAttribute(positions,3));
    const points=new THREE.Points(g,material);points.frustumCulled=false;pollenGroup.add(points);dst.push(points);return points;
  }
  const pollenMat=mat(new THREE.PointsMaterial({color:0x8df2d0,size:.5,transparent:true,opacity:.68,sizeAttenuation:true,depthWrite:false}));
  createPollen(125,pollenMat,pollenLow);createPollen(600,pollenMat,pollenHigh);
  // Optional custom collisions/waypoints for integration; no camera coupling.
  const markerPositions=nodes.map(n=>({id:n.id,name:n.name,x:n.x,y:n.y,z:n.z,final:!!n.final}));
  function nearestNode(position, radius=12) {
    if (!position) return null;
    const x=position.x,z=position.z;
    let nearest=null, best=radius;
    for(const n of nodes){const d=Math.hypot(n.x-x,n.z-z);const dy=Math.abs((n.y+2.5)-(position.y??n.y));if(d<best&&dy<11){best=d;nearest=n;}}
    return nearest?{id:nearest.id,name:nearest.name,subtitle:nearest.subtitle,distance:best,final:!!nearest.final,done:nearest.final?activated.ring:collected.has(nearest.id)}:null;
  }
  function interact(position) {
    const hit=nearestNode(position,11.5);
    if(!hit)return {ok:false,reason:'out_of_range'};
    const n=nodes.find(item=>item.id===hit.id);
    if(n.final) {
      if(collected.size<5)return {ok:false,id:n.id,name:n.name,reason:'locked',message:`あと${5-collected.size}個の記憶が必要。石環はまだ静まり返っている。`};
      if(!activated.ring) {activated.ring=true;return {ok:true,id:n.id,name:n.name,final:true,progress:5,total:5,message:n.tip};}
      return {ok:true,id:n.id,name:n.name,already:true,final:true,message:'星脈の門は稼働中。大地に青い光が巡っている。'};
    }
    if(collected.has(n.id))return {ok:true,id:n.id,name:n.name,already:true,progress:collected.size,total:5,message:'この場所の記憶は回収済み。'};
    collected.add(n.id);return {ok:true,id:n.id,name:n.name,progress:collected.size,total:5,message:n.tip};
  }
  function setQuality(mode) {
    quality=mode==='high'?'high':'low';
    groundLow.visible=quality==='low';groundHigh.visible=quality==='high';
    lodLow.visible=quality==='low';lodHigh.visible=quality==='high';
    rockLow.visible=quality==='low';rockHigh.visible=quality==='high';
    for(const p of pollenLow)p.visible=quality==='low';for(const p of pollenHigh)p.visible=quality==='high';
    waterUniforms.uOpacity.value=quality==='high'?.91:.83;
    return quality;
  }
  setQuality(quality);
  function update(dt, context={}) {
    if(disposed)return;
    const d=Math.min(Math.max(dt||0,0),.1);clock+=d;
    waterUniforms.uTime.value=clock;
    for(const a of animated) {
      if(a.type==='node') {
        const done=a.node.final?activated.ring:collected.has(a.node.id);
        a.group.position.y=a.baseY+Math.sin(clock*1.4+a.baseY)*.24;
        a.main.rotation.y+=d*(done?.28:.55);a.halo.rotation.z+=d*.26;a.halo2.rotation.y+=d*.4;
        a.group.scale.setScalar(done?.73:1);
      } else if(a.type==='ring') a.group.rotation.z+=d*a.speed;
      else if(a.type==='astrolabe'){a.group.rotation.z+=d*a.speed;a.group.rotation.y+=d*a.speed*.38;}
      else if(a.type==='portal') {
        a.group.rotation.z+=d*(activated.ring?.34:.08);
        a.disc.material.opacity=activated.ring?.36+Math.sin(clock*2)*.07:.035;
        a.archLight.scale.setScalar(activated.ring?1.04+Math.sin(clock*2.5)*.025:.98);
      }
    }
    pollenGroup.position.x=Math.sin(clock*.11)*1.1;
    pollenGroup.position.z=Math.sin(clock*.08)*1.2;
    if(context.onDiscovery && typeof context.onDiscovery==='function') {
      const nearby=nearestNode(context.playerPosition,12);
      const id=nearby&&!nearby.done?nearby.id:null;
      if(id&&id!==lastDiscoveryId)context.onDiscovery(nearby);
      lastDiscoveryId=id;
    }
  }
  function getState() {return {collected:[...collected],total:5,progress:collected.size,portalOpen:activated.ring,quality};}
  function loadState(state) {
    collected.clear();for(const id of state?.collected||[])if(nodes.some(n=>n.id===id&&!n.final))collected.add(id);
    activated.ring=Boolean(state?.portalOpen)&&collected.size===5;
  }
  function dispose() {
    if(disposed)return;disposed=true;
    root.parent?.remove(root);
    root.traverse(obj=>{
      if(obj.isMesh||obj.isPoints||obj.isInstancedMesh){if(obj.geometry)disposables.add(obj.geometry);const ms=Array.isArray(obj.material)?obj.material:[obj.material];for(const mm of ms)if(mm)mats.add(mm);}
    });
    for(const g of disposables)g.dispose();for(const m of mats)m.dispose();root.clear();
  }
  return {root, update, setQuality, dispose, terrainHeight, surfaceHeight,
    getHeightAt:terrainHeight, getWalkHeight:surfaceHeight,
    getNearby:nearestNode, interact, getState, loadState,
    markers:markerPositions, bounds:{minX:-344,maxX:344,minZ:-344,maxZ:344},
    metadata:{id:'07',name:'星脈の大地',units:'metres',up:'+Y',forward:'-Z',sizeMetres:size, spawn:{x:0,z:23},qualityModes:['low','high']}
  };
}
