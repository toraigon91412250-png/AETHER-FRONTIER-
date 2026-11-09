// Standalone demo controller for Team No.02. The district itself does not depend on this file.
const $=id=>document.getElementById(id);
const canvas=$('view');
const log=$('toast');
const bootMsg=$('bootMsg');
const isTouch=('ontouchstart' in window)||navigator.maxTouchPoints>0;
let THREE;
try {
  THREE=await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
} catch(firstError) {
  try {THREE=await import('https://unpkg.com/three@0.160.0/build/three.module.js');}
  catch(secondError) {bootMsg.textContent='Three.jsの読込に失敗。通信状態を確認して再読み込みしてね。';throw secondError;}
}
const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x101d2c,0.0048);
const camera=new THREE.PerspectiveCamera(72,1,0.08,610);camera.rotation.order='YXZ';
let renderer;
try {renderer=new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'high-performance'});}
catch(e){bootMsg.textContent='WebGLを起動できなかった。Safari/ブラウザ設定を確認してね。';throw e;}
renderer.setClearColor(0x162137,1);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.32;
renderer.shadowMap.enabled=false;
renderer.setSize(innerWidth,innerHeight,false);
scene.add(new THREE.HemisphereLight(0xbfdfff,0x8b6a54,2.0));
const sunlight=new THREE.DirectionalLight(0xffd0a6,1.85);sunlight.position.set(-70,110,-85);scene.add(sunlight);
const fill=new THREE.DirectionalLight(0x4f9fd6,0.52);fill.position.set(55,20,45);scene.add(fill);
const sky=new THREE.Mesh(new THREE.SphereGeometry(490,28,18),new THREE.ShaderMaterial({
  side:THREE.BackSide,depthWrite:false,fog:false,vertexShader:`varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`varying vec3 p;void main(){float y=normalize(p).y;vec3 bottom=vec3(.41,.255,.29);vec3 middle=vec3(.14,.16,.29);vec3 top=vec3(.022,.047,.12);vec3 col=mix(bottom,middle,smoothstep(-.20,.17,y));col=mix(col,top,smoothstep(.08,.75,y));gl_FragColor=vec4(col,1.);}`
}));sky.frustumCulled=false;scene.add(sky);

const district=createAetherModule(THREE,{quality:'high'});scene.add(district.root);
let quality='high',mode='fps';
const player={x:district.spawn.x,z:district.spawn.z,foot:district.spawn.y,vy:0,yaw:district.spawn.yaw,pitch:-0.065,grounded:true};
const actor=new THREE.Group();actor.name='TPS_Explorer';scene.add(actor);
const torso=new THREE.Mesh(new THREE.CapsuleGeometry(0.34,0.81,4,8),new THREE.MeshStandardMaterial({color:0xe2c8a0,metalness:0.55,roughness:0.25}));torso.position.y=1.13;actor.add(torso);
const head=new THREE.Mesh(new THREE.SphereGeometry(0.29,10,8),new THREE.MeshStandardMaterial({color:0x283548,metalness:0.65,roughness:0.3}));head.position.y=1.82;actor.add(head);
const visor=new THREE.Mesh(new THREE.BoxGeometry(.46,.15,.12),new THREE.MeshBasicMaterial({color:0x69edee}));visor.position.set(0,1.84,-0.26);actor.add(visor);
const backpack=new THREE.Mesh(new THREE.BoxGeometry(.5,.7,.23),new THREE.MeshStandardMaterial({color:0x44566f,metalness:.55,roughness:.42}));backpack.position.set(0,1.18,.4);actor.add(backpack);
const ring=new THREE.Mesh(new THREE.TorusGeometry(.45,.035,6,20),new THREE.MeshBasicMaterial({color:0x47d8d0,transparent:true,opacity:0.7}));ring.rotation.x=Math.PI/2;ring.position.y=.045;actor.add(ring);
actor.visible=false;

const keys=new Set();let movePointer=-1,lookPointer=-1,stickX=0,stickY=0,moveX=0,moveY=0,lookPX=0,lookPY=0;
const touchUI=$('touchUI'),joystick=$('joystick'),knob=$('knob');
if(isTouch)touchUI.classList.add('visible');
const stopScrollKeys=['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
window.addEventListener('keydown',e=>{
  if(['KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyE','KeyV','KeyQ','KeyF'].includes(e.code))e.preventDefault();
  keys.add(e.code);
  if(!e.repeat){if(e.code==='KeyE'||e.code==='KeyF')activateNearest();if(e.code==='KeyV')switchView();if(e.code==='KeyQ')switchQuality();}
},{passive:false});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{keys.clear();stickX=0;stickY=0;movePointer=-1;lookPointer=-1;knob.style.transform='translate(0px,0px)';});

let started=false,toastUntil=0;
function toast(message,duration=3600){log.textContent=message;log.classList.add('on');toastUntil=performance.now()+duration;}
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
function rotate(dx,dy,scale=1){player.yaw-=dx*0.00265*scale;player.pitch=clamp(player.pitch-dy*0.00235*scale,-1.30,1.25);}
function switchView(){mode=mode==='fps'?'tps':'fps';actor.visible=mode==='tps';$('viewBtn').textContent=mode==='fps'?'FPS':'TPS';toast(mode==='fps'?'一人称視点':'三人称視点',1600);}
function switchQuality(){quality=quality==='high'?'low':'high';district.setQuality(quality);setPixelRatio();$('qualityBtn').textContent=quality==='high'?'高品質':'軽量';$('qualityValue').textContent=quality==='high'?'HIGH':'LOW';toast(quality==='high'?'高品質モードへ切替':'軽量モードへ切替',1700);}
const fpsState={avg:60,last:performance.now(),frameCount:0,sumMs:0,slowTimer:0,fastTimer:0,lastAdjustment:0};
let resolutionFactor=1;
function setPixelRatio(){
  const mobile=innerWidth<850;
  const cap=quality==='low'?(mobile?1.10:1.22):(mobile?1.62:1.75);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,cap)*resolutionFactor);
  renderer.setSize(innerWidth,innerHeight,false);
  $('renderScale').textContent=`${(renderer.getPixelRatio()).toFixed(2)}x`;
}
window.addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();setPixelRatio();
});camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();setPixelRatio();

function getNearest(){return district.getNearestInteraction({x:player.x,y:player.foot,z:player.z},3.6);}
function activateNearest(){
  const nearest=getNearest();if(!nearest){toast('近くに操作できる装置がない',1700);return;}
  const response=district.interact(nearest.id,{playerPosition:{x:player.x,y:player.foot,z:player.z}});
  if(response)toast(response.message,4900);
}
$('actionBtn').addEventListener('click',activateNearest);
$('viewBtn').addEventListener('click',switchView);
$('qualityBtn').addEventListener('click',switchQuality);
$('jumpBtn').addEventListener('click',()=>{if(player.grounded){player.vy=7.1;player.grounded=false;}});
let running=false;$('runBtn').addEventListener('pointerdown',e=>{e.preventDefault();running=true;$('runBtn').classList.add('active');});
for(let event of ['pointerup','pointercancel','pointerleave'])$('runBtn').addEventListener(event,()=>{running=false;$('runBtn').classList.remove('active');});
$('start').addEventListener('click',()=>{
  started=true;$('welcome').classList.add('hidden');toast('街区探索開始。西が商業、東が居住エリア。東のリフトで屋上へ。',5800);
  if(!isTouch && canvas.requestPointerLock)canvas.requestPointerLock().catch(()=>{});
});
$('tipsClose').addEventListener('click',()=>{$('tips').style.display='none';});

function updateStick(clientX,clientY){
  const r=61;const dx=clientX-moveX,dy=clientY-moveY;const length=Math.hypot(dx,dy)||1;
  const amount=Math.min(1,length/r);stickX=dx/length*amount;stickY=dy/length*amount;
  knob.style.transform=`translate(${stickX*45}px,${stickY*45}px)`;
}
canvas.addEventListener('pointerdown',e=>{
  if(!started)return;
  if(e.pointerType==='touch'||e.pointerType==='pen'){
    e.preventDefault();
    if(movePointer<0&&e.clientX<innerWidth*0.42&&e.clientY>innerHeight*0.45){
      movePointer=e.pointerId;const rect=joystick.getBoundingClientRect();moveX=rect.left+rect.width/2;moveY=rect.top+rect.height/2;
      updateStick(e.clientX,e.clientY);
    }else if(lookPointer<0){lookPointer=e.pointerId;lookPX=e.clientX;lookPY=e.clientY;}
    canvas.setPointerCapture(e.pointerId);
  }else if(!document.pointerLockElement&&canvas.requestPointerLock){canvas.requestPointerLock().catch(()=>{});}
},{passive:false});
canvas.addEventListener('pointermove',e=>{
  if(!started)return;
  if(e.pointerId===movePointer){updateStick(e.clientX,e.clientY);e.preventDefault();}
  else if(e.pointerId===lookPointer){rotate(e.clientX-lookPX,e.clientY-lookPY,1.75);lookPX=e.clientX;lookPY=e.clientY;e.preventDefault();}
});
function endPointer(e){
  if(e.pointerId===movePointer){movePointer=-1;stickX=stickY=0;knob.style.transform='translate(0px,0px)';}
  if(e.pointerId===lookPointer)lookPointer=-1;
}
for(const event of ['pointerup','pointercancel'])canvas.addEventListener(event,endPointer);
window.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas)rotate(e.movementX,e.movementY,0.8);});

// Minimap is UI-only; no collision, game logic or renderer hooks are required by the module.
const minimap=$('minimap');const mapCtx=minimap.getContext('2d');
const rects=[[-42,42,35,30,'#506b76'],[-62,7,28,26,'#647b81'],[-45,-53,34,25,'#4d6777'],
  [43,35,31,30,'#92a4a6'],[46,-43,33,29,'#718b99'],[72,37,17,25,'#647d89'],[72,-45,17,26,'#647d89'],
  [-74,59,15,19,'#405767'],[-70,-28,19,21,'#435f6d'],[-72,-75,19,20,'#475d69'],[-38,-77,29,15,'#47616c'],[48,-77,24,17,'#697b7f']];
function drawMap(){
  if(!mapCtx)return;
  const c=mapCtx,w=c.canvas.width,h=c.canvas.height;
  c.clearRect(0,0,w,h);c.fillStyle='#101d2de0';c.fillRect(0,0,w,h);
  const X=x=>(x+87)/174*w,Z=z=>(z+94)/190*h;
  mapCtx.fillStyle='#314455';mapCtx.fillRect(X(-10),0,X(10)-X(-10),h);
  mapCtx.fillStyle='#2b4651';mapCtx.fillRect(0,Z(-23),w,Z(-10)-Z(-23));
  for(const [x,z,bw,bd,color] of rects){
    mapCtx.fillStyle=color;mapCtx.fillRect(X(x-bw/2),Z(z-bd/2),(bw/174)*w,(bd/190)*h);
  }
  mapCtx.strokeStyle='#5ce8d5';mapCtx.lineWidth=2;
  mapCtx.strokeRect(X(41),Z(-29),6/174*w,48/190*h);
  mapCtx.fillStyle='#5ff9e6';mapCtx.fillRect(X(17),Z(17),5,5);
  mapCtx.save();mapCtx.translate(X(player.x),Z(player.z));mapCtx.rotate(player.yaw);
  mapCtx.beginPath();mapCtx.moveTo(0,-8);mapCtx.lineTo(5,5);mapCtx.lineTo(-5,5);mapCtx.closePath();
  mapCtx.fillStyle='#fbe3a3';mapCtx.fill();mapCtx.restore();
  mapCtx.fillStyle='#a2c3ce';mapCtx.font='bold 10px system-ui';mapCtx.textAlign='center';
  mapCtx.fillText('商業',X(-45),Z(12));mapCtx.fillText('住宅',X(50),Z(9));
  mapCtx.strokeStyle='#7c9eab';mapCtx.strokeRect(0.5,0.5,w-1,h-1);
}

let last=performance.now(),mapTimer=0,hudTimer=0;
const camTarget=new THREE.Vector3();
function tick(now){
  requestAnimationFrame(tick);
  const dt=Math.min(0.05,Math.max(0.001,(now-last)/1000));last=now;
  if(started){
    let forward=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'))-stickY;
    let sideways=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'))+stickX;
    const mag=Math.hypot(forward,sideways);if(mag>1){forward/=mag;sideways/=mag;}
    const run=running||keys.has('ShiftLeft')||keys.has('ShiftRight');
    const speed=(run?8.8:5.9)*(player.grounded?1:0.73);
    let dest={x:player.x+(-Math.sin(player.yaw)*forward+Math.cos(player.yaw)*sideways)*speed*dt,
      y:player.foot,z:player.z+(-Math.cos(player.yaw)*forward-Math.sin(player.yaw)*sideways)*speed*dt};
    dest=district.resolveMovement({x:player.x,y:player.foot,z:player.z},dest,0.33,1.6);
    player.x=dest.x;player.z=dest.z;
    if((keys.has('Space'))&&player.grounded){player.vy=7.1;player.grounded=false;}
    if(!player.grounded)player.vy-=20.0*dt;
    player.foot+=player.vy*dt;
    const floor=district.getGroundHeight(player.x,player.z,player.foot);
    if(player.vy<=0&&player.foot<=floor+0.07){player.foot=floor;player.vy=0;player.grounded=true;}
    else if(player.grounded&&player.foot<floor){player.foot=floor;player.vy=0;}
    else if(player.grounded&&player.foot>floor+0.35){player.grounded=false;}
    if(player.foot<0.32){player.foot=0.32;player.vy=0;player.grounded=true;}
  }
  const oldLiftHeight=district.getLiftState().height;
  const ridingLift=(Math.abs(player.x-19.6)<2.59&&Math.abs(player.z-20.1)<2.59 &&
    player.grounded&&player.vy<=0 &&Math.abs(player.foot-(oldLiftHeight+0.32))<0.42);
  district.update(dt,{playerPosition:{x:player.x,y:player.foot,z:player.z},quality});
  if(ridingLift){player.foot=district.getLiftState().height+0.32;player.vy=0;player.grounded=true;}
  actor.position.set(player.x,player.foot,player.z);actor.rotation.y=player.yaw;
  if(mode==='fps'){
    camTarget.set(player.x,player.foot+1.65,player.z);
    camera.position.copy(camTarget);camera.rotation.set(player.pitch,player.yaw,0,'YXZ');
  } else {
    const back=4.9;
    camTarget.set(player.x+Math.sin(player.yaw)*back,player.foot+2.8,player.z+Math.cos(player.yaw)*back);
    camera.position.lerp(camTarget,Math.min(1,dt*10));
    const focus=new THREE.Vector3(player.x,player.foot+1.55,player.z);
    camera.lookAt(focus);camera.rotation.x+=player.pitch*0.35;
  }
  sky.position.copy(camera.position);
  renderer.render(scene,camera);
  fpsState.sumMs+=dt*1000;fpsState.frameCount++;
  if(now-fpsState.last>850){
    const fps=Math.round(1000*fpsState.frameCount/fpsState.sumMs);
    fpsState.avg=fps;
    $('fps').textContent=`${fps} fps`;
    fpsState.frameCount=0;fpsState.sumMs=0;fpsState.last=now;
    if(fps<50)fpsState.slowTimer+=0.85;else fpsState.slowTimer=0;
    if(fps>59)fpsState.fastTimer+=0.85;else fpsState.fastTimer=0;
    // Adaptive resolution is a best-effort measure, not a 50fps guarantee.
    if(fpsState.slowTimer>3&&now-fpsState.lastAdjustment>3500&&resolutionFactor>0.66){
      resolutionFactor=Math.max(0.66,resolutionFactor-0.12);setPixelRatio();fpsState.slowTimer=0;fpsState.lastAdjustment=now;
    }else if(fpsState.fastTimer>8&&resolutionFactor<1&&now-fpsState.lastAdjustment>10000){
      resolutionFactor=Math.min(1,resolutionFactor+0.07);setPixelRatio();fpsState.fastTimer=0;fpsState.lastAdjustment=now;
    }
  }
  mapTimer+=dt;hudTimer+=dt;
  if(mapTimer>0.15){drawMap();mapTimer=0;}
  if(hudTimer>0.16){
    hudTimer=0;
    const near=getNearest();
    $('near').textContent=near?`[E] ${near.label} ・ ${near.hint}`:'西：商業街 / 東：居住街 ・ 仕掛けに近づいて E';
    $('actionBtn').disabled=!near;
    $('actionBtn').textContent=near?`操作：${near.label}`:'操作';
    $('altitude').textContent=`${Math.round(player.foot)} m`;
    $('district').textContent=player.x<-12?'商業地区':player.x>12?'居住地区':'中央大通り';
    if(now>toastUntil)log.classList.remove('on');
  }
}
bootMsg.textContent='描画準備完了';$('start').disabled=false;
requestAnimationFrame(tick);
window.addEventListener('pagehide',()=>{district.dispose();renderer.dispose();});
