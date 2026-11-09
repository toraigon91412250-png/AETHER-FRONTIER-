/** No.12 RIFT HOUND driving proving ground. Three.js r160. */
import { createAetherModule } from './aether-vehicle.js';
import { createGroundDriver } from './aether-driver.js';

export async function startRiftHoundDemo(THREE) {
  const $=id=>document.getElementById(id);
  const canvas=$('scene');
  const loader=$('loading');
  const lowPower=window.matchMedia?.('(pointer:coarse)').matches ?? false;
  let quality='low';
  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0x0a1423);
  scene.fog=new THREE.FogExp2(0x122033,.0026);
  const camera=new THREE.PerspectiveCamera(64,1,.08,920);
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance',stencil:false});
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.20;
  const hemi=new THREE.HemisphereLight(0x9fcaff,0x1b2531,2.1);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xffd5a6,2.55);sun.position.set(-65,100,-85);scene.add(sun);
  sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
  sun.shadow.camera.left=-75;sun.shadow.camera.right=75;sun.shadow.camera.top=75;sun.shadow.camera.bottom=-75;
  sun.shadow.camera.near=1;sun.shadow.camera.far=250;sun.shadow.bias=-.00035;
  sun.target.position.set(0,0,-20);scene.add(sun.target);
  const world=new THREE.Group();world.name='No12 Proving Ground';scene.add(world);
  const lowDetail=new THREE.Group();world.add(lowDetail);
  const highDetail=new THREE.Group();world.add(highDetail);
  const moving=new THREE.Group();world.add(moving);
  const collisionFree=new THREE.Group();world.add(collisionFree);
  const rng=(seed=>()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296)(120612);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const groundHeight=(x,z)=>.37*Math.sin(x*.036)*Math.cos(z*.023)+.28*Math.sin(z*.041+x*.032)+.12*Math.sin(x*.18+z*.12);
  const roadWidth=11.7;
  const knots=[[0,0],[4,-48],[41,-85],[103,-79],[144,-36],[145,20],[111,72],[58,110],[-6,109],[-70,84],[-119,34],[-126,-27],[-85,-77],[-37,-67]];
  const path=new THREE.CatmullRomCurve3(knots.map(v=>new THREE.Vector3(v[0],0,v[1])),true,'catmullrom',.33);
  const N=420;
  const trackPts=[],trackNormals=[];
  for(let i=0;i<=N;i++) {
    const p=path.getPointAt(i/N),t=path.getTangentAt(i/N).normalize();
    trackPts.push(new THREE.Vector3(p.x,groundHeight(p.x,p.z),p.z));
    trackNormals.push(new THREE.Vector3(-t.z,0,t.x));
  }
  const sampledRoad=[];
  for(let i=0;i<N;i+=3)sampledRoad.push(trackPts[i]);
  function distanceToRoad(x,z) {
    let min=Infinity;
    for(let i=0;i<sampledRoad.length;i++){
      const p=sampledRoad[i],dx=x-p.x,dz=z-p.z;const d=dx*dx+dz*dz;
      if(d<min)min=d;
    }
    return Math.sqrt(min);
  }
  function onRoad(x,z){return distanceToRoad(x,z)<=roadWidth*.53;}
  const ground=new THREE.PlaneGeometry(660,660,144,144);
  ground.rotateX(-Math.PI/2);
  const pos=ground.getAttribute('position');
  const shades=[];
  for(let i=0;i<pos.count;i++) {
    const x=pos.getX(i),z=pos.getZ(i);
    // Height exactly matches the driver terrain adapter: no invisible bumps / sinking.
    const baseline=groundHeight(x,z);
    pos.setY(i,baseline);
    const p=clamp(.33+.15*Math.sin(x*.021)+.12*Math.sin(z*.017)+rng()*.12,0,1);
    shades.push(.10+p*.12,.21+p*.15,.27+p*.15);
  }
  ground.setAttribute('color',new THREE.Float32BufferAttribute(shades,3));ground.computeVertexNormals();
  const floor=new THREE.Mesh(ground,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.98,metalness:.02,side:THREE.FrontSide}));
  floor.receiveShadow=true;world.add(floor);

  function createRibbon(width, offset, color, materialType='road', dash=false) {
    const vertices=[],normals=[],cols=[];let index=[];
    for(let i=0;i<=N;i++){
      const p=trackPts[i],v=trackNormals[i];
      const cx=p.x+v.x*offset,cz=p.z+v.z*offset;
      const y=groundHeight(cx,cz)+.08;
      const isDash=!dash||(Math.floor(i/7)%2===0);
      for(const d of [-width*.5,width*.5]) {
        vertices.push(cx+v.x*d,y,cz+v.z*d);
        const c=new THREE.Color(isDash?color:0x192531);
        if(materialType==='road')c.multiplyScalar(.98+.02*Math.sin(i*.2));
        cols.push(c.r,c.g,c.b);
      }
      if(i<N){const a=i*2;index.push(a,a+1,a+3,a,a+3,a+2);}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    g.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));g.setIndex(index);g.computeVertexNormals();
    let m=materialType==='road'?new THREE.MeshStandardMaterial({vertexColors:true,metalness:.33,roughness:.83,side:THREE.DoubleSide}):
      new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,depthWrite:false});
    const o=new THREE.Mesh(g,m);o.receiveShadow=materialType==='road';world.add(o);return o;
  }
  createRibbon(roadWidth,0,0x25343e);
  for(const s of [-1,1]) {
    createRibbon(.19,s*(roadWidth/2-.38),s===-1?0x1aa3a5:0xc89b60,'lines');
    createRibbon(.68,s*3.73,0x2a4650,'lines',true);
  }
  createRibbon(.18,0,0xb38e5e,'lines',true);
  const stoneMat=new THREE.MeshStandardMaterial({color:0x263544,roughness:.96,metalness:.04,flatShading:true});
  const stoneMat2=new THREE.MeshStandardMaterial({color:0x34495a,roughness:.93,metalness:.05,flatShading:true});
  const relicMat=new THREE.MeshStandardMaterial({color:0x647180,roughness:.73,metalness:.5,flatShading:true});
  const metalMat=new THREE.MeshStandardMaterial({color:0x345366,roughness:.46,metalness:.76});
  const goldMat=new THREE.MeshStandardMaterial({color:0xc6a36d,roughness:.36,metalness:.7});
  const lightMat=new THREE.MeshBasicMaterial({color:0x52e4e5});
  const warmMat=new THREE.MeshBasicMaterial({color:0xffc47e});
  function entity(geometry,material,x,y,z,parent=world){const o=new THREE.Mesh(geometry,material);o.position.set(x,y,z);parent.add(o);return o;}
  function bar(parent,a,b,r,material,sides=6){
    const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),vec=B.clone().sub(A);
    const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r,vec.length(),sides),material);
    o.position.copy(A.add(B).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vec.normalize());parent.add(o);return o;
  }
  // Efficient instanced basalt clusters / ruins far from the racing surface.
  for(const [geometry,material,count,group,condition] of [
    [new THREE.DodecahedronGeometry(1,0),stoneMat,230,lowDetail,17],
    [new THREE.IcosahedronGeometry(1,0),stoneMat2,100,highDetail,21],
    [new THREE.ConeGeometry(.7,2.7,5),relicMat,85,highDetail,17]
  ]) {
    const inst=new THREE.InstancedMesh(geometry,material,count);
    const dummy=new THREE.Object3D();let actual=0,tries=0;
    while(actual<count&&tries++<count*60){
      const x=(rng()-.5)*580,z=(rng()-.5)*580;
      if(distanceToRoad(x,z)<condition)continue;
      const ss=.7+rng()*2.6;
      dummy.position.set(x,groundHeight(x,z)+ss*.25,z);
      dummy.rotation.set(rng()*1.4,rng()*6.28,rng()*.6);
      dummy.scale.set(ss*(.65+rng()*.4),ss*(.35+rng()*1.6),ss);
      dummy.updateMatrix();inst.setMatrixAt(actual++,dummy.matrix);
    }
    inst.count=actual;inst.instanceMatrix.needsUpdate=true;group.add(inst);
  }
  const crystalGeom=new THREE.OctahedronGeometry(1,0);
  const shardMat=new THREE.MeshStandardMaterial({color:0x4bd6cb,roughness:.22,metalness:.3,emissive:0x066269,emissiveIntensity:1.2,flatShading:true});
  const crystalInst=new THREE.InstancedMesh(crystalGeom,shardMat,110);
  const dummy=new THREE.Object3D();let numCrystal=0;
  for(let tries=0;numCrystal<110&&tries<9000;tries++){
    const x=(rng()-.5)*520,z=(rng()-.5)*520;
    if(distanceToRoad(x,z)<19)continue;
    const h=1+rng()*3.9;
    dummy.position.set(x,groundHeight(x,z)+h*.4,z);
    dummy.rotation.set(.06,rng()*Math.PI*2,.17);dummy.scale.set(.45+rng(),h*.61,.45+rng());
    dummy.updateMatrix();crystalInst.setMatrixAt(numCrystal++,dummy.matrix);
  }
  crystalInst.count=numCrystal;crystalInst.instanceMatrix.needsUpdate=true;highDetail.add(crystalInst);
  // Distant fortress silhouettes.
  const towerG=new THREE.CylinderGeometry(.7,1.7,1,5);
  const towerMat=new THREE.MeshStandardMaterial({color:0x182b3c,roughness:.99,flatShading:true});
  const towers=new THREE.InstancedMesh(towerG,towerMat,56);
  for(let i=0;i<56;i++){
    const a=i*2*Math.PI/56,rad=248+15*Math.sin(i*2.47),h=17+rng()*58;
    dummy.position.set(Math.sin(a)*rad,h*.46-3,Math.cos(a)*rad);
    dummy.rotation.set(0,a,0);dummy.scale.set(5+rng()*4,h,5+rng()*4);dummy.updateMatrix();towers.setMatrixAt(i,dummy.matrix);
  }
  towers.instanceMatrix.needsUpdate=true;lowDetail.add(towers);
  // Roadside illuminated posts. Lightweight instancing.
  const pegGeom=new THREE.BoxGeometry(.13,.96,.18);
  const peg=new THREE.InstancedMesh(pegGeom,metalMat,138),marker=new THREE.InstancedMesh(new THREE.BoxGeometry(.14,.16,.2),lightMat,138);
  let pegIdx=0;
  for(let i=0;i<N;i+=6){
    for(const side of [-1,1]){
      const p=trackPts[i],d=trackNormals[i],x=p.x+d.x*side*7.1,z=p.z+d.z*side*7.1;
      dummy.position.set(x,groundHeight(x,z)+.47,z);dummy.rotation.set(0,Math.atan2(d.x,d.z),0);dummy.scale.set(1,1,1);dummy.updateMatrix();peg.setMatrixAt(pegIdx,dummy.matrix);
      dummy.position.y+=.42;dummy.updateMatrix();marker.setMatrixAt(pegIdx,dummy.matrix);pegIdx++;
      if(pegIdx>=138)break;
    }
    if(pegIdx>=138)break;
  }
  peg.count=pegIdx;marker.count=pegIdx;peg.instanceMatrix.needsUpdate=true;marker.instanceMatrix.needsUpdate=true;
  highDetail.add(peg,marker);

  function trackPose(t){
    const p=path.getPointAt(t),tan=path.getTangentAt(t).normalize();
    return {p:new THREE.Vector3(p.x,groundHeight(p.x,p.z),p.z),tan,yaw:Math.atan2(-tan.x,-tan.z)};
  }
  const gates=[];const gateTimes=[.112,.250,.388,.526,.666,.805,.956];
  function buildGate(t,number) {
    const pose=trackPose(t);
    const parent=new THREE.Group();parent.position.copy(pose.p);parent.rotation.y=pose.yaw;moving.add(parent);
    const bright=number===gateTimes.length-1;
    const metal=bright?goldMat:metalMat,glow=bright?warmMat:lightMat;
    for(const side of [-1,1]){
      bar(parent,[side*6.4,0,0],[side*6.4,5.3,0],.17,metal,6);
      bar(parent,[side*6.4,4.2,0],[side*5.4,5.25,0],.085,glow,6);
      const boot=entity(new THREE.BoxGeometry(.7,.35,.8),metal,side*6.4,.18,0,parent);
      boot.castShadow=false;
      entity(new THREE.OctahedronGeometry(.21,0),glow,side*6.4,5.3,0,parent);
    }
    bar(parent,[-5.4,5.25,0],[5.4,5.25,0],.085,glow,6);
    const crystal=entity(new THREE.OctahedronGeometry(.65,0),glow,0,5.05,0,parent);
    crystal.rotation.y=.5;
    const plate=entity(new THREE.BoxGeometry(1.4,.48,.18),metal,0,5.96,0,parent);
    const active=bright?new THREE.Color(0xffc985):new THREE.Color(0x44e8e6);
    parent.userData.pulse=0;parent.userData.crystal=crystal;
    gates.push({t,pose,root:parent,crystal,bright,active,passed:false,pulse:0});
  }
  gateTimes.forEach(buildGate);
  const pads=[];
  for(const t of [.199,.625]) {
    const pose=trackPose(t),g=new THREE.Group();g.position.copy(pose.p);g.position.y+=.14;g.rotation.y=pose.yaw;moving.add(g);
    const panel=entity(new THREE.BoxGeometry(5.2,.09,7.6),metalMat,0,0,0,g);panel.castShadow=false;
    for(const side of [-1,1])bar(g,[side*2.05,.09,2.7],[side*2.05,.09,-2.7],.08,warmMat,5);
    for(let j=0;j<4;j++)bar(g,[-1.5,.09,-2.45+j*1.4],[1.5,.09,-2.45+j*1.4],.045,lightMat,5);
    const ring=entity(new THREE.TorusGeometry(.9,.065,6,32),warmMat,0,.13,0,g);ring.rotation.x=Math.PI/2;
    pads.push({root:g,t,pose,ring,cooldown:0});
  }
  const chargeCells=[];
  for(const t of [.067,.323,.475,.744,.879]) {
    const p=trackPose(t).p;
    const parent=new THREE.Group();parent.position.set(p.x,p.y+1.23,p.z);moving.add(parent);
    const gem=entity(new THREE.OctahedronGeometry(.48,0),lightMat,0,0,0,parent);
    const halo=entity(new THREE.TorusGeometry(.63,.032,5,28),warmMat,0,0,0,parent);
    chargeCells.push({parent,gem,halo,respawn:0,initialY:p.y+1.23});
  }
  // Ambient motes in sky, static one draw call.
  const dustPos=[];
  for(let i=0;i<570;i++){
    const angle=rng()*Math.PI*2,r=80+rng()*300;
    dustPos.push(Math.sin(angle)*r,20+rng()*125,Math.cos(angle)*r);
  }
  const dustG=new THREE.BufferGeometry();dustG.setAttribute('position',new THREE.Float32BufferAttribute(dustPos,3));
  world.add(new THREE.Points(dustG,new THREE.PointsMaterial({color:0x6599a8,size:.42,transparent:true,opacity:.58,depthWrite:false})));

  const vehicle=createAetherModule(THREE,{quality});scene.add(vehicle.root);
  const pose=trackPose(0);
  const driver=createGroundDriver(vehicle,{groundHeight,onRoad,spawn:{x:pose.p.x,z:pose.p.z,yaw:pose.yaw}});
  vehicle.update(0);
  // Ground sparks + turbo particles, instanced with a hard cap and low draw overhead.
  const particleTotal=92;
  const particles=[];
  const particleMesh=new THREE.InstancedMesh(new THREE.TetrahedronGeometry(.095,0),new THREE.MeshBasicMaterial({color:0x4cf6ff,transparent:true,opacity:.75,depthWrite:false}),particleTotal);
  particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);particleMesh.frustumCulled=false;scene.add(particleMesh);
  const pObj=new THREE.Object3D();
  for(let i=0;i<particleTotal;i++)particles.push({life:0,x:0,y:-3000,z:0,vx:0,vy:0,vz:0});
  function spawnTrail(st,dt){
    if(!(st.boosting||st.drifting||Math.abs(st.speed)>35))return;
    const amount=st.boosting?5:st.drifting?3:1;
    for(let i=0;i<amount;i++){
      const particle=particles.find(p=>p.life<=0);if(!particle)break;
      const side=(rng()-.5)*1.8;
      const sx=Math.cos(st.yaw),sz=-Math.sin(st.yaw),bx=Math.sin(st.yaw),bz=Math.cos(st.yaw);
      particle.x=st.x+bx*2.3+sx*side;
      particle.z=st.z+bz*2.3+sz*side;
      particle.y=st.y+(st.boosting?1.14:.23)+rng()*.16;
      particle.life=.32+rng()*.48;
      particle.vx=bx*(5+rng()*5)+sx*(rng()-.5)*3;
      particle.vz=bz*(5+rng()*5)+sz*(rng()-.5)*3;
      particle.vy=st.boosting?(rng()-.5)*2:1+rng()*2;
    }
  }
  function updateParticles(dt) {
    const count=quality==='low'?40:particleTotal;
    for(let i=0;i<particleTotal;i++){
      const p=particles[i];p.life-=dt;
      if(i<count&&p.life>0){
        p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
        const s=clamp(p.life*2,.05,1.8);
        pObj.position.set(p.x,p.y,p.z);pObj.scale.setScalar(s);pObj.rotation.y+=dt*3;
      }else{pObj.position.set(0,-3000,0);pObj.scale.setScalar(.001);}
      pObj.updateMatrix();particleMesh.setMatrixAt(i,pObj.matrix);
    }
    particleMesh.count=count;
    particleMesh.instanceMatrix.needsUpdate=true;
  }

  // Keyboard & pointer-controlled touch pads. Pointer capture makes holds reliable on Safari.
  const held=new Set(), touches=new Map();
  const mapKey=k=>({ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',
    KeyW:'up',KeyS:'down',KeyA:'left',KeyD:'right',ShiftLeft:'boost',ShiftRight:'boost',Space:'drift'}[k]);
  let cameraMode=0,inspect=false,orbitYaw=0,orbitPitch=.11,orbitDist=11.8;
  let paused=false,raceTime=0,lapRunning=false,lapStartedAt=0,best=0;
  let nextGate=0,laps=0,gateFlash=0,padFlash=0,lastNotify=0;
  let time=0,renderFrames=0,renderFPS=0,fpsAt=0;
  const $speed=$('speed'),$lap=$('lap'),$check=$('check'),$boostFill=$('boostFill'),$fps=$('fps'),$mode=$('cameraLabel'),$quality=$('qualityLabel'),$best=$('best');
  function readBest(){try{return Number(localStorage.getItem('aether-rift-hound-best'))||0;}catch{return 0;}}
  function saveBest(val){try{localStorage.setItem('aether-rift-hound-best',String(val));}catch{}}
  best=readBest();
  function fmt(t){if(!t)return '--:--.--';const m=Math.floor(t/60),s=t%60;return String(m).padStart(2,'0')+':'+s.toFixed(2).padStart(5,'0');}
  $best.textContent=fmt(best);
  const state={left:false,right:false,up:false,down:false,boost:false,drift:false};
  function controlState(){
    for(const name of Object.keys(state))state[name]=held.has(name)||[...touches.values()].includes(name);
    return {throttle:state.up?1:0,brake:state.down?1:0,steer:(state.right?1:0)-(state.left?1:0),boost:state.boost,drift:state.drift};
  }
  const keyDown=e=>{
    if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
    const cmd=mapKey(e.code);if(cmd)held.add(cmd);
    if(e.repeat)return;
    if(e.code==='KeyC')cycleCamera();
    if(e.code==='KeyQ')toggleQuality();
    if(e.code==='KeyR')reset();
    if(e.code==='KeyP')togglePause();
    if(e.code==='KeyV')toggleInspect();
  };
  const keyUp=e=>{const cmd=mapKey(e.code);if(cmd)held.delete(cmd);};
  window.addEventListener('keydown',keyDown);window.addEventListener('keyup',keyUp);
  window.addEventListener('blur',()=>{held.clear();touches.clear();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){held.clear();touches.clear();paused=true; $('pauseLabel').textContent='再開';}});
  for(const btn of document.querySelectorAll('[data-drive]')){
    btn.addEventListener('pointerdown',e=>{
      e.preventDefault();btn.setPointerCapture(e.pointerId);touches.set(e.pointerId,btn.dataset.drive);btn.classList.add('pressed');
    });
    for(const type of ['pointerup','pointercancel','lostpointercapture'])btn.addEventListener(type,e=>{
      touches.delete(e.pointerId);btn.classList.remove('pressed');
    });
  }
  let toastTimeout=0;
  function notice(message,seconds=2.8){$('toast').textContent=message;$('toast').classList.add('show');toastTimeout=time+seconds;}
  function cycleCamera(){cameraMode=(cameraMode+1)%3;orbitYaw=0;orbitPitch=.11;
    $mode.textContent=['CHASE','LOW','COCKPIT'][cameraMode];notice(['追尾視点','地面スレスレ視点','コクピット視点'][cameraMode],1.6);
  }
  function setQuality(mode){
    quality=mode==='high'?'high':'low';
    vehicle.setQuality(quality);highDetail.visible=quality==='high';
    sun.castShadow=quality==='high';renderer.shadowMap.enabled=quality==='high';
    renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,quality==='high'?(lowPower?1.55:1.8):(lowPower?1.08:1.34)));
    renderer.setSize(window.innerWidth,window.innerHeight,false);
    $quality.textContent=quality==='high'?'HIGH':'LITE';
  }
  function toggleQuality(){setQuality(quality==='low'?'high':'low');notice('描画モード '+$quality.textContent,2);}
  function toggleInspect(){inspect=!inspect;paused=false;held.clear();touches.clear();orbitYaw=0;orbitPitch=.19;
    $('inspectLabel').textContent=inspect?'DRIVE':'INSPECT';notice(inspect?'展示モード：ドラッグで車体を回転':'走行モード',2.4);
  }
  function togglePause(){paused=!paused;$('pauseLabel').textContent=paused?'RESUME':'PAUSE';notice(paused?'一時停止':'走行再開',1.8);}
  function reset(){
    held.clear();touches.clear();driver.spawn({x:pose.p.x,z:pose.p.z,yaw:pose.yaw});
    nextGate=0;lapRunning=false;lapStartedAt=0;laps=0;inspect=false;paused=false;
    $('inspectLabel').textContent='INSPECT';$('pauseLabel').textContent='PAUSE';
    for(const g of gates)g.passed=false;
    notice('スタート地点に帰還',2.2);
  }
  $('cameraButton').addEventListener('click',cycleCamera);
  $('qualityButton').addEventListener('click',toggleQuality);
  $('inspectButton').addEventListener('click',toggleInspect);
  $('resetButton').addEventListener('click',reset);
  $('pauseButton').addEventListener('click',togglePause);
  let drag=null;
  canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'&&e.isPrimary===false)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{
    if(!drag||drag.id!==e.pointerId)return;
    orbitYaw=clamp(orbitYaw+(e.clientX-drag.x)*.0045,-Math.PI,Math.PI);
    orbitPitch=clamp(orbitPitch-(e.clientY-drag.y)*.0033,-.10,.85);
    drag.x=e.clientX;drag.y=e.clientY;
  });
  canvas.addEventListener('pointerup',()=>{drag=null;});canvas.addEventListener('pointercancel',()=>{drag=null;});
  canvas.addEventListener('wheel',e=>{e.preventDefault();orbitDist=clamp(orbitDist+e.deltaY*.007,7,19);},{passive:false});

  const minimap=$('minimap'),ctx=minimap.getContext('2d');
  minimap.width=248;minimap.height=248;
  function drawMini(st){
    const scale=.64,centerX=125,centerY=123;
    ctx.clearRect(0,0,248,248);
    ctx.lineJoin='round';ctx.lineCap='round';ctx.strokeStyle='#324958';ctx.lineWidth=10;
    function trace(){ctx.beginPath();for(let i=0;i<=N;i+=3){const p=trackPts[i],x=centerX+(p.x-10)*scale,y=centerY+(p.z+3)*scale;
      if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();}
    trace();ctx.stroke();ctx.strokeStyle='#62c8d1';ctx.lineWidth=2.2;trace();ctx.stroke();
    for(let j=0;j<gates.length;j++){
      const p=gates[j].pose.p;ctx.fillStyle=j===nextGate?'#ffcf84':gates[j].passed?'#648a92':'#3a656d';
      ctx.beginPath();ctx.arc(centerX+(p.x-10)*scale,centerY+(p.z+3)*scale,j===nextGate?4:2.4,0,Math.PI*2);ctx.fill();
    }
    const x=centerX+(st.x-10)*scale,y=centerY+(st.z+3)*scale;
    ctx.save();ctx.translate(x,y);ctx.rotate(-st.yaw);ctx.fillStyle='#ffffff';ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(6,7);ctx.lineTo(0,4);ctx.lineTo(-6,7);ctx.closePath();ctx.fill();ctx.restore();
  }
  // camera with independent look steering, no default OrbitControls dependency.
  const look=new THREE.Vector3(),desired=new THREE.Vector3();
  function updateCamera(dt,st){
    const fx=-Math.sin(st.yaw),fz=-Math.cos(st.yaw), bx=-fx,bz=-fz;
    let tx=st.x,ty=st.y+1.45,tz=st.z;
    if(inspect){
      const a=st.yaw+orbitYaw+time*.2;
      desired.set(st.x+Math.sin(a)*orbitDist*Math.cos(orbitPitch),st.y+3.5+Math.sin(orbitPitch)*orbitDist,st.z+Math.cos(a)*orbitDist*Math.cos(orbitPitch));
      look.set(st.x,st.y+1.17,st.z);
      camera.position.lerp(desired,1-Math.exp(-dt*5));camera.lookAt(look);return;
    }
    if(cameraMode===2){
      desired.set(st.x+fx*.37,st.y+1.92,st.z+fz*.37);
      look.set(st.x+fx*30,st.y+2.10,st.z+fz*30);
      camera.position.lerp(desired,1-Math.exp(-dt*15));camera.lookAt(look);
      return;
    }
    const a=st.yaw+orbitYaw,dist=orbitDist*(cameraMode===1?.89:1),h=(cameraMode===1?1.15:4.5)+Math.sin(orbitPitch)*dist*.75;
    desired.set(st.x+Math.sin(a)*dist,st.y+h,st.z+Math.cos(a)*dist);
    look.set(tx+fx*3.1,ty+(cameraMode===1?.14:.53),tz+fz*3.1);
    camera.position.lerp(desired,1-Math.exp(-dt*(cameraMode===1?5.8:4.3)));
    camera.lookAt(look);
    if(Math.abs(orbitYaw)>.001&&!drag)orbitYaw*=Math.exp(-dt*.45);
  }
  function resize(){const w=innerWidth,h=innerHeight;camera.aspect=w/Math.max(1,h);camera.updateProjectionMatrix();renderer.setSize(w,h,false);}
  window.addEventListener('resize',resize,{passive:true});
  setQuality('low');resize();updateCamera(.3,driver.state);drawMini(driver.state);
  loader.classList.add('hide');
  notice(lowPower?'右下のGOを押して出発！ 左側で旋回':'WASDで走行 / Shiftでブースト / Spaceでドリフト',6);

  const checkpointDist=10.6;
  function updateCourse(dt,st) {
    if(!lapRunning&&Math.abs(st.speed)>2){lapRunning=true;lapStartedAt=raceTime;}
    const gt=gates[nextGate];
    if(gt&&Math.hypot(st.x-gt.pose.p.x,st.z-gt.pose.p.z)<checkpointDist) {
      gt.passed=true;gt.pulse=1;gateFlash=1;
      nextGate++;
      if(nextGate>=gates.length) {
        const lapTime=raceTime-lapStartedAt;
        laps++;
        if(best===0||lapTime<best){best=lapTime;saveBest(best);$best.textContent=fmt(best);notice('NEW RECORD!  '+fmt(lapTime),4);}
        else notice('LAP '+laps+' COMPLETE  '+fmt(lapTime),3.4);
        lapStartedAt=raceTime;nextGate=0;for(const g of gates)g.passed=false;
      }else notice('CHECKPOINT '+nextGate+' / '+gates.length,1.3);
    }
    for(const p of pads){
      p.cooldown=Math.max(0,p.cooldown-dt);
      if(p.cooldown===0&&Math.hypot(st.x-p.pose.p.x,st.z-p.pose.p.z)<4.1&&Math.abs(st.speed)>13){
        if(driver.jump(9.4)){driver.refill(14);p.cooldown=3.3;padFlash=1;notice('ARC LAUNCH / +14 ENERGY',1.6);}
      }
    }
    for(const orb of chargeCells) {
      if(orb.respawn>0){orb.respawn-=dt;orb.parent.visible=false;continue;}
      orb.parent.visible=true;
      if(Math.hypot(st.x-orb.parent.position.x,st.z-orb.parent.position.z)<2.1){
        driver.refill(26);orb.respawn=15;notice('AETHER CELL +26 ENERGY',1.3);
      }
    }
    for(const g of gates){
      g.pulse=Math.max(0,g.pulse-dt*1.2);
      g.crystal.rotation.y+=dt*1.6;
      g.crystal.scale.setScalar(1+.15*Math.sin(time*2.6)+g.pulse*.65);
    }
    for(const orb of chargeCells)if(orb.parent.visible){orb.parent.rotation.y+=dt*1.35;orb.parent.position.y=orb.initialY+Math.sin(time*2.2+orb.initialY)*.25;}
    for(const p of pads)p.ring.rotation.z+=dt*.8;
    gateFlash=Math.max(0,gateFlash-dt*2.5);padFlash=Math.max(0,padFlash-dt*2.0);
  }
  function drawHUD(st){
    $speed.textContent=String(Math.max(0,Math.round(st.speed*3.6))).padStart(3,'0');
    $boostFill.style.width=st.boostEnergy.toFixed(1)+'%';
    $check.textContent=String(nextGate).padStart(2,'0')+' / '+gates.length;
    $lap.textContent=lapRunning?fmt(raceTime-lapStartedAt):'00:00.00';
    $fps.textContent=renderFPS?String(renderFPS)+' FPS':'-- FPS';
    $('status').textContent=st.airborne?'AIRBORNE':st.drifting?'DRIFT':st.boosting?'OVERDRIVE':st.offRoad?'OFF-ROAD':inspect?'INSPECTION':paused?'PAUSED':'GROUND GRIP';
    $('boostOverlay').style.opacity=st.boosting?'.45':'0';
    $('flashOverlay').style.opacity=String(Math.max(gateFlash*.18,padFlash*.24));
    $('raceInfo').textContent='LAP '+String(laps+1).padStart(2,'0');
  }
  let last=performance.now(),hudAt=0,mapAt=0;
  let loopActive=true;
  function frame(now) {
    if(!loopActive)return;
    requestAnimationFrame(frame);
    const dt=clamp((now-last)/1000,0,.042);last=now;
    time+=dt;if(!paused&&!inspect)raceTime+=dt;renderFrames++;
    if(now-fpsAt>900){renderFPS=Math.round(renderFrames*1000/Math.max(1,now-fpsAt));renderFrames=0;fpsAt=now;}
    if(!paused&&!inspect){
      const inp=controlState();
      driver.update(dt,inp,{worldRadius:293});
      updateCourse(dt,driver.state);
      spawnTrail(driver.state,dt);
    }
    vehicle.update(paused?0:dt);
    if(!paused)updateParticles(dt);
    updateCamera(dt,driver.state);
    if(quality==='high') {
      sun.position.set(driver.state.x-65,100,driver.state.z-85);
      sun.target.position.set(driver.state.x,0,driver.state.z-20);
      sun.target.updateMatrixWorld();
    }
    const currentFov=cameraMode===2?68:64+Math.abs(driver.state.speed)*.10+(driver.state.boosting?3:0);
    if(Math.abs(camera.fov-currentFov)>.09){camera.fov+=(currentFov-camera.fov)*Math.min(1,dt*7);camera.updateProjectionMatrix();}
    if(now-hudAt>95){drawHUD(driver.state);hudAt=now;}
    if(now-mapAt>185){drawMini(driver.state);mapAt=now;}
    if(toastTimeout<time)$('toast').classList.remove('show');
    renderer.render(scene,camera);
  }
  requestAnimationFrame(frame);
  window.addEventListener('pagehide',()=>{
    loopActive=false;vehicle.dispose();renderer.dispose();
    for(const o of world.children){o.traverse?.(node=>{if(node.geometry)node.geometry.dispose();});}
  },{once:true});
  window.aetherNo12Demo={ vehicle,driver,world,setQuality,toggleInspect,reset,THREE };
}
