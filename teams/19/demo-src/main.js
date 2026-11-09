import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { createAetherModule } from '../src/aether-player-controller.js';
import { createAetherInputAdapter } from '../src/aether-input-adapter.js';

const canvas = document.querySelector('#game');
const renderer = new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',alpha:false});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.45;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#050e21');
scene.fog = new THREE.FogExp2('#07152b', 0.015);
const camera = new THREE.PerspectiveCamera(70,1,.08,220);
scene.add(new THREE.HemisphereLight('#9fd8ff','#111425',2.25));
const sun=new THREE.DirectionalLight('#d4eaff',2.25);sun.position.set(-12,28,-17);scene.add(sun);
const cyan=new THREE.Color('#58e3ff'),purple=new THREE.Color('#ae80ff');
const materials=[];
const geometry=[];
const trackMat=m=>{materials.push(m);return m;};
const trackGeo=g=>{geometry.push(g);return g;};
function mat(color,metalness=.45,roughness=.32,emissive='#000000',intensity=0){return trackMat(new THREE.MeshStandardMaterial({color,metalness,roughness,emissive,emissiveIntensity:intensity}));}
const wallMat=mat('#152947',.73,.35),trimMat=mat('#40758d',.75,.22), dark=mat('#091427',.65,.35);
const glowC=mat('#4fd7f5',.32,.27,'#36ccff',2.6),glowP=mat('#9e71ff',.38,.27,'#8952ff',2.1);
const floorMat=mat('#101e36',.65,.56);
function box(w,h,d,m,x,y,z,parent=scene){const obj=new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w,h,d)),m);obj.position.set(x,y,z);parent.add(obj);return obj;}
function cyl(rt,rb,h,m,x,y,z,parent=scene,sides=12){const obj=new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(rt,rb,h,sides)),m);obj.position.set(x,y,z);parent.add(obj);return obj;}
function torus(radius,tube,m,x,y,z,rotX=0,rotY=0,rotZ=0,parent=scene){const obj=new THREE.Mesh(trackGeo(new THREE.TorusGeometry(radius,tube,8,76)),m);obj.position.set(x,y,z);obj.rotation.set(rotX,rotY,rotZ);parent.add(obj);return obj;}
function rectPlane(w,h,m,x,y,z){const mesh=new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(w,h)),m);mesh.position.set(x,y,z);mesh.rotation.x=-Math.PI/2;scene.add(mesh);return mesh;}
const ground=new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(150,150)),floorMat);ground.rotation.x=-Math.PI/2;ground.position.y=-.1;scene.add(ground);
const grid=new THREE.GridHelper(126,84,0x286587,0x18324b);grid.position.y=-.085;grid.material.opacity=.28;grid.material.transparent=true;scene.add(grid);
for(const r of [4.5,7.8,12.8,24]) torus(r,.042,r===7.8?glowP:glowC,0,-.045,0,Math.PI/2);
const plaza=mat('#142b47',.78,.38);
cyl(7.15,7.35,.2,plaza,0,.0,0,scene,48);
cyl(2.65,2.86,.24,dark,0,.05,0,scene,48);
for(let i=0;i<16;i++){
  const a=i*Math.PI/8;
  const obj=box(.15,.04,1.1,i%4===0?glowP:glowC,Math.sin(a)*6.35,.133,Math.cos(a)*6.35);
  obj.rotation.y=a;
}
for(const [x,z,w,d] of [[0,-25,4.4,27],[0,25,4.4,27],[25,0,27,4.4],[-25,0,27,4.4]]){
  rectPlane(w,d,plaza,x,-.012,z);
  if(w<d){for(const dx of [-2.05,2.05])box(.065,.055,d,glowC,x+dx,.06,z);}else {for(const dz of [-2.05,2.05])box(w,.055,.065,glowC,x,.06,z+dz);}
}
// Interior monuments double as simple, predictable physics blockers.
const solids=[];
function obstacle(x,z,w,d,h=3.2,material=wallMat){
  box(w,h,d,material,x,h/2,z);
  box(w+.15,.12,d+.15,trimMat,x,h-.06,z);
  box(Math.min(w*.65,1.1),.13,.12,glowC,x,h*.52,z+d/2+.065);
  const b={minX:x-w/2,maxX:x+w/2,minZ:z-d/2,maxZ:z+d/2,minY:0,maxY:h};
  solids.push(b);return b;
}
for(const [x,z] of [[-9,-11],[11,-10],[-10,9],[10,12]]){
 obstacle(x,z,2.5,2.6,2.4);
 cyl(1.1,1.4,.3,dark,x,2.55,z);
 for(let j=0;j<4;j++) {
   const a=j*Math.PI/2;
   box(.15,1.1,.16,glowP,x+Math.cos(a)*.93,1.5,z+Math.sin(a)*.93);
 }
}
for(const [x,z] of [[-28,-28],[28,-28],[-28,28],[28,28]]) {
 obstacle(x,z,4.2,4.2,8.5,wallMat);
 cyl(2.5,2.75,.6,dark,x,8.75,z);
 const shaft=cyl(.73,.92,4.5,glowP,x,11.35,z);
 shaft.material=glowP;
 torus(1.6,.08,glowC,x,12.2,z,Math.PI/2);
 torus(1.0,.06,glowC,x,10.4,z,0,0,0);
}
// Jagged skyline placed beyond traversal bounds.
for(let i=0;i<42;i++){
 const a=i*Math.PI*2/42;
 const r=52+6*Math.sin(i*3.38);
 const h=8+(i*13%23);
 const x=Math.sin(a)*r,z=Math.cos(a)*r;
 box(2.1+(i%4),h,2.1+(i%3),i%4===0?wallMat:dark,x,h/2-0.06,z);
 if(i%2===0)box(.13,h*.64,.15,glowC,x+1.11,h*.56,z+1.05);
}
// Monument gate visually frames the far end of the north route.
for(const x of [-3.5,3.5]) {
 obstacle(x,-36,1.8,2.2,10.4);
 box(.2,7,.18,glowC,x+Math.sign(x)*.72,5.5,-34.85);
}
box(8.3,1.4,2,wallMat,0,10.2,-36);
box(6,.14,.3,glowP,0,9.5,-34.8);
const gateRing=torus(4.1,.15,glowP,0,5,-35.9,0,0,Math.PI/2);
const gateInner=torus(3.7,.04,glowC,0,5,-35.9,0,0,Math.PI/2);

// Interactive echo terminals.
const terminals=[];
const crystalGeo=trackGeo(new THREE.OctahedronGeometry(.63,1));
const pedestalGeo=trackGeo(new THREE.CylinderGeometry(1,1.25,.6,10));
const labels=['北の記憶','東の脈動','南の航路','西の共鳴'];
for(const [i,x,z] of [[0,0,-18],[1,18,0],[2,0,18],[3,-18,0]]){
 const group=new THREE.Group();group.position.set(x,0,z);scene.add(group);
 const base=new THREE.Mesh(pedestalGeo,dark);base.position.y=.25;group.add(base);
 const panel=cyl(.96,1.1,.10,glowC,0,.58,0,group);
 const core=new THREE.Mesh(crystalGeo,glowP);core.position.y=1.56;group.add(core);
 const orb=torus(.92,.037,glowC,0,1.56,0,.45,0,0,group);
 torus(1.30,.03,glowP,0,.64,0,Math.PI/2,0,0,group);
 terminals.push({x,z,name:labels[i],group,core,orb,lit:false});
}
const particlesGeo=trackGeo(new THREE.BufferGeometry());
const starCount=600;
const starPos=new Float32Array(starCount*3);
for(let i=0;i<starCount;i++){
 const a=i*2.399963229728653;
 const r=48+((i*17)%60);
 starPos[i*3]=Math.cos(a)*r;
 starPos[i*3+1]=12+((i*29)%60);
 starPos[i*3+2]=Math.sin(a)*r;
}
particlesGeo.setAttribute('position',new THREE.BufferAttribute(starPos,3));
const starMat=trackMat(new THREE.PointsMaterial({color:'#74bee2',size:.2,transparent:true,opacity:.56,sizeAttenuation:true,depthWrite:false}));
const stars=new THREE.Points(particlesGeo,starMat);scene.add(stars);

function makeAvatar(){
 const rig=new THREE.Group();rig.name='AetherExplorer';
 const coat=mat('#cadff4',.56,.33), armor=mat('#294563',.75,.26), joint=mat('#131d31',.5,.5),visor=mat('#07111d',.42,.12,'#125684',1.2);
 const hips=new THREE.Group();hips.position.y=1.11;rig.add(hips);
 box(.72,.75,.38,armor,0,0,0,hips);
 box(.65,.38,.48,coat,0,.20,-.085,hips);
 box(.55,.33,.42,dark,0,-.42,0,hips);
 box(.24,.43,.12,glowC,0,.12,-.3,hips);
 const head=new THREE.Group();head.position.y=.68;hips.add(head);
 const helmet=new THREE.Mesh(trackGeo(new THREE.SphereGeometry(.32,12,9)),coat);head.add(helmet);
 box(.58,.23,.13,visor,0,.015,-.27,head);
 box(.5,.05,.05,glowC,0,-.11,-.33,head);
 for(const side of [-1,1]){
   const shoulder=new THREE.Group();shoulder.position.set(side*.49,.23,0);hips.add(shoulder);
   box(.4,.25,.48,coat,0,0,0,shoulder);
   const arm=new THREE.Group();arm.position.set(side*.11,-.18,0);shoulder.add(arm);
   box(.22,.49,.23,armor,0,-.2,0,arm);
   box(.23,.16,.25,dark,0,-.5,-.03,arm);
   const leg=new THREE.Group();leg.position.set(side*.21,-.54,0);hips.add(leg);
   box(.27,.53,.29,armor,0,-.27,0,leg);
   box(.29,.20,.38,coat,0,-.61,-.07,leg);
   box(.12,.08,.21,glowC,0,-.71,-.22,leg);
   if(side===-1)rig.userData.leftLeg=leg;else rig.userData.rightLeg=leg;
   if(side===-1)rig.userData.leftArm=shoulder;else rig.userData.rightArm=shoulder;
 }
 const backpack=new THREE.Group();backpack.position.set(0,.04,.30);hips.add(backpack);
 box(.48,.59,.25,dark,0,0,0,backpack);
 torus(.19,.045,glowC,0,.04,.16,0,0,0,backpack);
 for(const side of [-1,1]){
   const fin=box(.1,.63,.19,coat,side*.38,-.10,.12,backpack);
   fin.rotation.z=side*.22;
 }
 rig.userData.hips=hips;
 rig.userData.head=head;
 return rig;
}
const avatar=makeAvatar();
const input=createAetherInputAdapter({domElement:canvas,showTouch:matchMedia('(pointer:coarse)').matches});
function getGroundHeight(){return 0;}
function clipToWorld(p){p.x=Math.max(-42,Math.min(42,p.x));p.z=Math.max(-42,Math.min(42,p.z));}
function intersects(x,z,y,height,r,solid){return y<solid.maxY&&y+height>solid.minY && x>solid.minX-r&&x<solid.maxX+r&&z>solid.minZ-r&&z<solid.maxZ+r;}
function resolveMovement({previous,proposed,radius,height}){
 clipToWorld(proposed);
 // Collision-by-axis gives wall sliding without pushing the player into corners.
 for(const solid of solids){
   if(intersects(proposed.x,previous.z,proposed.y,height,radius,solid))proposed.x=previous.x;
   if(intersects(proposed.x,proposed.z,proposed.y,height,radius,solid))proposed.z=previous.z;
 }
 return proposed;
}
function rayExit(origin,goal,solid){
 // Segment versus expanded AABB; returns hit distance when obstructed.
 const dx=goal.x-origin.x,dy=goal.y-origin.y,dz=goal.z-origin.z;
 const length=Math.hypot(dx,dy,dz);if(length<.001)return Infinity;
 const bounds=[[solid.minX-.24,solid.maxX+.24,dx,origin.x],
 [solid.minY-.24,solid.maxY+.24,dy,origin.y],
 [solid.minZ-.24,solid.maxZ+.24,dz,origin.z]];
 let tmin=0,tmax=1;
 for(const [lo,hi,d,originValue] of bounds){
   if(Math.abs(d)<1e-8){if(originValue<lo||originValue>hi)return Infinity;}
   else {let a=(lo-originValue)/d,b=(hi-originValue)/d;if(a>b)[a,b]=[b,a];
     tmin=Math.max(tmin,a);tmax=Math.min(tmax,b);if(tmin>tmax)return Infinity;}
 }
 return Math.max(.45,tmin*length-.14);
}
function cameraObstruction({origin,target,distance}){
 let safe=distance;
 for(const solid of solids) safe=Math.min(safe,rayExit(origin,target,solid));
 return safe;
}
const tip=document.querySelector('#tip'), toast=document.querySelector('#toast');
let activated=0,toastTime=0,toastText='',burstTime=0,burstOrigin=new THREE.Vector3();
const waveMat=trackMat(new THREE.MeshBasicMaterial({color:cyan,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
const actionWave=new THREE.Mesh(trackGeo(new THREE.RingGeometry(.8,.87,64)),waveMat);
actionWave.rotation.x=-Math.PI/2;actionWave.visible=false;scene.add(actionWave);
const flashMat=trackMat(new THREE.MeshBasicMaterial({color:purple,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
const dashWave=new THREE.Mesh(trackGeo(new THREE.RingGeometry(.65,.72,40)),flashMat);
dashWave.rotation.x=-Math.PI/2;dashWave.visible=false;scene.add(dashWave);
function showToast(text){toastText=text;toastTime=2.6;toast.textContent=text;toast.classList.add('visible');}
function nearTerminal(){
 let target=null,best=2.65;
 for(const terminal of terminals){if(terminal.lit)continue;
   const dist=Math.hypot(terminal.x-controller.root.position.x,terminal.z-controller.root.position.z);
   if(dist<best){best=dist;target=terminal;}}
 return target;
}
const controller=createAetherModule(THREE,{
 scene,camera,avatar,position:{x:0,y:0,z:4.8},
 getGroundHeight,resolveMovement,cameraObstruction,
 onEvent(event){
  if(event.type==='action'){
   const near=nearTerminal();
   burstTime=.62;actionWave.visible=true;
   burstOrigin.copy(controller.root.position);actionWave.position.set(burstOrigin.x,.13,burstOrigin.z);
   if(near){near.lit=true;activated++;
     near.core.material=glowC;near.orb.material=glowP;
     showToast(`${near.name} を起動  ·  ${activated} / 4`);
     if(activated===4){setTimeout(()=>showToast('4基のエーテル端末を起動！ 探索クリア'),1150);}
   } else showToast('端末に近づくとエーテルを調べられる');
  }
  if(event.type==='dash'){
    dashWave.visible=true;dashWave.material.opacity=.6;dashWave.scale.setScalar(1);
    dashWave.position.set(controller.root.position.x,.08,controller.root.position.z);
  }
  if(event.type==='mode')updateModeLabel();
 }
});
function updateModeLabel(){
 document.querySelector('#modeVal').textContent=controller.getMode().toUpperCase();
 document.querySelector('#reticle').classList.toggle('fps',controller.getMode()==='fps');
}
const playerHead=document.querySelector('#playerState');
function animateAvatar(state,t){
 const rig=avatar.userData.hips,travel=Math.hypot(state.velocity.x,state.velocity.z);
 const stride=(Math.min(1,travel/7))*((state.grounded)?1:.15);
 const swing=Math.sin(t*travel*1.6)*stride;
 avatar.userData.leftLeg.rotation.x=swing*.55;
 avatar.userData.rightLeg.rotation.x=-swing*.55;
 avatar.userData.leftArm.rotation.x=-swing*.32;
 avatar.userData.rightArm.rotation.x=swing*.32;
 rig.rotation.z = (state.moving?Math.sin(t*2)*.012:0);
 rig.position.y=1.12+(state.grounded?Math.abs(Math.sin(t*travel*1.6))*.055*stride:0);
 rig.rotation.x=state.sprinting?-.075:0;
}
let quality='low',pixelRatio=1,fps=60,frameAccumulator=0,frameCount=0,elapsed=0;
function setQuality(next){
 quality=next==='high'?'high':'low';
 controller.setQuality(quality);
 const dpr=window.devicePixelRatio||1;
 pixelRatio=quality==='high'?Math.min(dpr,1.85):Math.min(dpr,1.16);
 renderer.setPixelRatio(pixelRatio);
 renderer.setSize(window.innerWidth,window.innerHeight,false);
 scene.fog.density=quality==='high'?.013:.019;
 stars.geometry.setDrawRange(0,quality==='high'?starCount:190);
 renderer.toneMappingExposure=quality==='high'?1.52:1.38;
 document.querySelector('#qualityVal').textContent=quality==='high'?'HIGH':'LIGHT';
 document.querySelector('#qualityBtn').textContent=quality==='high'?'高品質':'軽量版';
}
function resize(){
 const w=window.innerWidth,h=window.innerHeight;
 camera.aspect=w/Math.max(1,h);camera.updateProjectionMatrix();
 renderer.setSize(w,h,false);
}
window.addEventListener('resize',resize);
document.querySelector('#qualityBtn').addEventListener('click',()=>setQuality(quality==='low'?'high':'low'));
document.querySelector('#resetBtn').addEventListener('click',()=>{
 controller.teleport(0,0,4.8,0);activated=0;
 for(const term of terminals){term.lit=false;term.core.material=glowP;term.orb.material=glowC;}
 showToast('探索エリアを初期化した');
});
const intro=document.querySelector('#intro');
const startBtn=document.querySelector('#startBtn');
startBtn.addEventListener('click',()=>{intro.hidden=true;showToast('4つのエーテル端末を探そう');});
document.querySelector('#closeIntro').addEventListener('click',()=>{intro.hidden=true;});
function render(t){
 const dt=Math.min(.05,Math.max(0,(t-(render.previous??t))/1000));render.previous=t;
 const state=controller.update(dt,{input});
 elapsed+=dt;
 animateAvatar(state,elapsed);
 for(let i=0;i<terminals.length;i++){
  const term=terminals[i];term.core.rotation.y+=dt*(term.lit?1.3:.63);
  term.core.position.y=1.57+Math.sin(elapsed*1.9+i*.9)*.15;
  term.orb.rotation.y+=dt*.42;
  term.orb.rotation.z=Math.sin(elapsed*.5+i)*.13;
  if(term.lit)term.core.scale.setScalar(1+Math.sin(elapsed*4+i)*.065);
 }
 gateRing.rotation.z= Math.sin(elapsed*.2)*.035;
 gateInner.rotation.z=-Math.sin(elapsed*.33)*.06;
 if(burstTime>0){
  burstTime=Math.max(0,burstTime-dt);
  actionWave.scale.setScalar(1+(1-burstTime/.62)*5);
  waveMat.opacity=.6*burstTime/.62;
  if(!burstTime)actionWave.visible=false;
 }
 if(dashWave.visible){
  dashWave.scale.multiplyScalar(1+dt*9);
  flashMat.opacity=Math.max(0,flashMat.opacity-dt*1.8);
  if(flashMat.opacity<=0)dashWave.visible=false;
 }
 if(toastTime>0){toastTime-=dt;if(toastTime<=0)toast.classList.remove('visible');}
 const near=nearTerminal();
 tip.textContent=near?`近くの端末「${near.name}」  ·  ${input.isTouch?'調べる':'E'} で起動`:'エーテル端末を4基探して起動しよう';
 document.querySelector('#progressVal').textContent=`${activated} / 4`;
 document.querySelector('#speedVal').textContent=(Math.hypot(state.velocity.x,state.velocity.z)).toFixed(1);
 playerHead.textContent=state.dashing?'BURST / ダッシュ':!state.grounded?'AIRBORNE / 空中':state.sprinting?'RUNNING / 走行':'EXPLORER / 探索';
 frameAccumulator+=dt;frameCount++;
 if(frameAccumulator>=.55){fps=frameCount/frameAccumulator;frameCount=0;frameAccumulator=0;
  document.querySelector('#fpsVal').textContent=`${Math.round(fps)} fps`;}
 renderer.render(scene,camera);
 requestAnimationFrame(render);
}
setQuality('low');resize();updateModeLabel();requestAnimationFrame(render);
window.addEventListener('beforeunload',()=>{
 controller.dispose();input.dispose();
 geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());renderer.dispose();
},{once:true});
