/** No.07 exploration showcase only. Integration uses aether-nature.js, not this file. */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { createAetherModule } from './aether-nature.js';

const $=id=>document.getElementById(id);
const mobile=matchMedia('(pointer: coarse)').matches||/iPhone|iPad|Android/i.test(navigator.userAgent);
const qualitySelect=$('quality'),viewSelect=$('view'),flightBtn=$('flight'),interactBtn=$('interact');
let quality=mobile?'low':'high',view='third',flight=false,mapOpen=false,menuOpen=false,started=false;
let fpsSmooth=60, uiTime=0, lastFrame=performance.now(), yaw=-.12,pitch=-.13;
const scene=new THREE.Scene();scene.background=new THREE.Color(0x91aebc);scene.fog=new THREE.FogExp2(0x829faf,.00125);
const camera=new THREE.PerspectiveCamera(68,1,.08,1100);
const renderer=new THREE.WebGLRenderer({antialias:!mobile,alpha:false,powerPreference:'high-performance'});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.42;
renderer.shadowMap.enabled=false;
renderer.setClearColor(0x758d9e,1);
$('viewport').appendChild(renderer.domElement);
renderer.domElement.id='game-canvas';
renderer.domElement.setAttribute('aria-label','星脈の大地 3D探索画面');
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
const hemi=new THREE.HemisphereLight(0xcce7fb,0x345d53,2.35);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffd6a9,2.4);sun.position.set(-135,220,-210);scene.add(sun);
const fill=new THREE.DirectionalLight(0x76d7d5,.62);fill.position.set(190,90,120);scene.add(fill);

// High sky sphere, no panoramas, texture downloads, or postprocessing required.
const skyMat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,
  vertexShader:'varying vec3 dir;void main(){dir=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec3 dir;void main(){float h=clamp(dir.y,0.,1.);
    vec3 a=vec3(.38,.59,.65),b=vec3(.14,.35,.47),c=vec3(.03,.15,.28);
    vec3 sky=mix(a,b,smoothstep(.04,.45,h));sky=mix(sky,c,smoothstep(.44,1.,h));
    vec3 s=normalize(vec3(-.5,.32,-.66));float d=max(0.,dot(normalize(dir),s));
    sky+=vec3(1.,.48,.25)*pow(d,15.)*.23+vec3(1.,.82,.49)*pow(d,280.)*.95;
    gl_FragColor=vec4(sky,1.);}`});
const sky=new THREE.Mesh(new THREE.SphereGeometry(850,30,18),skyMat);sky.renderOrder=-1000;scene.add(sky);
const cloudMat=new THREE.MeshBasicMaterial({color:0xd3ecee,transparent:true,opacity:.13,depthWrite:false});
for(let i=0;i<24;i++) {
  const a=i*2.399,r=300+(i%5)*75,cloud=new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),cloudMat);
  cloud.position.set(Math.cos(a)*r,80+(i*23)%85,Math.sin(a)*r);
  cloud.scale.set(41+(i%5)*16,4+(i%3)*3,18+(i%4)*9);scene.add(cloud);
}
const zone=createAetherModule(THREE,{quality});scene.add(zone.root);
const MAP_NODES=zone.markers;

// Standalone demonstration glider. The integration team may use No.08's craft instead.
function createSkiff() {
 const g=new THREE.Group();g.name='Demo scout skiff / replace with No08';
 const hull=new THREE.MeshStandardMaterial({color:0x273e49,metalness:.74,roughness:.3});
 const gold=new THREE.MeshStandardMaterial({color:0xb8a07b,metalness:.72,roughness:.33});
 const glass=new THREE.MeshStandardMaterial({color:0x36a9bd,metalness:.4,roughness:.14,emissive:0x135a68,emissiveIntensity:.6});
 const jet=new THREE.MeshBasicMaterial({color:0x71f5de,toneMapped:false});
 const add=(geo,mat,x,y,z,sx,sy,sz,rotY=0)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.rotation.y=rotY;g.add(m);return m;};
 const box=new THREE.BoxGeometry(1,1,1),cone=new THREE.ConeGeometry(1,1,6),ico=new THREE.IcosahedronGeometry(1,0),torus=new THREE.TorusGeometry(1,.12,6,24);
 add(ico,hull,0,0,0,1.4,.48,3.1);
 add(ico,glass,0,.52,-.22,.85,.49,1.5);
 for(const s of [-1,1]){
  add(box,gold,s*2.1,-.18,.3,2.6,.16,1.6,s*.12);
  add(ico,hull,s*3,-.20,.15,.64,.44,1.65);
  add(torus,jet,s*3,-.23,1.4,.5,.5,.5);
  add(cone,gold,s*2,.05,-1.16,.25,.98,.25).rotation.x=-Math.PI/2;
  add(box,glass,s*2,.09,-1.33,1.0,.10,.35);
 }
 add(torus,jet,0,-.33,2.6,.6,.6,.6);
 const core=add(ico,jet,0,-.45,-.2,.31,.65,.61);
 g.userData.core=core;
 return g;
}
const skiff=createSkiff();scene.add(skiff);skiff.visible=false;

const player={position:new THREE.Vector3(0,0,23),velocityY:0,grounded:true};
player.position.y=zone.getWalkHeight(player.position.x,player.position.z);
const keys=new Set();let pointerLocked=false;
const touch={lx:0,ly:0,lookId:null,lookX:0,lookY:0};
let targetId='lake';
const targetOf=()=>MAP_NODES.find(p=>p.id===targetId)||MAP_NODES[0];
const safeSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
const safeGet=k=>{try{return localStorage.getItem(k)}catch(e){return null;}};
try{const s=JSON.parse(safeGet('af07_state_v1')||'null');if(s)zone.loadState(s);}catch(e){}

function setQuality(next){
 quality=zone.setQuality(next);renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,quality==='high'?(mobile?1.6:1.8):1.15));
 renderer.toneMappingExposure=quality==='high'?1.42:1.38;
 qualitySelect.textContent=quality==='high'?'高品質':'軽量';
 safeSet('af07_quality',quality);
 resize();toast(quality==='high'?'高品質モード：景観密度を増加':'軽量モード：植生と地形を軽量化',1800);
}
function toggleView(){view=view==='third'?'first':'third';viewSelect.textContent=view==='third'?'TPS':'FPS';$('viewLabel').textContent=view==='third'?'TPS':'FPS';}
function toggleFlight(){
 flight=!flight;player.velocityY=0;
 if(flight){player.position.y=Math.max(player.position.y+5,zone.getWalkHeight(player.position.x,player.position.z)+7);toast('偵察用グライダー展開。SPACEで上昇、Cで下降',3300);}
 else {toast('着陸モード：地表まで降下',1800);}
 flightBtn.classList.toggle('active',flight);flightBtn.querySelector('span').textContent=flight?'着陸':'飛行';
 $('modeLabel').textContent=flight?'FLIGHT':'WALK';skiff.visible=flight&&view==='third';
}
function interact(){
 const res=zone.interact(player.position);
 if(res.reason==='out_of_range'){toast('共鳴装置に近づいてから操作してね',2000);return;}
 if(res.reason==='locked'){toast(res.message,3000);return;}
 if(res.ok){
   toast(res.already?res.message:`${res.name} 起動 | ${res.message}`,res.final?7500:5200);
   safeSet('af07_state_v1',JSON.stringify(zone.getState()));
   if(res.final){$('victory').classList.add('visible');$('victory').setAttribute('aria-hidden','false');}
   updateObjective();
   const next=MAP_NODES.find(p=>!p.final&&!zone.getState().collected.includes(p.id));
   if(next)targetId=next.id;else if(!zone.getState().portalOpen)targetId='ring';
   updateTarget();buildNodes();
 }
}
let toastTimer=0;
function toast(message,ms=2900){const t=$('toast');t.textContent=message;t.classList.add('show');toastTimer=performance.now()+ms;}
function chooseTarget(id){targetId=id;buildNodes();updateTarget();$('mapDialog').classList.remove('visible');mapOpen=false;}
function updateObjective(){
 const s=zone.getState();$('progressValue').textContent=`${s.progress} / 5`;
 $('progressFill').style.width=`${s.progress/5*100}%`;
 $('objective').textContent=s.portalOpen?'全域探索完了。星脈の門が起動した。':s.progress===5?'五つの記憶が揃った。石環を起動せよ。':'五つの古代記憶を見つけ、石環を目覚めさせよ。';
 if(s.progress===5&&!s.portalOpen)targetId='ring';
}
function updateTarget(){const t=targetOf();$('targetName').textContent=t.name;}
function buildNodes(){
 const s=zone.getState(),list=$('locations');list.textContent='';
 MAP_NODES.forEach((p,i)=>{
  const done=p.final?s.portalOpen:s.collected.includes(p.id),li=document.createElement('button');li.className='location'+(p.id===targetId?' selected':'');
  const icon=document.createElement('span');icon.className='location-icon';icon.textContent=done?'✓':p.final?'◇':String(i+1).padStart(2,'0');
  const body=document.createElement('span');body.className='location-text';const title=document.createElement('strong');title.textContent=p.name;
  const detail=document.createElement('small');detail.textContent=done?'起動済み':p.final?'最後の祭壇':'未発見の記憶';body.append(title,detail);li.append(icon,body);
  li.addEventListener('click',()=>chooseTarget(p.id));list.appendChild(li);
 });
}
function toggleMap(){mapOpen=!mapOpen;$('mapDialog').classList.toggle('visible',mapOpen);if(mapOpen)buildNodes();}
$('mapBtn').addEventListener('click',toggleMap);
$('closeMap').addEventListener('click',toggleMap);
$('resetBtn').addEventListener('click',()=>{zone.loadState({collected:[],portalOpen:false});safeSet('af07_state_v1',JSON.stringify(zone.getState()));$('victory').classList.remove('visible');$('victory').setAttribute('aria-hidden','true');targetId='lake';updateObjective();buildNodes();toast('探索記録を初期化した',2100);});
$('victoryClose').addEventListener('click',()=>{$('victory').classList.remove('visible');$('victory').setAttribute('aria-hidden','true');});
$('flight').addEventListener('click',toggleFlight);
$('view').addEventListener('click',toggleView);
$('quality').addEventListener('click',()=>setQuality(quality==='high'?'low':'high'));
$('interact').addEventListener('click',interact);
$('jump').addEventListener('click',()=>{if(flight){player.position.y+=1.1;}else if(player.grounded){player.velocityY=9.9;player.grounded=false;}});
$('up').addEventListener('pointerdown',()=>keys.add('Space'));
$('up').addEventListener('pointerup',()=>keys.delete('Space'));
$('up').addEventListener('pointercancel',()=>keys.delete('Space'));
$('down').addEventListener('pointerdown',()=>keys.add('KeyC'));
$('down').addEventListener('pointerup',()=>keys.delete('KeyC'));
$('down').addEventListener('pointercancel',()=>keys.delete('KeyC'));

function keyDown(e){
 if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
 if(e.repeat)return;
 keys.add(e.code);
 if(e.code==='KeyE')interact();
 if(e.code==='KeyF')toggleFlight();
 if(e.code==='KeyV')toggleView();
 if(e.code==='KeyM')toggleMap();
 if(e.code==='Escape'&&mapOpen)toggleMap();
}
window.addEventListener('keydown',keyDown,{passive:false});
window.addEventListener('keyup',e=>keys.delete(e.code));
window.addEventListener('blur',()=>{keys.clear();touch.lx=touch.ly=0;});
renderer.domElement.addEventListener('click',()=>{if(!mobile&&document.pointerLockElement!==renderer.domElement)renderer.domElement.requestPointerLock?.();});
document.addEventListener('pointerlockchange',()=>{pointerLocked=document.pointerLockElement===renderer.domElement;$('hintPointer').textContent=pointerLocked?'ESCでカーソル解放':'画面をクリックして視点操作';});
document.addEventListener('mousemove',e=>{if(pointerLocked)turn(e.movementX,e.movementY);});
function turn(dx,dy){yaw-=dx*.0026;pitch=Math.max(-1.19,Math.min(.92,pitch-dy*.0022));}
renderer.domElement.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')return;if(touch.lookId!==null)return;if(e.clientX<innerWidth*.39&&e.clientY>innerHeight*.55)return;touch.lookId=e.pointerId;touch.lookX=e.clientX;touch.lookY=e.clientY;renderer.domElement.setPointerCapture?.(e.pointerId);});
renderer.domElement.addEventListener('pointermove',e=>{if(e.pointerId!==touch.lookId)return;turn((e.clientX-touch.lookX)*1.25,(e.clientY-touch.lookY)*1.25);touch.lookX=e.clientX;touch.lookY=e.clientY;});
for(const event of ['pointerup','pointercancel'])renderer.domElement.addEventListener(event,e=>{if(e.pointerId===touch.lookId)touch.lookId=null;});
const joy=$('joystick'),knob=$('knob');let joyId=null;
function changeJoy(e){const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,rx=(e.clientX-cx)/(r.width*.40),ry=(e.clientY-cy)/(r.height*.40);const mag=Math.max(1,Math.hypot(rx,ry));touch.lx=rx/mag;touch.ly=ry/mag;knob.style.transform=`translate(${touch.lx*42}px, ${touch.ly*42}px)`;}
joy.addEventListener('pointerdown',e=>{joyId=e.pointerId;joy.setPointerCapture(e.pointerId);changeJoy(e);e.preventDefault();});
joy.addEventListener('pointermove',e=>{if(e.pointerId===joyId)changeJoy(e);});
for(const ev of ['pointerup','pointercancel','lostpointercapture'])joy.addEventListener(ev,e=>{if(e.pointerId===joyId){joyId=null;touch.lx=touch.ly=0;knob.style.transform='translate(0,0)';}});

function updatePlayer(dt){
 const xInput=((keys.has('KeyD')||keys.has('ArrowRight'))?1:0)-((keys.has('KeyA')||keys.has('ArrowLeft'))?1:0)+touch.lx;
 const zInput=((keys.has('KeyW')||keys.has('ArrowUp'))?1:0)-((keys.has('KeyS')||keys.has('ArrowDown'))?1:0)-touch.ly;
 let mx=xInput,mz=zInput;const inputLen=Math.hypot(mx,mz);if(inputLen>1){mx/=inputLen;mz/=inputLen;}
 const fast=keys.has('ShiftLeft')||keys.has('ShiftRight');
 const speed=flight?(fast?48:33):(fast?15:9.5);
 const sin=Math.sin(yaw),cos=Math.cos(yaw);
 player.position.x+=(-sin*mz+cos*mx)*speed*dt;
 player.position.z+=(-cos*mz-sin*mx)*speed*dt;
 player.position.x=Math.max(-342,Math.min(342,player.position.x));
 player.position.z=Math.max(-342,Math.min(342,player.position.z));
 const ground=zone.getWalkHeight(player.position.x,player.position.z);
 if(flight){
  const ascent=(keys.has('Space')?1:0)-(keys.has('KeyC')||keys.has('ControlLeft')?1:0);
  player.position.y+=ascent*18*dt;
  player.position.y=Math.max(ground+2.9,Math.min(ground+105,player.position.y));
  skiff.visible=view==='third';
  skiff.position.copy(player.position);skiff.position.y-=.55;skiff.rotation.set(Math.sin(performance.now()*.0019)*.022,yaw,Math.sin(performance.now()*.0012)*.035);
  skiff.userData.core.scale.y=.62+Math.sin(performance.now()*.013)*.14;
 } else {
  skiff.visible=false;player.velocityY-=27*dt;player.position.y+=player.velocityY*dt;
  if(player.position.y<=ground){player.position.y=ground;player.velocityY=0;player.grounded=true;}else player.grounded=false;
  if(keys.has('Space')&&player.grounded){player.velocityY=9.8;player.grounded=false;}
 }
 const forward=new THREE.Vector3(-sin,0,-cos);
 const cameraY=player.position.y+(flight?2.4:1.95);
 if(view==='first') {
   camera.position.set(player.position.x,cameraY,player.position.z);
   camera.rotation.order='YXZ';camera.rotation.y=yaw;camera.rotation.x=pitch;
 } else {
   const dist=flight?14:8.4,baseY=flight?5.3:3.7;
   const camX=player.position.x-forward.x*dist,camZ=player.position.z-forward.z*dist;
   camera.position.set(camX,Math.max(zone.getWalkHeight(Math.max(-359,Math.min(359,camX)),Math.max(-359,Math.min(359,camZ)))+2.3,player.position.y+baseY-Math.sin(pitch)*4.7),camZ);
   const aim=player.position.clone().add(new THREE.Vector3(forward.x*16,1.3+pitch*14,forward.z*16));
   camera.lookAt(aim);
 }
 sky.position.copy(camera.position);
}
function resize(){const w=window.innerWidth,h=window.innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
window.addEventListener('resize',resize);resize();

// Small navigational chart rendered at ~6Hz; never a per-frame texture upload to WebGL.
const mapCanvas=$('miniCanvas'),ctx=mapCanvas.getContext('2d');
const bg=document.createElement('canvas');bg.width=bg.height=164;
const bgCtx=bg.getContext('2d');const raw=bgCtx.createImageData(164,164);
for(let py=0;py<164;py++)for(let px=0;px<164;px++){
 const x=(px/163-.5)*720,z=(py/163-.5)*720,h=zone.terrainHeight(x,z),lake=Math.hypot((x+148)/103,(z+80)/89)<.83;
 const forest=x>28&&z<110,v=(Math.sin(x*.07+z*.02)+Math.cos(z*.055-x*.028))*7;
 const c=lake?[36,110,123]:h>24?[112,123,125]:forest?[40,95,77]:z<-95?[91,103,102]:[68,112,94];
 const j=(py*164+px)*4;raw.data[j]=Math.max(0,c[0]+v);raw.data[j+1]=Math.max(0,c[1]+v);raw.data[j+2]=Math.max(0,c[2]+v);raw.data[j+3]=255;
}
bgCtx.putImageData(raw,0,0);
function drawMap(){
 const w=220,h=220;mapCanvas.width=w;mapCanvas.height=h;
 ctx.clearRect(0,0,w,h);ctx.save();ctx.beginPath();ctx.arc(110,110,100,0,Math.PI*2);ctx.clip();
 // The player's immediate region is enlarged for local navigation.
 const scale=.53,screenX=x=>110+(x-player.position.x)*scale,screenY=z=>110+(z-player.position.z)*scale;
 ctx.fillStyle='#183e47';ctx.fillRect(0,0,220,220);
 const sz=720*scale;ctx.drawImage(bg,110+(-360-player.position.x)*scale,110+(-360-player.position.z)*scale,sz,sz);
 MAP_NODES.forEach(p=>{
  const x=screenX(p.x),y=screenY(p.z),state=zone.getState(),done=p.final?state.portalOpen:state.collected.includes(p.id);
  ctx.save();ctx.fillStyle=done?'#8ce7b7':p.id===targetId?'#ffe1a4':'#cbf7ef';
  ctx.beginPath();ctx.arc(x,y,p.id===targetId?5.4:3.6,0,Math.PI*2);ctx.fill();
  if(p.id===targetId){ctx.strokeStyle='#fff1c9';ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.stroke();}
  ctx.restore();
 });
 ctx.translate(110,110);ctx.rotate(-yaw);ctx.fillStyle='#ffffff';ctx.strokeStyle='#1a454d';ctx.lineWidth=3;
 ctx.beginPath();ctx.moveTo(0,-13);ctx.lineTo(-8,9);ctx.lineTo(0,5);ctx.lineTo(8,9);ctx.closePath();ctx.stroke();ctx.fill();
 ctx.restore();ctx.beginPath();ctx.arc(110,110,100,0,6.283);ctx.strokeStyle='rgba(207,247,235,.37)';ctx.lineWidth=1.5;ctx.stroke();
 ctx.fillStyle='#e1f7f2';ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.fillText('N',110,15);
}
function updateInfo(){
 const t=targetOf(),dist=Math.hypot(t.x-player.position.x,t.z-player.position.z);
 $('targetDist').textContent=`${Math.round(dist)} m`;
 $('position').textContent=`X ${Math.round(player.position.x)}  Z ${Math.round(player.position.z)}  高度 ${Math.round(player.position.y)}m`;
 const near=zone.getNearby(player.position,12.0);
 const prompt=$('interactPrompt');prompt.classList.toggle('visible',!!near);
 if(near){$('nearName').textContent=near.name;interactBtn.classList.add('ready');}else interactBtn.classList.remove('ready');
 const fwdAngle=Math.atan2(-(t.x-player.position.x),-(t.z-player.position.z));
 const delta=fwdAngle-yaw;
 $('compassArrow').style.transform=`rotate(${-delta}rad)`;
 $('fps').textContent=Math.round(fpsSmooth)+' fps';
}
setQuality(quality);updateObjective();updateTarget();buildNodes();
if(mobile){$('mobileControls').classList.add('visible');$('desktopHelp').classList.add('hide');$('hintPointer').textContent='右側をスワイプして視点操作';}
else {$('desktopHelp').classList.remove('hide');}
function tick(now){
 requestAnimationFrame(tick);
 const dt=Math.min(.05,(now-lastFrame)/1000||0);lastFrame=now;
 if(dt>0)fpsSmooth=fpsSmooth*.92+(1/dt)*.08;
 if(!$('victory').classList.contains('visible'))updatePlayer(dt);
 zone.update(dt,{playerPosition:player.position});renderer.render(scene,camera);
 uiTime+=dt;if(uiTime>.155){uiTime=0;updateInfo();drawMap();}
 if(toastTimer&&now>toastTimer){$('toast').classList.remove('show');toastTimer=0;}
}
requestAnimationFrame(tick);
