import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { createAetherModule } from './aether_plant.js';

const $ = id => document.getElementById(id);
const touchMode = matchMedia('(pointer: coarse)').matches;
const smallScreen = matchMedia('(max-width: 760px)').matches;
const initialQuality = touchMode || smallScreen ? 'low' : 'high';
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x06111b);
scene.fog=new THREE.FogExp2(0x07131e,.008);
const camera=new THREE.PerspectiveCamera(74,1,.09,250);
const renderer=new THREE.WebGLRenderer({antialias:!touchMode,alpha:false,powerPreference:'high-performance'});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.34;
renderer.shadowMap.enabled=false;
renderer.setClearColor(0x07121d,1);
renderer.domElement.id='world';
renderer.domElement.setAttribute('aria-label','探索可能な巨大工業プラントの3Dビュー');
document.body.prepend(renderer.domElement);
scene.add(new THREE.HemisphereLight(0x97d8ff,0x261d28,1.55));
const sunlight=new THREE.DirectionalLight(0xd2f5ff,1.65);
sunlight.position.set(-22,43,30); scene.add(sunlight);
const foundry=createAetherModule(THREE,{quality:initialQuality});
scene.add(foundry.root);
const avatar=new THREE.Group(); avatar.name='Demo explorer only - not part of No06 module';
scene.add(avatar);
const avatarMats={armor:new THREE.MeshStandardMaterial({color:0x304758,metalness:.78,roughness:.33}),
 trim:new THREE.MeshStandardMaterial({color:0x6b8fa1,metalness:.74,roughness:.29}),
 glow:new THREE.MeshStandardMaterial({color:0x3aecfc,emissive:0x24dff4,emissiveIntensity:2.5})};
const boxGeo=new THREE.BoxGeometry(1,1,1);
function aBox(parent,m,x,y,z,sx,sy,sz) {
 const ob=new THREE.Mesh(boxGeo,m); ob.position.set(x,y,z); ob.scale.set(sx,sy,sz); parent.add(ob);return ob;
}
aBox(avatar,avatarMats.armor,0,1.24,0,.75,.9,.46);
aBox(avatar,avatarMats.trim,0,1.78,-.05,.52,.52,.54);
aBox(avatar,avatarMats.glow,0,1.8,-.34,.36,.12,.05);
aBox(avatar,avatarMats.glow,0,1.24,.25,.24,.48,.08);
for(const sign of [-1,1]) {
 aBox(avatar,avatarMats.armor,sign*.56,1.19,0,.27,.67,.3);
 aBox(avatar,avatarMats.trim,sign*.22,.45,0,.29,.76,.33);
 aBox(avatar,avatarMats.glow,sign*.28,.09,-.16,.18,.08,.06);
}
const player={pos:new THREE.Vector3(0,0,42),yaw:0,pitch:-.045,vy:0,grounded:true,mode:'TPS',step:0};
let quality=initialQuality;
const keys=Object.create(null);
const joy={x:0,y:0};
let runHeld=false;
let lookPointer=null;
let lastX=0,lastY=0;
const clock=new THREE.Clock();
let fpsAccumulator=0,fpsFrames=0,fps=60;
let hudTime=0;
let toastTimeout=0;
const desiredCamera=new THREE.Vector3(), lookAt=new THREE.Vector3();
function pixelRatioFor(q) {return touchMode ? (q==='high'?1.45:1) : (q==='high'?Math.min(devicePixelRatio,1.75):1);}
function resize() {
 const w=Math.max(1,window.innerWidth),h=Math.max(1,window.innerHeight);
 renderer.setPixelRatio(pixelRatioFor(quality)); renderer.setSize(w,h,false);
 camera.aspect=w/h; camera.fov=smallScreen?79:73; camera.updateProjectionMatrix();
}
window.addEventListener('resize',resize); resize();
function setQuality(q) {
 quality=foundry.setQuality(q);
 $('quality').textContent=quality==='high'?'画質 : HIGH':'画質 : LITE';
 renderer.setPixelRatio(pixelRatioFor(quality)); resize();
 toast(quality==='high'?'高品質モード：装飾・光粒子を追加':'軽量モード：描画負荷を削減');
}
function toggleView() {
 player.mode=player.mode==='TPS'?'FPS':'TPS';
 $('view').textContent='視点 : '+player.mode;
 avatar.visible=player.mode==='TPS';
 toast(player.mode==='FPS'?'一人称視点':'三人称視点');
}
$('quality').addEventListener('click',()=>setQuality(quality==='low'?'high':'low'));
$('quality').textContent=quality==='high'?'画質 : HIGH':'画質 : LITE';
$('view').addEventListener('click',toggleView);
$('view').textContent='視点 : '+player.mode;
function toast(message) {
 const el=$('toast'); el.textContent=message;
 el.classList.add('visible');
 toastTimeout=performance.now()+3700;
}
function interact() {
 const p=new THREE.Vector3(player.pos.x,player.pos.y+1,player.pos.z);
 const near=foundry.getNearestInteraction(p,4.4);
 if(!near) {toast('近くに操作可能な装置がありません');return;}
 const result=foundry.interact(near.id);
 toast(result.message);
 if(result.ok) updateHUD();
}
function jump() {
 if(player.grounded) {player.vy=8.2;player.grounded=false;}
}
window.addEventListener('keydown',e=>{
 if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
 if(e.repeat) return;
 keys[e.code]=true;
 if(e.code==='Space') jump();
 if(e.code==='KeyE') interact();
 if(e.code==='KeyV'||e.code==='KeyT') toggleView();
 if(e.code==='KeyQ') setQuality(quality==='low'?'high':'low');
});
window.addEventListener('keyup',e=>keys[e.code]=false);
window.addEventListener('blur',()=>{for(const k in keys)keys[k]=false;joy.x=joy.y=0;runHeld=false;});
function rotateBy(dx,dy) {
 player.yaw +=dx*.003;
 player.pitch=THREE.MathUtils.clamp(player.pitch-dy*.0026,-1.13,1.17);
}
const canvas=renderer.domElement;
canvas.addEventListener('pointerdown',e=>{
 if(e.pointerType==='mouse'&&e.button!==0) return;
 if(touchMode&&e.clientX<window.innerWidth*.21&&e.clientY>window.innerHeight*.6) return;
 lookPointer=e.pointerId;lastX=e.clientX;lastY=e.clientY;
 canvas.setPointerCapture(e.pointerId);
 if(e.pointerType==='mouse'&&canvas.requestPointerLock&&!document.pointerLockElement) {
   try {const p=canvas.requestPointerLock();p?.catch?.(()=>{});}catch(err){}
 }
});
canvas.addEventListener('pointermove',e=>{
 if(document.pointerLockElement===canvas) return;
 if(lookPointer!==e.pointerId) return;
 rotateBy(e.clientX-lastX,e.clientY-lastY); lastX=e.clientX;lastY=e.clientY;
});
canvas.addEventListener('pointerup',e=>{if(lookPointer===e.pointerId)lookPointer=null;});
canvas.addEventListener('pointercancel',e=>{if(lookPointer===e.pointerId)lookPointer=null;});
window.addEventListener('mousemove',e=>{
 if(document.pointerLockElement===canvas)rotateBy(e.movementX,e.movementY);
});
// Mobile: left virtual stick, right drag-look + jump/action/sprint buttons.
const joystick=$('joystick'),knob=$('knob');
let stickPointer=null;
function updateStick(e) {
 const r=joystick.getBoundingClientRect();
 const dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);
 const maxDist=r.width*.33;
 const len=Math.max(1,Math.hypot(dx,dy)),scale=Math.min(1,maxDist/len);
 const px=dx*scale,py=dy*scale;
 joy.x=px/maxDist;joy.y=py/maxDist;
 knob.style.transform=`translate(${px}px,${py}px)`;
}
joystick.addEventListener('pointerdown',e=>{
 e.preventDefault();e.stopPropagation();stickPointer=e.pointerId;
 joystick.setPointerCapture(e.pointerId); updateStick(e);
});
joystick.addEventListener('pointermove',e=>{if(e.pointerId===stickPointer){e.preventDefault();updateStick(e);}});
for(const event of ['pointerup','pointercancel','lostpointercapture']) joystick.addEventListener(event,e=>{
 if(e.pointerId===stickPointer){stickPointer=null;joy.x=joy.y=0;knob.style.transform='translate(0px,0px)';}
});
$('action').addEventListener('click',e=>{e.stopPropagation();interact();});
$('jump').addEventListener('click',e=>{e.stopPropagation();jump();});
const sprint=$('sprint');
sprint.addEventListener('pointerdown',e=>{e.stopPropagation();runHeld=true;sprint.setPointerCapture(e.pointerId);sprint.classList.add('pressed');});
for(const event of ['pointerup','pointercancel','lostpointercapture'])
 sprint.addEventListener(event,()=>{runHeld=false;sprint.classList.remove('pressed');});

const statuses=['同期タービン','鋳造プレス','冷却循環'];
function updateHUD() {
 const status=foundry.getState();
 $('charge').textContent=`${status.activeCount} / 3`;
 $('powerLabel').textContent=status.overdrive?'REACTOR // MAXIMUM OUTPUT':status.activeCount===3?'READY // CONTROL DECK':'REACTOR // STANDBY';
 $('powerLabel').classList.toggle('overdrive',status.overdrive);
 $('meter').style.width=(status.overdrive?100:status.activeCount*25)+'%';
 for(let i=0;i<3;i++) $('light'+i).classList.toggle('on',status.activeSectors.includes(String(i+1).padStart(2,'0')));
 $('final').classList.toggle('on',status.overdrive);
 const p=new THREE.Vector3(player.pos.x,player.pos.y+1,player.pos.z);
 const near=foundry.getNearestInteraction(p,4.4);
 const interaction=$('interaction');
 if(near) {
  interaction.classList.add('active');
  $('contextTitle').textContent=near.active?'稼働中：'+near.title:near.title;
  $('contextSub').textContent=near.active?'稼働確認済み':near.requires?'前提：地上の3基を起動する':'Eキー / 操作ボタンで起動';
  $('action').classList.add('near');
 } else {
  interaction.classList.remove('active');
  $('action').classList.remove('near');
 }
 $('height').textContent=(player.pos.y<1?'GROUND FLOOR':`HEIGHT ${player.pos.y.toFixed(0)}m`);
 $('fps').textContent=Math.round(fps)+' FPS';
}
function advanceMovement(dt) {
 let forward=((keys.KeyW||keys.ArrowUp)?1:0)-((keys.KeyS||keys.ArrowDown)?1:0)-joy.y;
 let sideways=((keys.KeyD||keys.ArrowRight)?1:0)-((keys.KeyA||keys.ArrowLeft)?1:0)+joy.x;
 const m=Math.hypot(forward,sideways);
 if(m>1){forward/=m;sideways/=m;}
 const moving=m>.07;
 let speed=(keys.ShiftLeft||keys.ShiftRight||runHeld)?7.8:4.6;
 let xMove=(Math.sin(player.yaw)*forward+Math.cos(player.yaw)*sideways)*speed*dt;
 let zMove=(-Math.cos(player.yaw)*forward+Math.sin(player.yaw)*sideways)*speed*dt;
 const nav=foundry.navigation;
 const testX=player.pos.x+xMove,testZ=player.pos.z+zMove;
 if(!nav.collides(testX,testZ,.46,player.pos.y)) {player.pos.x=testX;player.pos.z=testZ;}
 else {
  if(!nav.collides(testX,player.pos.z,.46,player.pos.y)) player.pos.x=testX;
  if(!nav.collides(player.pos.x,testZ,.46,player.pos.y)) player.pos.z=testZ;
 }
 player.vy-=20.5*dt;
 player.pos.y+=player.vy*dt;
 const ground=nav.sampleGround(player.pos.x,player.pos.z,player.pos.y);
 if(ground!==null&&player.pos.y<=ground+.12&&player.vy<=0) {
  player.pos.y=ground;player.vy=0;player.grounded=true;
 } else if(ground!==null&&player.grounded&&ground>player.pos.y&&ground-player.pos.y<.4) {
  player.pos.y=ground;player.vy=0;
 } else player.grounded=false;
 if(player.pos.y<-5) {player.pos.set(0,0,42);player.vy=0;toast('エントリーデッキに復帰');}
 player.step+=moving?dt*speed:0;
 avatar.position.set(player.pos.x,player.pos.y+(moving&&player.grounded?Math.sin(player.step*1.7)*.055:0),player.pos.z);
 avatar.rotation.y=player.yaw;
 avatar.visible=player.mode==='TPS';
}
function advanceCamera(dt) {
 const eye=new THREE.Vector3(player.pos.x,player.pos.y+1.7,player.pos.z);
 const fwd=new THREE.Vector3(Math.sin(player.yaw)*Math.cos(player.pitch),Math.sin(player.pitch),-Math.cos(player.yaw)*Math.cos(player.pitch));
 if(player.mode==='FPS') {
   camera.position.copy(eye);
   camera.lookAt(eye.add(fwd));
 } else {
   desiredCamera.copy(eye).addScaledVector(fwd,-6.8);
   desiredCamera.y+=2.2;
   camera.position.lerp(desiredCamera,1-Math.exp(-dt*11));
   lookAt.copy(eye).addScaledVector(fwd,8);
   camera.lookAt(lookAt);
 }
}
let started=false;
function render() {
 requestAnimationFrame(render);
 const dt=Math.min(clock.getDelta(),.045);
 if(!started) {camera.position.set(0,5,51);started=true;}
 advanceMovement(dt);
 advanceCamera(dt);
 foundry.update(dt,{playerPosition:player.pos});
 renderer.render(scene,camera);
 fpsAccumulator+=dt;fpsFrames++;
 if(fpsAccumulator>=.65){fps=fpsFrames/fpsAccumulator;fpsAccumulator=0;fpsFrames=0;}
 hudTime+=dt;
 if(hudTime>.18){hudTime=0;updateHUD();}
 if(toastTimeout&&performance.now()>toastTimeout){$('toast').classList.remove('visible');toastTimeout=0;}
}
updateHUD();
render();
window.addEventListener('pagehide',()=>{foundry.dispose();renderer.dispose();});
