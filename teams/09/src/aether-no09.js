/**
 * AETHER FRONTIER / Team No.09
 * ARK VESPER | 「宵環級」超巨大エーテル空中戦艦
 * Three.js r160, meters, +Y up, forward -Z.
 * Stateless with regard to scene/camera/renderer/controls. No external textures.
 *
 * import { createAetherModule } from './aether-no09.js';
 * const m = createAetherModule(THREE, { quality:'high' });
 * scene.add(m.root); m.update(dt, { elapsedTime: seconds });
 */
export function createAetherModule(THREE, options = {}) {
  const root = new THREE.Group();
  root.name = 'AF09_ARK_VESPER';
  root.userData.moduleId = 'AF09';
  root.userData.forward = '-Z';
  root.userData.sizeMeters = { length: 392, beam: 220, height: 151 };
  const base = new THREE.Group();
  const high = new THREE.Group();
  const low = new THREE.Group();
  const moving = new THREE.Group();
  root.add(base, low, high, moving);
  const PI = Math.PI;
  const mat = {
    hull: new THREE.MeshStandardMaterial({color:0x233345, metalness:.70, roughness:.42, flatShading:true}),
    obsidian: new THREE.MeshStandardMaterial({color:0x101d2b, metalness:.66, roughness:.42}),
    armor: new THREE.MeshStandardMaterial({color:0x8c9da5, metalness:.76, roughness:.32, flatShading:true}),
    armorLight: new THREE.MeshStandardMaterial({color:0xc5ccd0, metalness:.67, roughness:.33}),
    gunmetal: new THREE.MeshStandardMaterial({color:0x364c5a, metalness:.8, roughness:.35}),
    gold: new THREE.MeshStandardMaterial({color:0xbb945f, metalness:.78, roughness:.29}),
    darkGold: new THREE.MeshStandardMaterial({color:0x665238, metalness:.68, roughness:.46}),
    blackGlass: new THREE.MeshStandardMaterial({color:0x082c43, emissive:0x083d56, emissiveIntensity:.75, metalness:.55, roughness:.15}),
    glow: new THREE.MeshBasicMaterial({color:0x4eeaff, toneMapped:false}),
    glowSoft: new THREE.MeshBasicMaterial({color:0x18a7d5, transparent:true, opacity:.6, depthWrite:false, toneMapped:false}),
    amber: new THREE.MeshBasicMaterial({color:0xffbd69, toneMapped:false}),
    violet: new THREE.MeshBasicMaterial({color:0x9a8dff, toneMapped:false}),
    flame: new THREE.MeshBasicMaterial({color:0x58eaff, transparent:true, opacity:.30, depthWrite:false, side:THREE.DoubleSide, toneMapped:false}),
    flameInner: new THREE.MeshBasicMaterial({color:0xc3feff, transparent:true, opacity:.50, depthWrite:false, side:THREE.DoubleSide, toneMapped:false}),
    hullVertex: new THREE.MeshStandardMaterial({vertexColors:true, metalness:.72, roughness:.40, flatShading:true, side:THREE.DoubleSide}),
  };
  const ownedGeometries = [];
  const ownedTextures = [];
  const G = (g) => { ownedGeometries.push(g); return g; };
  const sharedBox = G(new THREE.BoxGeometry(1,1,1));
  const sharedCylinder = G(new THREE.CylinderGeometry(.5,.5,1,12));
  const tmpO = new THREE.Object3D();
  const v3 = (x,y,z) => new THREE.Vector3(x,y,z);
  const segment = [
    [-193,1.4,12,-4],[-184,9,18,-11],[-167,19,22,-19],[-142,31,25,-26],
    [-107,44,27,-32],[-63,55,28,-37],[-14,62,28,-40],[49,63,28,-42],
    [106,55,27,-38],[143,43,25,-30],[171,32,22,-22],[187,24,16,-13]
  ];
  // Instanced box drawing batches keep the high-detail ship surprisingly inexpensive.
  class BoxBatch {
    constructor(){this.groups = new Map();}
    matrix(k,x,y,z,sx,sy,sz,rx=0,ry=0,rz=0) {
      tmpO.position.set(x,y,z); tmpO.rotation.set(rx,ry,rz);
      tmpO.scale.set(sx,sy,sz); tmpO.updateMatrix();
      if (!this.groups.has(k)) this.groups.set(k, []);
      this.groups.get(k).push(tmpO.matrix.clone());
    }
    between(k,a,b,w,d) {
      const aa = Array.isArray(a) ? v3(...a) : a, bb = Array.isArray(b) ? v3(...b) : b;
      const dir=bb.clone().sub(aa), length=dir.length();
      tmpO.position.copy(aa).add(bb).multiplyScalar(.5);
      tmpO.quaternion.setFromUnitVectors(v3(0,1,0),dir.multiplyScalar(1/length));
      tmpO.scale.set(w,length,d); tmpO.updateMatrix();
      if(!this.groups.has(k)) this.groups.set(k,[]);
      this.groups.get(k).push(tmpO.matrix.clone());
      tmpO.rotation.set(0,0,0); tmpO.quaternion.identity();
    }
    flush(into) {
      for(const [key,matrixes] of this.groups){
        const im=new THREE.InstancedMesh(sharedBox,mat[key],matrixes.length);
        for(let i=0;i<matrixes.length;i++) im.setMatrixAt(i,matrixes[i]);
        im.instanceMatrix.needsUpdate=true;
        im.frustumCulled=false; im.name=`detail_${key}`;
        into.add(im);
      }
    }
  }
  const common = new BoxBatch(), fine = new BoxBatch(), minimal = new BoxBatch();
  function mesh(geometry,material,parent,x=0,y=0,z=0){
    const m=new THREE.Mesh(G(geometry), material);
    m.position.set(x,y,z);parent.add(m);return m;
  }
  function prismXZ(parent,points,y,depth,material,name=''){
    const shape=new THREE.Shape();shape.moveTo(points[0][0],points[0][1]);
    for(let i=1;i<points.length;i++) shape.lineTo(points[i][0],points[i][1]);
    shape.closePath();
    const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:1,steps:1});
    g.rotateX(PI/2);
    const m=mesh(g,material,parent,0,y,0); m.name=name;
    return m;
  }
  function rod(parent,a,b,r,material,sides=8){
    const aa=v3(...a),bb=v3(...b),d=bb.clone().sub(aa);
    const m=mesh(new THREE.CylinderGeometry(r,r,d.length(),sides),material,parent);
    m.position.copy(aa).add(bb).multiplyScalar(.5);
    m.quaternion.setFromUnitVectors(v3(0,1,0),d.normalize());
    return m;
  }
  function torus(parent,x,y,z,r,tube,material,rotX=0,rotY=0,arc=PI*2){
    const m=mesh(new THREE.TorusGeometry(r,tube,8,96,arc),material,parent,x,y,z);
    m.rotation.set(rotX,rotY,0);return m;
  }
  function taper(parent,x,y,z,rTop,rBottom,length,material,rotX=0,rotZ=0,sides=8){
    const m=mesh(new THREE.CylinderGeometry(rTop,rBottom,length,sides,1),material,parent,x,y,z);
    m.rotation.set(rotX,0,rotZ);return m;
  }
  function crystal(parent,x,y,z,r,material,detail=0){
    const m=mesh(new THREE.OctahedronGeometry(r,detail),material,parent,x,y,z);return m;
  }
  // Hull: non-boxed multi-chine naval silhouette, broad stern, armored tapered bow.
  const ringShape=[[-.67,0],[-.89,-4.4],[-1,-12],[-.93,-21],[-.66,-.76],[-.38,-.92],[0,-1],[.38,-.92],[.66,-.76],[.93,-21],[1,-12],[.89,-4.4],[.67,0]];
  function pointOnRing(s,i){
    const [z,w,t,b]=s; const p=ringShape[i];
    const x=p[0]*w;
    let y;
    if(i<=3 || i>=9) y=t+p[1];
    else y=b+(t-b)*(1+p[1])*.26;
    if(i===6)y=b;
    return [x,y,z];
  }
  const vertices=[], colors=[];
  function triangle(a,b,c,col){
    const color=new THREE.Color(col);
    for(const p of [a,b,c]){vertices.push(...p);colors.push(color.r,color.g,color.b);}
  }
  const cSets=[0x526578,0x314557,0x233547,0x1a2939,0x1c2b3b,0x152231,0x101d2a,
               0x152231,0x1c2b3b,0x233547,0x314557,0x526578,0x586b79];
  for(let j=0;j<segment.length-1;j++){
    for(let i=0;i<ringShape.length;i++){
      const k=(i+1)%ringShape.length;
      const a=pointOnRing(segment[j],i),b=pointOnRing(segment[j],k);
      const c=pointOnRing(segment[j+1],i),d=pointOnRing(segment[j+1],k);
      const tint=(j%3===0 ? 1.13 : j%3===1 ? .93:1);
      const color=new THREE.Color(cSets[i]).multiplyScalar(tint);
      triangle(a,c,b,color);triangle(b,c,d,color);
    }
  }
  // Front and stern armor closure
  const front=segment[0],rear=segment.at(-1);
  for(let i=0;i<ringShape.length;i++){
    const ni=(i+1)%ringShape.length;
    triangle([0,4,front[0]],pointOnRing(front,ni),pointOnRing(front,i),0x354657);
    triangle([0,3,rear[0]],pointOnRing(rear,i),pointOnRing(rear,ni),0x172534);
  }
  const hullGeo=G(new THREE.BufferGeometry());
  hullGeo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  hullGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  hullGeo.computeVertexNormals();
  const hull=new THREE.Mesh(hullGeo,mat.hullVertex);hull.name='ChineArmor_MainHull';base.add(hull);
  // Outlined bevel-like armor ribs follow the hull cross section.
  for(const s of segment.slice(1,-1)){
    for(let i=0;i<12;i++){
      if(i===5 || i===6 || i===7)continue;
      common.between('gold',pointOnRing(s,i),pointOnRing(s,i+1),.68,.64);
    }
  }
  for(let j=0;j<segment.length-1;j++){
    for(const i of [1,2,3,4,8,9,10,11]){
      common.between(i===2||i===10 ? 'gold':'gunmetal',pointOnRing(segment[j],i),pointOnRing(segment[j+1],i),.65,.75);
    }
  }
  // Deep keel and side vents.
  prismXZ(base,[[-7,-179],[7,-179],[16,-100],[18,87],[10,172],[-10,172],[-18,87],[-16,-100]],-36,11,mat.obsidian,'CentralKeel');
  for(const side of [-1,1]){
    const keelFin=prismXZ(base,[[side*12,-98],[side*23,-62],[side*34,101],[side*12,159]],-22,14,mat.gunmetal,'AetherBallastFin');
    for(let i=0;i<26;i++){
      const z=-127+i*11.2,ww=26+Math.sin((i/25)*PI)*27;
      common.matrix('gunmetal',side*(ww+.5),8,z,1.7,6.3,7.3);
      common.matrix('glow',side*(ww+1.45),6,z,1,1.4,4.2);
      if(i%2===0)fine.matrix('gold',side*(ww+1.4),11.6,z,1.6,.5,6);
    }
  }
  // Prow ram and central long-energy rail.
  prismXZ(base,[[-6,-205],[6,-205],[18,-174],[-18,-174]],14,7,mat.armor,'ProwBlade');
  common.matrix('glow',0,20.5,-168,1.6,1,69);
  common.matrix('gold',0,21.5,-170,4,.8,65);
  for(const s of [-1,1]){
    prismXZ(base,[[s*2,-197],[s*8,-192],[s*23,-163],[s*19,-153]],14,4,mat.gunmetal);
    common.between('glow',[s*8,18,-194],[s*24,20,-159],.8,.8);
  }
  // Continuous top promenade: designed for actual first/third-person traversal.
  prismXZ(base,[[-13,-135],[13,-135],[17,-111],[18,-69],[18,118],[15,143],[-15,143],[-18,118],[-18,-69],[-17,-111]],32,4.5,mat.obsidian,'Walkable_MainDeck');
  for(let z=-125;z<=132;z+=9.5){
    common.matrix('gunmetal',0,32.17,z,30,.12,.45);
    for(const side of [-1,1]){
      common.matrix('gold',side*15.0,32.35,z,1.15,.28,5.2);
      fine.matrix('glow',side*13.55,32.25,z,0.25,.16,5.7);
    }
  }
  // An exposed forward promenade with ornamental protective rails.
  for(const side of [-1,1]){
    for(let z=-129;z<=128;z+=9){
      common.matrix('gold',side*17.4,35.2,z,.9,6.2,1);
      if(z%3!==0)fine.matrix('armor',side*17.4,38.5,z,1.1,.5,1.25);
    }
    common.matrix('gold',side*17.4,38.2,0,1.1,1,260);
    common.matrix('glow',side*17.4,38.45,0,.23,.23,260);
  }
  // Angular outer deck shoulders and segmented plating.
  for(const side of [-1,1]){
    const s=side;
    prismXZ(base,[[s*19,-139],[s*30,-126],[s*43,-100],[s*55,-45],[s*56,94],[s*41,143],[s*19,130]],27,4,mat.armor,'Shoulder_Armor');
    for(let z=-108;z<=123;z+=16){
      const w=43+11*Math.max(0,Math.sin((z+100)/215*PI));
      fine.matrix('hull',s*(w-12),27.20,z,16,.36,12);
      fine.matrix('gold',s*(w-19),27.44,z,.65,.26,11);
      fine.matrix('gunmetal',s*(w-4),27.2,z,5,.6,8.2);
    }
  }
  // Main bridge: suspended control citadel leaves a full-height central walkway open below.
  for(const s of [-1,1]){
    common.matrix('gunmetal',s*23,39,-37,11,21,58);
    common.matrix('gold',s*24,47,-37,12,.9,60);
    for(let z=-58;z<=-17;z+=10){
      common.matrix('blackGlass',s*23,46,z,11.3,6.2,5.8);
      fine.matrix('glow',s*23,49.35,z,11.6,.5,4.7);
    }
  }
  prismXZ(base,[[-28,-75],[28,-75],[37,-53],[37,-17],[27,4],[-27,4],[-37,-17],[-37,-53]],61,16,mat.hull,'Bridge_MainCitadel');
  prismXZ(base,[[-27,-75],[27,-75],[31,-58],[31,-20],[22,-9],[-22,-9],[-31,-20],[-31,-58]],65,4,mat.armor,'Bridge_SlopedArmor');
  prismXZ(base,[[-23,-60],[23,-60],[26,-45],[26,-28],[-26,-28],[-26,-45]],75,9,mat.obsidian,'Bridge_Canopy');
  prismXZ(base,[[-17,-67],[17,-67],[22,-46],[22,-30],[-22,-30],[-22,-46]],80,6,mat.blackGlass,'ObservationGallery');
  prismXZ(base,[[-17,-59],[17,-59],[19,-38],[12,-27],[-12,-27],[-19,-38]],86,6,mat.gunmetal,'CrownRoof');
  common.matrix('armorLight',0,86,-45,35,2,32);
  for(const side of [-1,1]){
    for(let z=-66;z<=-20;z+=9.2){
      common.matrix('glow',side*26.4,69,z,1.0,3.5,6.2);
      fine.matrix('gold',side*30,74,z,1.6,8,.75);
    }
  }
  taper(base,0,103,-44,0,6,30,mat.armor,0,0,6);
  taper(base,0,117,-44,.2,3.5,19,mat.glow,0,0,6);
  torus(base,0,86,-44,10,.8,mat.gold,PI/2);
  // Central elevated arc-reactor amphitheater, with rotating concentric apparatus.
  prismXZ(base,[[-29,12],[29,12],[38,61],[29,99],[-29,99],[-38,61]],46,12,mat.gunmetal,'ReactorPlinth');
  prismXZ(base,[[-21,22],[21,22],[26,62],[22,89],[-22,89],[-26,62]],52,3,mat.armor,'ReactorDais');
  for(const side of [-1,1]){
    common.matrix('gold',side*27,51,59,4,12,60);
    common.matrix('glow',side*29,57.5,59,1.6,1,58);
    for(let z=25;z<=89;z+=13){
      fine.matrix('armorLight',side*29,60,z,4,3,1.7);
    }
  }
  // Ring assemblies move entirely within own local transform, not the scene.
  function buildArcRing(parent,r,torusRotY=0){
    const pivot=new THREE.Group();parent.add(pivot);pivot.rotation.y=torusRotY;
    torus(pivot,0,0,0,r,2.0,mat.armor);
    torus(pivot,0,0,0,r-3,1.1,mat.gold);
    torus(pivot,0,0,0,r-5,.67,mat.glow);
    torus(pivot,0,0,0,r+2.6,.45,mat.glowSoft);
    const bat=new BoxBatch();
    for(let i=0;i<24;i++){
      const a=(i/24)*PI*2,x=Math.cos(a),y=Math.sin(a);
      bat.matrix('gold',x*(r+2),y*(r+2),0,2.1,7,2.3,0,0,a-PI/2);
      if(i%2===0) bat.matrix('glow',x*(r-8),y*(r-8),0,1.2,4,.6,0,0,a-PI/2);
      if(i%3===0) bat.matrix('armor',x*(r+6),y*(r+6),0,6,4,3,0,0,a);
    }
    bat.flush(pivot);
    return pivot;
  }
  const ringFrame=new THREE.Group();ringFrame.position.set(0,100,48);moving.add(ringFrame);
  const ringA=buildArcRing(ringFrame,34);
  const ringB=buildArcRing(ringFrame,25);
  ringB.position.z=4;ringB.rotation.z=PI/8;
  torus(ringFrame,0,0,-3,40,1.6,mat.gunmetal);
  torus(ringFrame,0,0,-3,41.7,.8,mat.amber);
  for(const side of [-1,1]){
    rod(base,[side*32,54,48],[side*39,90,48],2.6,mat.gold,6);
    rod(base,[side*39,90,48],[side*35,110,48],1.25,mat.gunmetal,6);
  }
  const heart=new THREE.Group();ringFrame.add(heart);
  crystal(heart,0,0,3,13,mat.violet,1);
  crystal(heart,0,0,3,9,mat.glow,0);
  torus(heart,0,0,3,17,.75,mat.gold,PI/2);
  // Distinct forward-to-aft swept wing masses, including optional side stabilizer apparatus.
  for(const side of [-1,1]){
    const s=side;
    const points=[[s*40,-87],[s*68,-75],[s*104,11],[s*109,54],[s*88,133],[s*63,150],[s*54,108],[s*60,17]];
    prismXZ(base,points,13,12,mat.gunmetal,`GravityWing_${s}`);
    prismXZ(base,[[s*54,-57],[s*76,-37],[s*94,28],[s*91,78],[s*72,116],[s*61,88]],19,4,mat.armor,`WingArmor_${s}`);
    for(let z=-46;z<=103;z+=13){
      const x=70+Math.sin((z+65)/190*PI)*15;
      common.matrix('gunmetal',s*x,20.3,z,15,.5,7.9);
      fine.matrix('gold',s*(x+5),20.8,z,4.5,.5,7);
    }
    common.between('glow',[s*67,22,-62],[s*97,20,49],1.4,1.4);
    common.between('glow',[s*99,20,53],[s*68,20,126],1.1,1.1);
    // Magical wing stabilizer disk, built in YZ plane.
    const stabilizer=new THREE.Group();stabilizer.position.set(s*94,30,63);moving.add(stabilizer);
    stabilizer.rotation.y=PI/2;
    const r=buildArcRing(stabilizer,16);
    r.userData.spinSign=s;
    moving.userData[`stabilizer${s}`]=r;
    crystal(stabilizer,0,0,1,5,mat.glow,0);
    for(const z of [-25,93]){
      common.matrix('armor',s*75,24,z,19,8,14);
      common.matrix('blackGlass',s*85,25,z,3,4,9);
    }
  }
  // Engine mechanical assembly: each engine is a self-contained long axis structure.
  const engines=[];
  function createEngine(x,y,z,r,outer){
    const g=new THREE.Group();g.position.set(x,y,z);base.add(g);
    taper(g,0,0,0,r*.85,r*1.05,48,mat.hull,PI/2,0,12);
    taper(g,0,0,-7,r*.81,r*.81,17,mat.gunmetal,PI/2,0,12);
    taper(g,0,0,10,r*.95,r*.95,17,mat.obsidian,PI/2,0,12);
    for(const dz of [-20,-8,9,21]){
      torus(g,0,0,dz,r+(dz===21? .3:1.4),1.4,mat.gold);
      torus(g,0,0,dz+.8,r-.8,.75,mat.glow);
    }
    torus(g,0,0,24,r-1,1.7,mat.armorLight);
    torus(g,0,0,24,r-4,1.1,mat.glow);
    const drive=mesh(new THREE.CircleGeometry(r-2,24),mat.glow,g,0,0,24.4);
    const core=mesh(new THREE.CircleGeometry(r-5,24),mat.violet,g,0,0,24.6);
    const blades=new BoxBatch();
    for(let i=0;i<12;i++){
      const a=i/12*PI*2;
      blades.matrix('armor',Math.cos(a)*(r+1),Math.sin(a)*(r+1),-5,2.5,5.5,42,0,0,a);
      blades.matrix('gunmetal',Math.cos(a)*(r+4),Math.sin(a)*(r+4),9,2,3,24,0,0,a);
    }
    blades.flush(g);
    const flame=mesh(new THREE.ConeGeometry(r*.68,40,12,1),mat.flame,g,0,0,42);
    flame.rotation.x=PI/2;
    const flameIn=mesh(new THREE.ConeGeometry(r*.30,26,12,1),mat.flameInner,g,0,0,35);
    flameIn.rotation.x=PI/2;
    engines.push({g,flame,flameIn,drive,core});
    return g;
  }
  for(const side of [-1,1]){
    createEngine(side*29,-1,166,13.5);
    createEngine(side*61,4,140,8.5);
    for(const z of [130,145,157]){
      common.matrix('armor',side*27,17,z,20,7,7);
      common.matrix('glow',side*27,21,z,16,.7,3);
    }
  }
  // Vertical fins and a segmented, glowing underslung graviton spine.
  for(const side of [-1,1]){
    prismXZ(base,[[side*15,109],[side*37,117],[side*45,176],[side*26,157]],31,12,mat.armor,'SternFin');
    common.between('glow',[side*40,31,170],[side*34,34,123],.9,.6);
  }
  for(let z=-145;z<=159;z+=17){
    common.matrix('gold',0,-39,z,4,2.4,11);
    common.matrix('glow',0,-40.4,z,1.2,1.5,8);
    if(z%2!==0)fine.matrix('armor',0,-42,z,10,2.1,5);
  }
  // Starboard open-sided two-level hangar. Entry ramp connects directly to main deck.
  prismXZ(base,[[36,38],[94,38],[94,111],[36,111]],27,6,mat.obsidian,'Walkable_HangarFloor');
  // The visible ramp uses an angled surface made from four triangles to descend from 32 to 27.
  const rampVerts=new Float32Array([
    15,32.1,56, 48,27.1,56, 15,32.1,96,
    48,27.1,56, 48,27.1,96, 15,32.1,96
  ]);
  const rampGeo=G(new THREE.BufferGeometry());
  rampGeo.setAttribute('position',new THREE.BufferAttribute(rampVerts,3));rampGeo.computeVertexNormals();
  const rampMesh=new THREE.Mesh(rampGeo,new THREE.MeshStandardMaterial({color:0x697989,side:THREE.DoubleSide,metalness:.65,roughness:.36}));
  rampMesh.name='Walkable_HangarRamp';base.add(rampMesh);
  for(let i=0;i<15;i++){
    const x=15+i*2.23,y=32.1-i*.335;
    common.matrix('gold',x,y+.18,58,.5,.2,4);
    common.matrix('gold',x,y+.18,94,.5,.2,4);
  }
  for(const z of [39,110]){
    common.matrix('armor',64,37,z,58,20,3.6);
    common.matrix('glow',64,44,z,54,.9,1.0);
  }
  for(const x of [39,94]){
    common.matrix('gunmetal',x,35,74.5,3,22,71);
    common.matrix('gold',x,47,74.5,3,2,74);
  }
  for(let z=46;z<=107;z+=10){
    common.matrix('armor',66,47,z,57,3,1.8);
    fine.matrix('glow',66,46,z,44,.35,.55);
    for(const x of [45,85]){
      common.matrix('gunmetal',x,49,z,12,1.8,4.6);
    }
  }
  // Inset safety paths and interactive floodlit machinery.
  common.matrix('gold',64,27.32,43,51,.23,.8);
  common.matrix('gold',64,27.32,106,51,.23,.8);
  for(let z=49;z<=104;z+=7){
    fine.matrix('amber',46,27.42,z,3.4,.16,.5);
    fine.matrix('amber',87,27.42,z,3.4,.16,.5);
  }
  for(const z of [56,99]){
    for(const x of [43,88]){
      common.matrix('gold',x,33,z,4,12,4);
      common.matrix('glow',x,40,z,4,.9,4);
    }
  }
  // Service craft on the aft hangar stand.
  const craft = new THREE.Group(); craft.position.set(68,30,87);base.add(craft);
  prismXZ(craft,[[-3,-15],[3,-15],[7,-2],[6,10],[-6,10],[-7,-2]],3,5,mat.armor,'HangarShuttle');
  prismXZ(craft,[[-4,-5],[4,-5],[5,4],[-5,4]],6,2,mat.blackGlass);
  prismXZ(craft,[[-5,0],[-20,9],[-17,13],[-3,8],[3,8],[17,13],[20,9],[5,0]],4,2.5,mat.gunmetal);
  for(const sx of [-1,1]){
    taper(craft,sx*5,1,10,2,2.8,12,mat.hull,PI/2,0,8);
    torus(craft,sx*5,1,16,2.5,.6,mat.glow);
  }
  // Sliding blast shutters at the outer edge of the hangar (fully animated).
  const shutters=[];
  for(const z of [55.25,92.75]){
    const door=new THREE.Group();door.position.set(94,34.5,z);moving.add(door);
    const d=mesh(new THREE.BoxGeometry(2.5,14,34),mat.armor,door);
    const db=new BoxBatch();
    db.matrix('hull',1.4,0,0,.2,11,30);
    for(let q=-13;q<=13;q+=6.5){
      db.matrix('gold',1.6,0,q,.5,13,1);
      db.matrix('glow',1.8,0,q+.8,.3,11,.5);
    }
    db.flush(door);shutters.push({door,z});
  }
  // 4 luminous capacitors and 2 elevated observation docking pads.
  for(const side of [-1,1]){
    for(const z of [-116,120]){
      const g=new THREE.Group();g.position.set(side*39,36,z);base.add(g);
      taper(g,0,0,0,9,11,9,mat.gunmetal,0,0,10);
      torus(g,0,5,0,9,.75,mat.gold,PI/2);
      crystal(g,0,8,0,4,mat.glow,0);
      for(let i=0;i<8;i++){
        const a=i/8*PI*2;fine.matrix('armor',side*39+Math.sin(a)*11,39,z+Math.cos(a)*11,2,8,2);
      }
    }
  }
  // Stylized orbital-energy emitters: purely aesthetic slow-moving turrets.
  const turrets=[];
  for(const side of [-1,1]) for(const z of [-99,10,117]){
    const group=new THREE.Group();group.position.set(side*48,32,z);base.add(group);
    taper(group,0,0,0,8,10,7,mat.hull,0,0,8);
    torus(group,0,4.2,0,8.5,.65,mat.gold,PI/2);
    const spin=new THREE.Group();spin.position.y=6;group.add(spin);
    taper(spin,0,0,0,5.2,6,7,mat.armor,0,0,8);
    const emitter=new THREE.Group();emitter.position.z=-3;spin.add(emitter);
    for(const s of [-1,1]){
      const rail=mesh(new THREE.CylinderGeometry(1.2,1.9,16,8),mat.gunmetal,emitter,s*3,0,-10);
      rail.rotation.x=PI/2;
      torus(emitter,s*3,0,-18,1.9,.5,mat.glow);
      torus(emitter,s*3,0,-12,2.2,.4,mat.gold);
    }
    turrets.push({spin,z,side});
  }
  // High-resolution-only micro details, traffic marking, ribs, screws, coolers, signal nodes.
  for(const side of [-1,1]){
    for(let z=-126;z<135;z+=5){
      fine.matrix('armor',side*12.5,32.39,z,1.5,.17,2.0);
      for(const y of [-11,-18,-26]){
        const w=side*(44+9*Math.cos((z+20)/270*PI));
        fine.matrix('gunmetal',w,y,z,2.0,3.0,2.0);
        if(z%3!==0)fine.matrix('gold',w+side*1.25,y,z,.4,2.5,1.5);
      }
    }
    for(let z=-84;z<=135;z+=7.2){
      for(let k=0;k<3;k++){
        const x=side*(32+k*5.2);
        fine.matrix('obsidian',x,27.62,z,3.7,.28,4);
        fine.matrix(k===1 ? 'gold':'hull',x,27.82,z,3.1,.14,3.4);
      }
    }
    for(const z of [-139,-107,-70,-35,2,43,85,118,151]){
      for(let i=0;i<5;i++){
        const x=side*(17+i*9);
        fine.matrix('gold',x,28.1,z,2,.35,.7);
        fine.matrix('obsidian',x,28.4,z,1,.35,1);
      }
    }
    for(let z=-87;z<=110;z+=15){
      fine.matrix('glow',side*62,11,z,.4,1.7,10);
      fine.matrix('gold',side*62,11,z+6,.8,3,2);
    }
    for(const zz of [151,160,169]){
      fine.matrix('gold',side*29,17,zz,19,.9,1.0);
    }
  }
  for(let z=-114;z<134;z+=12){
    fine.matrix('armor',0,32.43,z,3,.1,6.4);
    fine.matrix('glow',0,32.56,z,.35,.12,4.0);
  }
  for(let z=53;z<=100;z+=9){
    fine.matrix('obsidian',58,27.3,z,11,.3,5);
    fine.matrix('gold',58,27.52,z,5,.22,1.2);
  }
  // Additional greebles are only instantiated in high mode.
  for(const side of [-1,1]){
    for(let z=-143;z<146;z+=7){
      const x=side*(50+12*Math.sin((z+140)/286*PI));
      minimal.matrix('gold',x,25.1,z,1.1,1.1,2.5);
    }
  }
  common.flush(base);fine.flush(high);minimal.flush(low);
  // Legible hull markings (tiny number of canvas textures, no external image requests).
  const signs=[];
  function makeSign(lines,color='#d7faff',accent='#f5bc71'){
    if(typeof document==='undefined')return null;
    const cv=document.createElement('canvas');cv.width=1024;cv.height=256;
    const c=cv.getContext('2d');
    c.clearRect(0,0,1024,256);
    c.strokeStyle=accent;c.lineWidth=9;c.beginPath();c.moveTo(30,29);c.lineTo(994,29);c.moveTo(30,226);c.lineTo(994,226);c.stroke();
    c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';
    c.font='bold 93px system-ui, Arial';c.fillText(lines[0],512,121);
    c.fillStyle=accent;c.font='bold 37px system-ui, Arial';c.fillText(lines[1]||'AETHER FLEET',512,192);
    const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;
    tex.anisotropy=4;ownedTextures.push(tex);
    return new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,side:THREE.DoubleSide, toneMapped:false});
  }
  const lettering=makeSign(['ARK VESPER','09 // AETHER NAVY']);
  if(lettering){
    const face=mesh(new THREE.PlaneGeometry(38,9),lettering,base,0,86.3,-45);
    face.rotation.x=-PI/2; signs.push(face);
    for(const side of [-1,1]){
      const s=mesh(new THREE.PlaneGeometry(34,8.5),lettering,base,side*56,-2,-32);
      s.rotation.y=side*PI/2;signs.push(s);
    }
  }
  const anchorList=[
    {id:'deck_bow',label:'前部甲板',position:[0,32,-115],forward:[0,0,-1]},
    {id:'deck_mid',label:'中央甲板',position:[0,32,10],forward:[0,0,-1]},
    {id:'deck_stern',label:'後部甲板',position:[0,32,117],forward:[0,0,1]},
    {id:'hangar',label:'右舷格納庫',position:[67,27,72],forward:[1,0,0]},
    {id:'hangar_entrance',label:'格納庫スロープ',position:[33,29,75],forward:[1,0,0]},
    {id:'bridge_view',label:'艦橋展望',position:[0,80,-46],forward:[0,0,-1]},
    {id:'reactor',label:'エーテル主炉',position:[0,100,48],forward:[0,0,-1]},
    {id:'engine_left',label:'左舷主推進機',position:[-29,-1,190],forward:[0,0,1]},
    {id:'engine_right',label:'右舷主推進機',position:[29,-1,190],forward:[0,0,1]},
  ];
  const walkables=[
    {id:'main_deck',kind:'deck',minX:-17.2,maxX:17.2,minZ:-128,maxZ:139,y:32.18},
    {id:'hangar_ramp',kind:'ramp',minX:15,maxX:48,minZ:56,maxZ:96,yAt:(x)=>32.1-(x-15)*5/33},
    {id:'hangar',kind:'deck',minX:36,maxX:92,minZ:39,maxZ:109,y:27.18}
  ];
  // Cloneable descriptors for the integrating player-physics team.
  root.userData.anchors=anchorList;
  root.userData.walkableSurfaces=walkables.map(({yAt,...p})=>({...p, slope:typeof yAt==='function'?'x:32.1-(x-15)*5/33':null}));
  const sampleWalkable=(x,z,lastY=32.18)=>{
    const choices=[];
    for(const s of walkables){
      if(x>=s.minX && x<=s.maxX && z>=s.minZ && z<=s.maxZ){
        const y=s.yAt ? s.yAt(x) : s.y;
        choices.push(y);
      }
    }
    if(!choices.length)return null;
    choices.sort((a,b)=>Math.abs(a-lastY)-Math.abs(b-lastY));
    return choices[0];
  };
  let quality='high', clock=0, boost=0, doorTarget=1, doorOpenness=1;
  function setQuality(mode){
    quality=(mode==='low'||mode==='lite')?'low':'high';
    high.visible=quality==='high';low.visible=quality==='low';
    mat.flame.opacity=quality==='high'?.30:.17;
    mat.flameInner.opacity=quality==='high'?.5:.3;
    for(const e of engines)e.flame.visible=quality==='high';
    return quality;
  }
  function update(dt=0,context={}){
    dt=Math.max(0,Math.min(.1,Number(dt)||0));
    if(Number.isFinite(context.elapsedTime))clock=context.elapsedTime;
    else clock+=dt;
    boost=Math.max(0,boost-dt*.65);
    ringA.rotation.z=clock*(.10+boost*.5);
    ringB.rotation.z=-clock*(.17+boost*.7)+PI/8;
    heart.rotation.y=clock*.3;
    heart.rotation.x=Math.sin(clock*.45)*.11;
    ringFrame.position.y=100+Math.sin(clock*.7)*.7;
    for(const s of [-1,1]){
      const ring=moving.userData[`stabilizer${s}`];
      if(ring)ring.rotation.z=clock*.14*s;
    }
    for(let i=0;i<engines.length;i++){
      const a=clock*5+i*2;
      engines[i].flame.scale.set(1+Math.sin(a)*.09,1+Math.cos(a)*.09,1+Math.sin(a)*.09);
      engines[i].flameIn.scale.set(1+Math.sin(a+1)*.1,1,1+Math.sin(a+1)*.1);
    }
    for(const t of turrets)t.spin.rotation.y=Math.sin(clock*.18+t.z*.02)*.27+t.side*.15;
    doorOpenness+= (doorTarget-doorOpenness)*Math.min(1,dt*2.4);
    shutters[0].door.position.z=55.25-17*doorOpenness;
    shutters[1].door.position.z=92.75+17*doorOpenness;
  }
  function getAnchors(){return anchorList.map(a=>({...a,position:[...a.position],forward:[...a.forward]}));}
  function getWalkableSurfaces(){return root.userData.walkableSurfaces.map(s=>({...s}));}
  function triggerPulse(){boost=2.5;}
  function setHangarOpen(open){doorTarget=open?1:0;}
  // Memory ownership: no shared assets in client renderer are disposed.
  let disposed=false;
  function dispose(){
    if(disposed)return;disposed=true;
    const uniqG=new Set(ownedGeometries),uniqM=new Set(Object.values(mat));
    root.traverse(o=>{
      if(o.isMesh||o.isInstancedMesh){if(o.geometry)uniqG.add(o.geometry);
        if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>uniqM.add(m));}
      }
    });
    for(const g of uniqG)g.dispose();
    for(const m of uniqM)m.dispose();
    for(const t of ownedTextures)t.dispose();
    root.clear();
  }
  setQuality(options.quality||'high');
  if(options.position)root.position.set(...options.position);
  if(options.rotationY!==undefined)root.rotation.y=options.rotationY;
  if(options.scale!==undefined)root.scale.setScalar(options.scale);
  update(0,{});
  return {
    root,update,setQuality,dispose,getAnchors,getWalkableSurfaces,
    sampleWalkable,setHangarOpen,triggerPulse,
    metadata:{id:'AF09',name:'ARK VESPER',type:'aether_dreadnought',forward:'-Z',unit:'meters',
      length:392,beam:220,qualityModes:['low','high'],origin:'ship-center',deckHeight:32.18}
  };
}
