/**
 * AETHER FRONTIER / Team No.02
 * LUMEN QUARTER - Commercial & Residential District
 * Three.js r160, Y-up, forward -Z, approximately 1m per world unit.
 * Standalone scene module: owns no renderer, camera, input handler or render loop.
 *
 * Public: createAetherModule(THREE, options) -> {
 *  root, update(dt, context), setQuality(mode), dispose(),
 *  interact(id, context), getNearestInteraction(position, range), getInteractions(),
 *  getGroundHeight(x,z,currentFootY), resolveMovement(origin, destination, radius, height),
 *  spawn, bounds, metadata, getStatistics()
 * }
 */
export function createAetherModule(THREE, options = {}) {
  if (!THREE || !THREE.Group || !THREE.InstancedMesh) {
    throw new Error('AETHER No.02 requires a Three.js r160-compatible THREE namespace.');
  }

  const root = new THREE.Group();
  root.name = 'AF02_LUMEN_QUARTER';
  // No.00 can position the whole district without breaking its collision APIs.
  const offset = options.origin || {x:0,y:0,z:0};
  root.position.set(Number(offset.x)||0,Number(offset.y)||0,Number(offset.z)||0);
  const base = new THREE.Group(); base.name = 'District_LowAndHigh';
  const high = new THREE.Group(); high.name = 'District_HighDetails';
  const animated = new THREE.Group(); animated.name = 'District_Animated';
  root.add(base, high, animated);

  const palette = {
    road: 0x18202f, sidewalk: 0x354454, walkway: 0x233b49,
    slate: 0x263445, shell: 0x3d5360, ceramic: 0x91a9ae,
    pale: 0xa8bac1, dark: 0x101c2b, roof: 0x253640,
    brass: 0xcaa77a, copper: 0xa7735d, trim: 0x536f80,
    glass: 0x3b7886, glassDeep: 0x224b63, windowWarm: 0xffb875,
    windowCool: 0x60cfda, neon: 0x45f5e8, amber: 0xffbb69,
    violet: 0xb99aff, green: 0x72c49a, leaf: 0x3d8b81,
    root: 0x465756, blue: 0x3473a5, white: 0xe5f8ed,
    stripe: 0x9fb2bb, outline: 0x14232b,
  };
  const materials = {};
  const createMat = (name, color, extra={}) => {
    const mat = new THREE.MeshStandardMaterial({color, roughness:0.68, metalness:0.22, ...extra});
    mat.name = `AF02_${name}`;
    materials[name] = mat;
  };
  for (const [name,color] of Object.entries(palette)) createMat(name,color);
  for(const name of ['brass','copper','trim','ceramic','pale']) {materials[name].metalness=0.58; materials[name].roughness=0.37;}
  for(const name of ['glass','glassDeep']) {materials[name].metalness=0.58;materials[name].roughness=0.17;}
  for(const name of ['windowWarm','windowCool','neon','amber','violet','white']) {
    materials[name].emissive = new THREE.Color(palette[name]);
    materials[name].emissiveIntensity = name==='neon'?1.65:0.75;
    materials[name].roughness=0.31;
  }
  materials.windowWarm.color.setHex(0xd08f59);
  materials.windowCool.color.setHex(0x4aa2b2);
  materials.neon.color.setHex(0x65dfd5);
  materials.amber.color.setHex(0xf0bb7a);
  materials.violet.color.setHex(0xb9a9ff);
  const dynamicCoreMat = new THREE.MeshStandardMaterial({color:0x86f5e4,emissive:0x24ead2,emissiveIntensity:1.9,roughness:0.2,metalness:0.5});
  const dynamicHaloMat = new THREE.MeshBasicMaterial({color:0x5effef,transparent:true,opacity:0.75,depthWrite:false,side:THREE.DoubleSide});

  const boxes = new Map(), cylinders = new Map(), spheres = new Map();
  const colliders = [], surfaces = [], signageTextures = [], effects = [];
  const interactables = [];
  const dynamicMeshes = [];
  const tmp = new THREE.Object3D();
  const matrices = {base:0,high:0};
  const bounds = {minX:-83,maxX:83,minZ:-87,maxZ:83};
  let quality = options.quality === 'low' ? 'low' : 'high';
  let elapsed=0, disposed=false;
  const mapPush=(map,mode,key,matrix)=>{const label=`${mode}|${key}`;if(!map.has(label)) map.set(label,[]);map.get(label).push(matrix.clone());matrices[mode]++;};
  const mkMatrix=(x,y,z,w,h,d,rotY=0,rx=0,rz=0)=>{
    tmp.position.set(x,y,z);tmp.rotation.set(rx,rotY,rz);tmp.scale.set(w,h,d);tmp.updateMatrix();return tmp.matrix;
  };
  const addSolid=(x,z,w,d,y,h)=>colliders.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,minY:y,maxY:y+h});
  function box(mat,x,y,z,w,h,d,mode='base',rot=0,collision=false){
    mapPush(boxes,mode,mat,mkMatrix(x,y,z,w,h,d,rot));
    if(collision && !rot) addSolid(x,z,w,d,y-h/2,h);
  }
  function cyl(mat,x,y,z,r,h,mode='base',segments=10,collision=false){
    const key=`${mat}|${segments}`;mapPush(cylinders,mode,key,mkMatrix(x,y,z,r,h,r));
    if(collision) addSolid(x,z,r*2,r*2,y-h/2,h);
  }
  function sphere(mat,x,y,z,r,mode='base'){mapPush(spheres,mode,mat,mkMatrix(x,y,z,r,r,r));}
  function addSurface(x,z,w,d,y){surfaces.push({minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,y});}
  function border(x,z,w,d,y,railMat='trim'){
    box(railMat,x,y,z-d/2,w,0.12,0.14);
    box(railMat,x,y,z+d/2,w,0.12,0.14);
    box(railMat,x-w/2,y,z,0.14,0.12,d);
    box(railMat,x+w/2,y,z,0.14,0.12,d);
  }
  const windowsOnSolid=(x,z,w,d,h,skipFront=null)=>{
    const levels=Math.max(2,Math.floor((h-2)/3.5));
    for(let f=0;f<levels;f++){
      const wy=2.8+f*3.5;
      for(let a=0;a<Math.max(2,Math.floor(w/4.8));a++){
        const wx=x-w/2+(a+0.5)*w/Math.max(2,Math.floor(w/4.8));
        const mat=(a+f)%7===0?'windowWarm':((a+f)%3===0?'glassDeep':'windowCool');
        box(mat,wx,wy,z+d/2+0.03,2.25,1.95,0.07,(f%2?'high':'base'));
        box(mat,wx,wy,z-d/2-0.03,2.25,1.95,0.07,((f+a)%4?'base':'high'));
        box('trim',wx,wy-1.11,z+d/2+0.09,2.37,0.10,0.12,'high');
      }
      for(let b=0;b<Math.max(2,Math.floor(d/4.9));b++){
        const wz=z-d/2+(b+0.5)*d/Math.max(2,Math.floor(d/4.9));
        const mat=(f+b)%5?'glass':'windowWarm';
        if(skipFront!=='west')box(mat,x-w/2-0.035,wy,wz,0.07,1.95,2.3,(b%2?'base':'high'));
        if(skipFront!=='east')box(mat,x+w/2+0.035,wy,wz,0.07,1.95,2.3,((f+b)%3?'base':'high'));
      }
    }
  };

  function makeSolidBuilding({x,z,w,d,h,kind='slate',accent='neon',stepped=false}){
    box(kind,x,h/2+0.25,z,w,h,d,'base',0,true);
    box('trim',x,h+0.29,z,w+0.5,0.35,d+0.5);
    box('roof',x,h+0.47,z,w-1,0.12,d-1);
    if(stepped){
      box('slate',x,h+3.05,z,w*0.58,5.0,d*0.54);
      box('trim',x,h+5.66,z,w*0.61,0.16,d*0.57);
    }
    windowsOnSolid(x,z,w,d,h);
    for(let iz=-1;iz<=1;iz+=2){
      box(accent,x,h+0.5,z+iz*(d/2-1.3),w-2,0.10,0.14,'high');
    }
    for(let f=1;f<Math.floor(h/6);f++){
      box('trim',x,1+f*6,z+d/2+0.11,w+0.22,0.18,0.28,'high');
    }
    for(let dx of [-w/2+1.2,w/2-1.2]){
      box('brass',x+dx,h+1.15,z+d/2-1.7,0.13,1.8,0.13,'high');
    }
  }

  function addCanopy(x,y,z,length,depth,front){
    const dx=front==='east'?0.6:-0.6;
    box('brass',x+dx,y,z,2.4,0.20,length);
    box('glass',x+dx,y-0.12,z,2.1,0.10,length-0.4,'high');
    box('neon',x+dx,y+0.16,z,2.45,0.08,length,'high');
    for(let dz of [-length/2+0.6,length/2-0.6]) box('trim',x+dx*1.1,y-0.3,z+dz,0.12,0.55,0.12,'high');
  }

  // Front faces +X (western shops) or -X (eastern residences). Centre opening is always walkable.
  function makeOpenBuilding({x,z,w,d,h=12,front='east',kind='shell',label,sub,accent='neon',roofAccess=false}){
    const wall=0.68, opening=6.0, doorSide=(d-opening)/2;
    const fx=x+(front==='east'?w/2:-w/2), bx=x-(front==='east'?w/2:-w/2);
    box(kind,bx, h/2+0.3,z,wall,h,d,'base',0,true);
    for(let side of [-1,1]) {
      const sz=z+side*(d/2-wall/2);
      box(kind,x,h/2+0.3,sz,w,h,wall,'base',0,true);
      box('ceramic',fx, h/2+0.3,z+side*(opening/2+doorSide/2),wall,h,doorSide,'base',0,true);
      box('trim',fx, h+0.4,z+side*(d/2-0.8),1.05,0.45,1.0);
    }
    box('trim',fx,h+0.05,z,1.1,0.45,opening+1);
    box('trim',fx,h-1.0,z,1,0.2,opening+0.6);
    box('copper',fx,2.8,z-opening/2-0.15,0.16,5.0,0.19);
    box('copper',fx,2.8,z+opening/2+0.15,0.16,5.0,0.19);
    box(accent,fx,5.25,z-opening/2-0.2,0.17,0.14,0.25);
    box(accent,fx,5.25,z+opening/2+0.2,0.17,0.14,0.25);
    box('sidewalk',x,0.22,z,w-0.7,0.26,d-0.7);
    box('glassDeep',x,h+0.14,z,w+0.45,0.35,d+0.45);
    box('roof',x,h+0.4,z,w+0.8,0.18,d+0.8);
    border(x,z,w+0.75,d+0.75,h+0.56);
    if(roofAccess){
      addSurface(x,z,w+0.5,d+0.5,h+0.51);
      box('walkway',x,h+0.53,z,w-1.4,0.04,d-1.4);
      for(let side of [-1,1]){
        box('trim',x,h+1.24,z+side*(d/2),w,0.10,0.12);
        box('trim',x+side*(w/2),h+1.24,z,0.12,0.1,d);
        for(let i=0;i<7;i++){
          const xx=x-w/2+(i+0.5)*w/7;
          box('glass',xx,h+1.02,z+side*(d/2),0.08,1.0,0.08,'high');
        }
      }
    }
    addCanopy(fx,6.2,z,opening+2.8,2.2,front);
    // upper facade glazing above front entrance
    for(let side of [-1,1])for(let level=0;level<2;level++){
      box('glass',fx+(front==='east'?0.07:-0.07),7.2+level*2,z+side*(opening/2+doorSide/2),0.12,1.35,Math.max(1,doorSide-0.75));
    }
    addSign(label,fx+(front==='east'?0.50:-0.50),h-1.0,z,front,Math.min(10,d-1),2.7,sub);
    for(let k=0;k<3;k++){
      box('trim',x,h+1.0,z-d/2+3+k*(d-6)/2,w-3,0.06,0.1,'high');
    }
    return {frontX:fx,backX:bx,x,z,w,d,h};
  }

  function addSign(title,x,y,z,face,width=9,height=2.5,subtitle=''){
    if(typeof document==='undefined') return;
    const c=document.createElement('canvas');c.width=768;c.height=224;
    const ctx=c.getContext('2d');if(!ctx)return;
    const grad=ctx.createLinearGradient(0,0,768,224);
    grad.addColorStop(0,'rgba(10,29,44,.95)');grad.addColorStop(1,'rgba(15,46,57,.91)');
    ctx.fillStyle=grad;ctx.fillRect(0,0,768,224);
    ctx.lineWidth=9;ctx.strokeStyle='#62eae2';ctx.strokeRect(9,9,750,206);
    ctx.lineWidth=1.5;ctx.strokeStyle='#d8b88b';ctx.strokeRect(24,24,720,175);
    ctx.fillStyle='#d9fff5';ctx.font='bold 59px system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(title,384,92,705);
    ctx.fillStyle='#e8bf91';ctx.font='bold 26px system-ui, sans-serif';ctx.fillText(subtitle,384,161,720);
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
    texture.anisotropy=4;signageTextures.push(texture);
    const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide,depthWrite:false});
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,height),material);
    mesh.position.set(x,y,z);
    mesh.rotation.y=face==='east'?Math.PI/2:face==='west'?-Math.PI/2:face==='north'?Math.PI:0;
    mesh.renderOrder=3;mesh.name=`Sign_${title}`;base.add(mesh);
    effects.push({dispose:()=>{mesh.geometry.dispose();material.dispose();}});
  }

  // ---- Base street network: open towards city centre (-Z); central tower belongs to No.01 ----
  box('slate',0,-0.48,0,177,0.70,186);
  box('road',0,-0.06,-1.5,18.2,0.12,176);
  box('road',0,-0.052,-16.8,170,0.11,12.2);
  box('sidewalk',-11.0,0.11,-1.5,3.7,0.25,176);
  box('sidewalk',11.0,0.11,-1.5,3.7,0.25,176);
  box('walkway',-49,0.16,-1.5,63,0.29,176);
  box('walkway',49,0.16,-1.5,63,0.29,176);
  box('ceramic',-49,0.32,-16.9,62,0.11,15.1);
  box('ceramic',49,0.32,-16.9,62,0.11,15.1);
  for(let i=-7;i<=7;i++){
    const z=i*10.5;
    if(z>-24&&z<-8)continue;
    box('stripe',-4.3,0.014,z,0.14,0.021,4.0);
    box('stripe',4.3,0.014,z,0.14,0.021,4.0);
    for(let side of [-1,1]) box('brass',side*8.9,0.12,z,0.10,0.06,4.8,'high');
  }
  for(let j=0;j<8;j++){
    const x=-73+j*21;
    box('stripe',x,0.015,-16.8,9.0,0.028,0.12);
  }
  for(let side of [-1,1])for(let i=-5;i<=5;i++){
    const z=i*14.9+1;
    box('ceramic',side*12.6,0.30,z,0.20,0.12,0.24);
  }
  // Wide crosswalk, allows players to explore both districts without jumping.
  for(let i=-4;i<=4;i++)box('stripe',i*1.68,0.014,-7.7,0.95,0.028,3.15);
  for(let i=-4;i<=4;i++)box('stripe',i*1.68,0.014,-27.1,0.95,0.028,3.15);

  // A small commercial plaza with a clearly walkable central court.
  box('ceramic',-28,0.32,-0.5,31,0.14,30);
  box('sidewalk',-28,0.41,-0.5,26,0.06,25);
  border(-28,-0.5,30.4,29.4,0.48,'brass');
  for(let j=-3;j<=3;j++){
    box('trim',-28+j*3.45,0.46,-0.5,0.05,0.018,23,'high');
  }
  // Plaza mosaic: glowing aether paths, all flat ground decals.
  box('neon',-28,0.462,-0.5,0.05,0.012,19,'high');
  box('amber',-28,0.465,-0.5,22,0.01,0.05,'high');

  // Commercial interior 1: walk-in supply store.
  const supply=makeOpenBuilding({x:-42,z:42,w:35,d:30,h:12,front:'east',kind:'shell',label:'AETHER SUPPLY',sub:'COMPONENTS / TRADING / CRYSTALS'});
  for(let i=0;i<4;i++){
    const z=32+i*6.4;
    box('dark',-49,1.0,z,5.9,1.2,2.2,'base',0,true);
    box('glass',-49,1.68,z,5.7,0.12,2.0);
    for(let j=0;j<3;j++) sphere(j%2?'violet':'neon',-51+j*1.8,2.0,z,0.39,'high');
  }
  box('copper',-29.5,1.1,36.8,2.5,1.8,5.6,'base',0,true);
  box('glassDeep',-29.5,2.08,36.8,2.7,0.12,5.6);
  for(let z of [30.5,43,52]){
    cyl('brass',-56,5.5,z,0.12,7,'high');
    sphere('windowWarm',-56,8.3,z,0.45);
  }
  const coreGroup=new THREE.Group();coreGroup.position.set(-35,2.9,45.8);animated.add(coreGroup);
  const coreSphere=new THREE.Mesh(new THREE.IcosahedronGeometry(1.05,1),dynamicCoreMat);coreGroup.add(coreSphere);
  const coreRing1=new THREE.Mesh(new THREE.TorusGeometry(1.52,0.065,7,44),dynamicHaloMat);
  const coreRing2=new THREE.Mesh(new THREE.TorusGeometry(1.8,0.03,7,44),dynamicHaloMat);
  coreRing1.rotation.x=Math.PI/4;coreRing2.rotation.y=Math.PI/3;coreGroup.add(coreRing1,coreRing2);
  dynamicMeshes.push(coreSphere,coreRing1,coreRing2);
  cyl('dark',-35,1.14,45.8,1.6,1.7,'base',12,true);
  cyl('brass',-35,2.05,45.8,1.42,0.12,'base',12);

  // Commercial interior 2: cafe and artisan atelier.
  const cafe=makeOpenBuilding({x:-62,z:7,w:28,d:26,h:13,front:'east',kind:'slate',label:'ORBIT CAFE',sub:'TEA / FOOD / REST'});
  box('ceramic',-50,1.02,9.6,2.3,1.35,7.3,'base',0,true);
  for(let z of [-1.2,2.1,13.0]){
    cyl('copper',-58,0.87,z,1.25,0.18,'base',12,true);
    cyl('brass',-58,0.45,z,0.14,0.67,'base');
    for(let angle of [0,2.09,4.18]){
      const xx=-58+Math.cos(angle)*2.05, zz=z+Math.sin(angle)*2.05;
      cyl('ceramic',xx,0.51,zz,0.46,0.32,'high',8,true);
    }
  }
  for(let z of [2,8,15])sphere('amber',-66,5.65,z,0.5);
  box('glass',-73,6.4,7,0.14,5.0,19,'high');

  // Commercial interior 3: fabrication studio, industrial vertical silhouette.
  const fab=makeOpenBuilding({x:-45,z:-53,w:34,d:25,h:15,front:'east',kind:'slate',label:'NOVA FORGE',sub:'ATELIER / ARTIFACT REPAIRS',accent:'violet'});
  for(let z of [-62,-55,-48]){
    box('dark',-54,0.98,z,8,1.4,3.0,'base',0,true);
    box('brass',-54,1.79,z,8.15,0.19,3.2);
    box('violet',-54,1.91,z,3.5,0.08,0.12);
  }
  box('copper',-36,2.1,-54,3.0,3.6,4.8,'base',0,true);
  cyl('trim',-36,4.2,-54,2.0,0.15,'base',12);
  for(let i=0;i<5;i++) box('violet',-60,3.2+i*1.4,-62,0.12,0.10,2,'high');

  // Background high-rises intentionally exclude No.01's iconic central tower.
  makeSolidBuilding({x:-74,z:59,w:15,d:19,h:34,kind:'slate',accent:'amber',stepped:true});
  makeSolidBuilding({x:-70,z:-28,w:19,d:21,h:40,kind:'shell',accent:'violet',stepped:true});
  makeSolidBuilding({x:-72,z:-75,w:19,d:20,h:28,kind:'slate',accent:'neon'});
  makeSolidBuilding({x:-38,z:-77,w:29,d:15,h:24,kind:'shell',accent:'amber'});
  makeSolidBuilding({x:-69,z:37,w:18,d:13,h:23,kind:'slate',accent:'neon'});
  for(let [x,z,w,d,h] of [[-27,70,17,19,14],[-21,-76,13,17,17]]){
    makeSolidBuilding({x,z,w,d,h,kind:'shell',accent:'amber'});
  }

  // Market canopy: eight colorful modular stalls with accessible walkways between them.
  for(let i=0;i<7;i++){
    const row=i%4,col=Math.floor(i/4);
    const x=-37+col*9.7, z=-10+row*6.5;
    box(i%3===0?'copper':'slate',x,1.0,z,4.2,1.3,3.2,'base',0,true);
    box('brass',x,2.72,z,5.4,0.14,4.3);
    box(i%3===0?'violet':i%3===1?'neon':'amber',x,2.86,z,5.1,0.10,4.15);
    for(let side of [-1,1]){
      box('trim',x+side*2.25,1.65,z-1.5,0.12,2.3,0.1,'high');
    }
    for(let a=-1;a<=1;a++){
      sphere(i%2?'windowWarm':'windowCool',x+a*1.17,1.85,z-0.6,0.22,'high');
    }
    box('glass',x,1.8,z-1.55,3.4,0.45,0.12,'high');
  }
  addSign('NIGHT MARKET',-18.2,6.8,1.7,'east',8.5,2.5,'CRAFT / FOOD / AETHER');

  // Residential cluster: first-class exploration space, not only a backdrop.
  const homeA=makeOpenBuilding({x:43,z:35,w:31,d:30,h:13,front:'west',kind:'ceramic',label:'VESPER COURT',sub:'RESIDENCES / ROOF GARDEN',accent:'amber',roofAccess:true});
  const homeC=makeOpenBuilding({x:46,z:-43,w:33,d:29,h:13,front:'west',kind:'shell',label:'SKY NEST',sub:'COMMUNITY / SKYBRIDGE',accent:'neon',roofAccess:true});
  // Apartment lobby with mailboxes, glowing intercoms, lounge furniture.
  for(let i=0;i<7;i++){
    const z=24+i*2.5;
    box('copper',55.1,2.3,z,0.78,2.4,1.8,'base',0,true);
    box('amber',54.64,2.9,z,0.12,0.22,0.7);
    box('glass',54.62,2.18,z,0.12,0.34,1.0,'high');
  }
  box('dark',35.2,0.95,27,5.1,1.1,2.3,'base',0,true);
  box('glassDeep',35.2,1.58,27,5.4,0.12,2.5);
  for(let z of [24.5,37.8,43]) {
    box('copper',47,0.8,z,2.2,0.8,2.4,'base',0,true);
    box('windowWarm',47,1.23,z,2.2,0.11,2.4);
  }
  for(let [x,z] of [[36,37],[51,47],[54,26]]){
    box('root',x,0.65,z,1.8,0.75,1.8);
    cyl('root',x,1.43,z,0.15,1.2);
    sphere('leaf',x,2.12,z,1.18);
    sphere('green',x-0.36,2.20,z+0.25,0.46,'high');
  }
  // Shared home workshop at the north residence.
  for(let z of [-52,-47,-40,-34]){
    box('slate',55,1.0,z,5.6,1.4,2.0,'base',0,true);
    box('brass',55,1.8,z,5.65,0.11,2.1);
    for(let j=-1;j<=1;j++)box('windowCool',54.6+j*1.6,2.15,z,0.7,0.6,0.7,'high');
  }
  box('dark',36,0.87,-37,5.3,1.25,2.7,'base',0,true);
  box('glass',36,1.62,-37,5.4,0.13,2.8);
  // Residential skyline masses with balconies and a warm-window pattern.
  makeSolidBuilding({x:72,z:37,w:17,d:25,h:30,kind:'shell',accent:'amber',stepped:true});
  makeSolidBuilding({x:72,z:-45,w:17,d:26,h:35,kind:'slate',accent:'violet',stepped:true});
  makeSolidBuilding({x:47,z:69,w:23,d:18,h:18,kind:'ceramic',accent:'neon'});
  makeSolidBuilding({x:48,z:-77,w:24,d:17,h:23,kind:'slate',accent:'amber'});
  makeSolidBuilding({x:75,z:-78,w:14,d:15,h:21,kind:'shell',accent:'neon'});
  for(let i=0;i<5;i++){
    const z=21+i*7.1;
    box('copper',64.12,3.7+i%2*3.2,z,3.1,0.20,4.25,'high');
    box('glass',64.19,4.15+i%2*3.2,z,0.1,0.65,4.25,'high');
  }

  // Public gardens and small canal crossing: low polygons, readable silhouettes.
  box('ceramic',26,0.31,-1,24,0.13,20);
  box('glassDeep',25.8,0.43,-1,19.2,0.10,6.5);
  box('glass',25.8,0.501,-1,18.8,0.03,6.1);
  box('brass',25.8,0.53,-1,19.2,0.07,0.12);
  for(let i=0;i<6;i++){
    const x=17+i*3.4;
    box('ceramic',x,0.58,-1,0.32,0.12,6.9,'high');
  }
  for(let [x,z] of [[18,-8],[34,-8],[18,6],[34,6]]){
    box('root',x,0.70,z,2.0,0.8,2.0);
    cyl('root',x,2.0,z,0.25,2.5);
    sphere('leaf',x,3.5,z,1.45);
    sphere('green',x+0.35,3.8,z-0.3,0.77,'high');
  }
  // Seating, small planter strips and street furniture.
  for(let z of [-73,-47,-5,36,64]){
    for(let x of [-16,16]){
      box('copper',x,0.68,z,2.2,0.25,0.76);
      box('slate',x,1.1,z+0.36,2.2,0.68,0.18);
      box('trim',x-0.8,0.41,z,0.16,0.47,0.55,'high');
      box('trim',x+0.8,0.41,z,0.16,0.47,0.55,'high');
    }
  }
  for(let side of [-1,1])for(let z of [-72,-49,-38,14,27,56,76]){
    const x=side*15.8;
    cyl('trim',x,3.45,z,0.13,6.6,'base',8);
    box('brass',x-side*0.6,6.62,z,1.5,0.23,0.35);
    box('windowWarm',x-side*0.9,6.52,z,0.65,0.09,0.47);
    sphere('amber',x-side*0.8,6.30,z,0.22,'high');
  }
  for(let i=0;i<12;i++){
    const x=i%2===0? -15.5:15.5;
    const z=-80+i*13.4;
    cyl('root',x,1.15,z,0.27,2.2,'base',8);
    sphere('leaf',x,2.47,z,1.52);
    sphere('green',x+0.6,2.74,z+0.35,0.72,'high');
  }
  for(let z of [6,26,53]){
    box('dark',-14.0,1.08,z,1.3,1.78,0.95,'base',0,true);
    box('windowCool',-13.29,1.36,z,0.11,0.72,0.68);
    box('amber',-13.28,0.66,z+0.31,0.1,0.12,0.16,'high');
  }
  for(let z of [-56,-35,45,68]){
    box('copper',16.9,1.2,z,0.8,1.9,1.4,'base',0,true);
    box('glass',16.43,1.4,z,0.12,1.0,1.1);
    box('neon',16.38,0.69,z,0.10,0.18,0.46,'high');
  }

  // ---- Roof route: glass lift -> terrace A -> skybridge -> terrace C ----
  const roofY=13.51;
  const bridgeX=44.6, bridgeZ=-4.0, bridgeLen=49.5;
  box('walkway',bridgeX,roofY-0.11,bridgeZ,6.5,0.34,bridgeLen);
  box('glass',bridgeX,roofY+0.10,bridgeZ,6.25,0.09,bridgeLen,'high');
  addSurface(bridgeX,bridgeZ,6.5,bridgeLen,roofY);
  for(let side of [-1,1]){
    box('trim',bridgeX+side*3.3,roofY+0.65,bridgeZ,0.12,1.25,bridgeLen);
    box('neon',bridgeX+side*3.3,roofY+1.26,bridgeZ,0.09,0.07,bridgeLen,'high');
    for(let i=0;i<13;i++){
      const z=bridgeZ-bridgeLen/2+(i+0.5)*bridgeLen/13;
      box('glass',bridgeX+side*3.28,roofY+0.62,z,0.11,1.02,1.2,'high');
    }
    addSolid(bridgeX+side*3.3,bridgeZ,0.16,bridgeLen,roofY,1.25);
  }
  for(let i=0;i<5;i++){
    const z=-20+i*10;
    box('brass',bridgeX,roofY-0.38,z,6.7,0.15,0.38);
    for(let side of [-1,1])box('trim',bridgeX+side*3.12,roofY-5.4,z,0.3,10.2,0.3,'high');
  }
  // Lift at ground level, platform y is animated, remains independently accessible.
  const liftX=19.6,liftZ=20.1;
  box('slate',liftX,0.18,liftZ,6.2,0.40,6.2);
  for(const sx of [-1,1])for(const sz of [-1,1]){
    box('trim',liftX+sx*3.0,6.94,liftZ+sz*3.0,0.24,13.6,0.24);
    box('neon',liftX+sx*3.0,7.0,liftZ+sz*3.03,0.08,13.2,0.07,'high');
  }
  box('ceramic',liftX,13.88,liftZ,7.2,0.28,7.2);
  box('neon',liftX,14.04,liftZ,5.8,0.09,0.08,'high');
  box('neon',liftX,14.04,liftZ,0.08,0.09,5.8,'high');
  const liftGroup=new THREE.Group();liftGroup.position.set(liftX,0,liftZ);liftGroup.name='Interactable_GlassLift';animated.add(liftGroup);
  const platform=new THREE.Mesh(new THREE.BoxGeometry(5.6,0.32,5.6),materials.brass);
  platform.position.y=0.16;liftGroup.add(platform);
  const liftGlassMat= new THREE.MeshStandardMaterial({color:0x5eb9cf,transparent:true,opacity:0.22,metalness:0.3,roughness:0.11,depthWrite:false,side:THREE.DoubleSide});
  for(const side of [-1,1]){
    const wall=new THREE.Mesh(new THREE.BoxGeometry(0.075,1.5,5.6),liftGlassMat);
    wall.position.set(side*2.79,0.95,0);liftGroup.add(wall);
  }
  for(const side of [-1,1]){
    const ring=new THREE.Mesh(new THREE.BoxGeometry(5.55,0.08,0.12),materials.neon);
    ring.position.set(0,0.26,side*2.75);liftGroup.add(ring);
  }
  // Bridge begins at the lift's outer edge, leaving the lift shaft clear.
  box('walkway',27.3,roofY-0.12,20.2,9.8,0.3,5.5);
  addSurface(27.3,20.2,9.8,5.5,roofY);
  for(let sx of [-1,1])box('trim',27.3,roofY+0.65,20.2+sx*2.81,9.7,1.25,0.12);
  // Terrace furniture: planter beds, benches, sculpture and lantern strings.
  for(const [x,z] of [[34,30],[53,30],[35,42],[54,43],[34,-47],[55,-48],[38,-36]]){
    box('root',x,roofY+0.52,z,3.0,0.86,2.3,'base',0,true);
    for(let j=-1;j<=1;j++){
      sphere('leaf',x+j*0.75,roofY+1.35,z,0.66);
      sphere('green',x+j*0.75,roofY+1.64,z-0.12,0.36,'high');
    }
  }
  for(const [x,z] of [[40,28],[48,44],[40,-50],[53,-39]]){
    box('copper',x,roofY+0.5,z,3,0.24,0.72);
    box('trim',x,roofY+0.87,z+0.32,3.0,0.8,0.15);
  }
  for(let z of [-20,-5,9]){
    cyl('brass',bridgeX,roofY+2.85,z,0.1,5.2,'high');
    sphere('amber',bridgeX,roofY+5.63,z,0.30,'high');
  }
  // A rooftop aether observatory acts as a striking recognizable endpoint.
  cyl('brass',46,roofY+0.65,-44,2.2,1.2,'base',16,true);
  cyl('dark',46,roofY+1.36,-44,2.0,0.23,'base',16);
  const observatory=new THREE.Group();observatory.position.set(46,roofY+3.4,-44);animated.add(observatory);
  const crystal=new THREE.Mesh(new THREE.OctahedronGeometry(1.25),dynamicCoreMat.clone());observatory.add(crystal);
  const orbRing=new THREE.Mesh(new THREE.TorusGeometry(2.15,0.075,7,40),dynamicHaloMat.clone());orbRing.rotation.x=0.45;observatory.add(orbRing);
  effects.push({dispose:()=>{crystal.geometry.dispose();crystal.material.dispose();orbRing.geometry.dispose();orbRing.material.dispose();}});
  // High-end sky rail: non-colliding, visually connects to No.01's city centre direction.
  for(let z=-75;z<=70;z+=12){
    box('dark',0,24.4,z,1.5,0.26,12,'high');
    box('trim',0,25.0,z,0.24,0.13,12,'high');
  }
  const tram=new THREE.Group();tram.name='SkyShuttle';animated.add(tram);
  const tramBody=new THREE.Mesh(new THREE.BoxGeometry(3.7,2.7,7.8),materials.shell);tram.add(tramBody);
  for(let side of [-1,1]){
    const window=new THREE.Mesh(new THREE.BoxGeometry(0.07,1.5,6.3),materials.windowCool);
    window.position.set(side*1.89,0.36,0);tram.add(window);
  }
  const tramLight=new THREE.Mesh(new THREE.BoxGeometry(2.3,0.15,0.35),materials.neon);tramLight.position.set(0,-1.4,-3.85);tram.add(tramLight);

  // Courier drones add movement without animation frameworks or skinned meshes.
  const drones=[];
  for(let i=0;i<5;i++){
    const g=new THREE.Group();g.name=`CourierDrone_${i}`;
    const shell=new THREE.Mesh(new THREE.OctahedronGeometry(0.75,0),i%2?materials.copper:materials.trim);
    g.add(shell);
    const eye=new THREE.Mesh(new THREE.BoxGeometry(0.74,0.16,0.24),materials.neon);
    eye.position.z=-0.50;g.add(eye);
    const rotor=new THREE.Mesh(new THREE.TorusGeometry(1.15,0.055,6,20),materials.brass);
    rotor.rotation.x=Math.PI/2;rotor.position.y=0.2;g.add(rotor);
    animated.add(g);drones.push({g,rotor,i});
  }

  // A small runic public wayfinder, no central landmark tower duplication.
  cyl('dark',0,0.62,45.5,2.0,1.12);
  cyl('brass',0,1.34,45.5,1.72,0.14);
  const wayfinder=new THREE.Group();wayfinder.position.set(0,3.6,45.5);animated.add(wayfinder);
  const wayShape=new THREE.Mesh(new THREE.IcosahedronGeometry(1.45,0),dynamicCoreMat.clone());wayfinder.add(wayShape);
  const wayRing=new THREE.Mesh(new THREE.TorusGeometry(2.4,0.075,6,40),dynamicHaloMat.clone());wayRing.rotation.x=0.8;wayfinder.add(wayRing);
  effects.push({dispose:()=>{wayShape.geometry.dispose();wayShape.material.dispose();wayRing.geometry.dispose();wayRing.material.dispose();}});

  // Install the instanced geometry. Every material/primitive is typically one draw call per LOD.
  const geometries=[];
  function installInstanced(map,geoFactory){
    for(let [identifier,array] of map){
      const sep=identifier.indexOf('|');const mode=identifier.slice(0,sep);
      const key=identifier.slice(sep+1);const name=key.split('|')[0];
      const geom=geoFactory(key);geometries.push(geom);
      const instance=new THREE.InstancedMesh(geom,materials[name],array.length);
      instance.name=`AF02_${mode}_${key}`;
      instance.frustumCulled=false; // geometry instance bounds may not cover scattered instances
      instance.castShadow=false;instance.receiveShadow=false;
      for(let i=0;i<array.length;i++)instance.setMatrixAt(i,array[i]);
      instance.instanceMatrix.needsUpdate=true;
      (mode==='high'?high:base).add(instance);
    }
  }
  installInstanced(boxes,()=>new THREE.BoxGeometry(1,1,1));
  installInstanced(cylinders,(key)=>new THREE.CylinderGeometry(1,1,1,Number(key.split('|')[1]),1));
  installInstanced(spheres,()=>new THREE.IcosahedronGeometry(1,0));
  const lift={position:0,target:0,max:roofY-0.32,speed:3.75};
  const toggles={conduitUntil:0, cafeLights:false, greenhouse:false, beacon:false};
  const flash=()=>Math.sin(elapsed*3.7)*0.5+0.5;
  const interactions=(id,x,y,z,label,hint)=>interactables.push({id,position:{x,y,z},label,hint});
  interactions('lift',19.6,0.5,20.1,'昇降リフト','地上と屋上を移動');
  interactions('core',-35,0.6,45.8,'エーテル結晶','ショーケースの共鳴を起動');
  interactions('cafe',-51,0.5,7,'オービットカフェ','店内の照明を切り替える');
  interactions('mail',28,0.5,35,'住民用端末','暮らしのメッセージを読む');
  interactions('garden',39,roofY,34,'屋上菜園','植物保護装置を切り替える');
  interactions('beacon',46,roofY, -44,'星見台','屋上の魔導観測装置を起動');
  interactions('market',-28,0.5,-3,'ナイトマーケット','街の案内を読む');
  let cafeLamps=[];
  for(const z of [2,8,15]) { // individually toggleable cafe lamp overlays
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.42,8,6),new THREE.MeshBasicMaterial({color:0xffd39a,transparent:true,opacity:0.20,depthWrite:false}));
    lamp.position.set(-66,5.65,z);lamp.visible=false;animated.add(lamp);cafeLamps.push(lamp);
  }

  function interact(id){
    if(disposed) return null;
    switch(id){
      case 'lift':
        lift.target=lift.target>lift.max*0.5?0:lift.max;
        return {id,message:lift.target>0?'屋上テラスへ上昇。リフト中央に乗ってね。':'リフトを地上へ降下させる。',state:lift.target>0?'up':'down'};
      case 'core':
        toggles.conduitUntil=elapsed+19;
        return {id,message:'供給店のエーテル結晶が19秒間共鳴を開始。',state:'active'};
      case 'cafe':
        toggles.cafeLights=!toggles.cafeLights;
        return {id,message:toggles.cafeLights?'カフェの柔らかな間接光が灯った。':'カフェの照明を通常に戻した。',state:toggles.cafeLights?'on':'off'};
      case 'mail':
        return {id,message:'「夜の配達はドローンに任せた。庭の水やりは忘れないで。」',state:'read'};
      case 'garden':
        toggles.greenhouse=!toggles.greenhouse;
        return {id,message:toggles.greenhouse?'屋上菜園の魔導保温装置が稼働。':'屋上菜園の魔導保温装置を停止。',state:toggles.greenhouse?'on':'off'};
      case 'beacon':
        toggles.beacon=!toggles.beacon;
        return {id,message:toggles.beacon?'星見台がエーテル流を追跡し始めた。':'星見台の追跡を終了。',state:toggles.beacon?'on':'off'};
      case 'market':
        return {id,message:'LUMEN QUARTER：西は交易と工房、東は住宅と屋上庭園。東側に屋上リフトあり。',state:'read'};
      default: return null;
    }
  }

  function getNearestInteraction(position,range=3.4){
    if(!position)return null;
    let closest=null,distSq=range*range;
    for(const item of interactables){
      // E key available on both floors; lift can be operated from either landing.
      const anchorY=item.id==='lift'?((position.y-root.position.y)>9?roofY:0.32):item.position.y;
      const dx=(position.x-root.position.x)-item.position.x,dy=(position.y-root.position.y)-anchorY,dz=(position.z-root.position.z)-item.position.z;
      const r=dx*dx+dz*dz+dy*dy*0.16;
      if(r<distSq){distSq=r;closest=item;}
    }
    return closest?{...closest,position:{x:closest.position.x+root.position.x,y:closest.position.y+root.position.y,z:closest.position.z+root.position.z},distance:Math.sqrt(distSq)}:null;
  }
  function getGroundHeight(x,z,currentFootY=0.32){
    x-=root.position.x;z-=root.position.z;currentFootY-=root.position.y;
    let ground=0.32;
    for(const s of surfaces){
      if(x>=s.minX&&x<=s.maxX&&z>=s.minZ&&z<=s.maxZ&&currentFootY>=s.y-0.88){
        ground=Math.max(ground,s.y);
      }
    }
    if(x>liftX-2.75&&x<liftX+2.75&&z>liftZ-2.75&&z<liftZ+2.75){
      const deck=0.32+lift.position;
      if(currentFootY>=deck-0.96 && currentFootY<deck+2.0)ground=Math.max(ground,deck);
    }
    return ground+root.position.y;
  }
  function resolveMovement(origin,destination,radius=0.34,height=1.7){
    if(!origin||!destination)return destination;
    const lx=destination.x-root.position.x,lz=destination.z-root.position.z;
    const result={x:Math.max(bounds.minX,Math.min(bounds.maxX,lx)),y:destination.y,z:Math.max(bounds.minZ,Math.min(bounds.maxZ,lz))};
    const foot=(typeof origin.y==='number'?origin.y:0.32)-root.position.y;
    const ox=origin.x-root.position.x,oz=origin.z-root.position.z;
    function obstructed(x,z){
      for(const b of colliders){
        if(foot+height<b.minY+0.05||foot+0.15>b.maxY)continue;
        const nx=Math.max(b.minX,Math.min(x,b.maxX));
        const nz=Math.max(b.minZ,Math.min(z,b.maxZ));
        if((x-nx)*(x-nx)+(z-nz)*(z-nz)<radius*radius)return true;
      }
      return false;
    }
    // Axis-separable collision gives smooth wall sliding at low cost.
    if(obstructed(result.x,oz))result.x=ox;
    if(obstructed(result.x,result.z))result.z=oz;
    result.x+=root.position.x;result.z+=root.position.z;
    return result;
  }

  function update(dt=0,context={}){
    if(disposed)return;
    const delta=Math.min(0.08,Math.max(0,Number(dt)||0));elapsed+=delta;
    const step=lift.speed*delta;
    if(Math.abs(lift.target-lift.position)<step)lift.position=lift.target;
    else lift.position+=Math.sign(lift.target-lift.position)*step;
    liftGroup.position.y=lift.position;
    coreGroup.rotation.y+=delta*(toggles.conduitUntil>elapsed?1.4:0.31);
    coreRing1.rotation.z+=delta*0.38;coreRing2.rotation.x+=delta*0.30;
    coreGroup.position.y=2.9+Math.sin(elapsed*1.85)*0.19;
    dynamicCoreMat.emissiveIntensity=(toggles.conduitUntil>elapsed?3.5:1.6)+flash()*0.45;
    cafeLamps.forEach(lamp=>lamp.visible=toggles.cafeLights);
    observatory.rotation.y+=delta*(toggles.beacon?0.88:0.18);
    observatory.position.y=roofY+3.4+Math.sin(elapsed*1.4)*0.1;
    crystal.rotation.y+=delta*0.55;
    crystal.rotation.z+=delta*0.10;
    orbRing.rotation.y+=delta*(toggles.beacon?1.0:0.19);
    wayfinder.rotation.y+=delta*0.15;wayfinder.position.y=3.6+Math.sin(elapsed*1.2)*0.2;
    wayShape.rotation.y+=delta*0.15;wayRing.rotation.y+=delta*0.14;
    tram.position.set(0,25.7,78-((elapsed*6.4)%155));
    for(const {g,rotor,i} of drones){
      const t=elapsed*(0.36+i*0.035)+i*1.256;
      const west=i<3;
      g.position.set((west?-32:30)+Math.cos(t)*7.8,4.3+Math.sin(t*2+i)*0.6,(west?-5:4)+Math.sin(t)*17);
      g.rotation.y=-t;rotor.rotation.z+=delta*3.3;
    }
    // context is optional; it never carries a mandatory renderer/camera dependency.
    void context;
  }
  function setQuality(mode){
    quality=mode==='low'?'low':'high';
    high.visible=(quality==='high');
    cafeLamps.forEach(lamp=>{if(!toggles.cafeLights)lamp.visible=false;});
    for(const {rotor} of drones)rotor.visible=quality==='high';
    return quality;
  }
  function dispose(){
    if(disposed)return;disposed=true;
    const geoSet=new Set(geometries),matSet=new Set(Object.values(materials));
    root.traverse(object=>{
      if(object.isMesh){if(object.geometry)geoSet.add(object.geometry);
        if(Array.isArray(object.material))object.material.forEach(m=>matSet.add(m));
        else if(object.material)matSet.add(object.material);
      }
    });
    for(const geo of geoSet)geo.dispose();
    for(const mat of matSet){if(mat.map)mat.map.dispose();mat.dispose();}
    dynamicCoreMat.dispose();dynamicHaloMat.dispose();liftGlassMat.dispose();
    for(const t of signageTextures)t.dispose();
    root.clear();boxes.clear();cylinders.clear();spheres.clear();
    colliders.length=0;surfaces.length=0;interactables.length=0;
  }
  setQuality(quality);
  return {
    root,update,setQuality,dispose,interact,getNearestInteraction,
    getInteractions:()=>interactables.map(i=>({...i,position:{x:i.position.x+root.position.x,y:i.position.y+root.position.y,z:i.position.z+root.position.z}})),
    getGroundHeight,resolveMovement,
    getStatistics:()=>({quality,instances:{...matrices},drawMeshes:root.children.reduce((a,g)=>a+g.children.length,0),colliders:colliders.length,walkableSurfaces:surfaces.length,interactables:interactables.length}),
    getLiftState:()=>({height:lift.position,target:lift.target,maxHeight:lift.max}),
    spawn:{x:root.position.x,y:0.32+root.position.y,z:66+root.position.z,yaw:0},
    bounds:{minX:bounds.minX+root.position.x,maxX:bounds.maxX+root.position.x,minZ:bounds.minZ+root.position.z,maxZ:bounds.maxZ+root.position.z},
    metadata:{id:'AF02_LUMEN_QUARTER',name:'LUMEN QUARTER / 光環街区',team:'No.02',version:'1.0.0',units:'1m',up:'Y',forward:'-Z',three:'0.160.0',towerIncluded:false},
  };
}
if(typeof window!=='undefined')window.createAetherModule=createAetherModule;
