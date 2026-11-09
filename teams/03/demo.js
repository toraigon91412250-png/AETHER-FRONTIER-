/** AETHER FRONTIER // TEAM 03 standalone playable scene, using an independent world module. */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import {createAetherModule,createAetherSkiff} from './aether-sky-islands.js';

const $=id=>document.getElementById(id),canvas=$('stage');
const isTouch=matchMedia('(pointer:coarse)').matches;
const scene=new THREE.Scene();scene.background=new THREE.Color(0xaed9f1);
scene.fog=new THREE.FogExp2(0xc9e1ed,.0011);
const camera=new THREE.PerspectiveCamera(isTouch?74:69,innerWidth/innerHeight,.07,1200);
const renderer=new THREE.WebGLRenderer({canvas,antialias:!isTouch,alpha:false,powerPreference:'high-performance',stencil:false});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;
const hemi=new THREE.HemisphereLight(0xc9edff,0x53666b,2.05);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffedca,2.55);sun.position.set(-120,190,-110);scene.add(sun);
const fill=new THREE.DirectionalLight(0x94c6e8,.65);fill.position.set(110,70,70);scene.add(fill);
const world=createAetherModule(THREE,{quality:'high',includeSky:true});scene.add(world.root);
const skiff=createAetherSkiff(THREE);scene.add(skiff);
const spawn=world.metadata.spawn,shipStart=world.metadata.skiffSpawn;
skiff.position.set(shipStart.x,shipStart.y,shipStart.z);
const ship={isMounted:false,velocity:new THREE.Vector3(),yaw:0};
const player={position:new THREE.Vector3(spawn.x,spawn.y,spawn.z),verticalSpeed:0,grounded:true,yaw:0,pitch:-.07,
  velocity:new THREE.Vector3(),view:'TPS',walkCycle:0};

function avatarModel(){
  const root=new THREE.Group();root.name='Explorer avatar';
  const geo={box:new THREE.BoxGeometry(1,1,1),ball:new THREE.IcosahedronGeometry(1,1),cyl:new THREE.CylinderGeometry(1,1,1,8)};
  const cyan=new THREE.MeshStandardMaterial({color:0x5ec8d3,metalness:.66,roughness:.33,emissive:0x106177,emissiveIntensity:.24});
  const gold=new THREE.MeshStandardMaterial({color:0xf0d1a0,metalness:.65,roughness:.33});
  const dark=new THREE.MeshStandardMaterial({color:0x1c3446,metalness:.66,roughness:.39});
  const cloth=new THREE.MeshStandardMaterial({color:0x28516e,metalness:.16,roughness:.8,flatShading:true});
  const visor=new THREE.MeshStandardMaterial({color:0x78eeeb,metalness:.45,roughness:.17,emissive:0x168ca0,emissiveIntensity:.43});
  const resources=[...Object.values(geo),cyan,gold,dark,cloth,visor];
  const part=(g,m,x,y,z,sx,sy,sz,parent=root)=>{const mesh=new THREE.Mesh(g,m);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);parent.add(mesh);return mesh;};
  part(geo.box,cloth,0,1.21,0,.72,1.04,.41);
  part(geo.box,gold,0,1.7,-.15,.81,.21,.48);
  part(geo.box,dark,0,1.28,.27,.65,.78,.36);
  part(geo.ball,dark,0,2.04,0,.4,.42,.39);
  part(geo.box,visor,0,2.05,-.34,.65,.24,.15);
  part(geo.box,gold,0,1.06,-.26,.8,.16,.15);
  const leftLeg=new THREE.Group(),rightLeg=new THREE.Group();
  leftLeg.position.set(-.22,.88,.04);rightLeg.position.set(.22,.88,.04);root.add(leftLeg,rightLeg);
  part(geo.box,cloth,0,-.35,0,.26,.75,.29,leftLeg);part(geo.box,dark,0,-.74,-.1,.28,.26,.5,leftLeg);
  part(geo.box,cloth,0,-.35,0,.26,.75,.29,rightLeg);part(geo.box,dark,0,-.74,-.1,.28,.26,.5,rightLeg);
  part(geo.box,gold,-.54,1.28,.04,.23,.6,.25);part(geo.box,gold,.54,1.28,.04,.23,.6,.25);
  const cape=part(geo.box,cyan,0,1.1,.33,.58,.85,.09);cape.rotation.x=-.24;
  root.userData={leftLeg,rightLeg,cape,dispose(){for(const r of resources)r.dispose();}};
  return root;
}
const avatar=avatarModel();scene.add(avatar);
const qualityButton=$('quality'),cameraButton=$('cameraMode');
let quality='high',started=false,elapsed=0,lastArea='',toastTimeout=0,frame=0,statsAccum=0,lastMap=0,jumpWasHeld=false;
const keys=Object.create(null),mobile={x:0,y:0,up:false,down:false},viewport={x:0,y:0};
function setQuality(next){
  quality=next;world.setQuality(next);renderer.setPixelRatio(Math.min(devicePixelRatio,next==='high'?(isTouch?1.5:1.8):1.15));
  renderer.setSize(innerWidth,innerHeight,false);
  renderer.toneMappingExposure=next==='high'?1.2:1.12;
  qualityButton.textContent='画質：'+(next==='high'?'高品質':'軽量');
}
setQuality('high');
function switchView(){player.view=player.view==='TPS'?'FPS':'TPS';cameraButton.textContent='視点：'+player.view;}
qualityButton.addEventListener('click',()=>setQuality(quality==='high'?'low':'high'));
cameraButton.addEventListener('click',switchView);
function toast(message,seconds=2.8){$('toast').textContent=message;$('toast').classList.add('visible');toastTimeout=elapsed+seconds;}
function hideCurtain(){$('curtain').style.display='none';started=true;
  if(!isTouch&&document.pointerLockElement!==canvas){canvas.requestPointerLock?.().catch(()=>{});}}
function showCurtain(){
  if(!started){return;}
  $('curtain').style.display='flex';$('intro').querySelector('p').textContent='探索はいつでも再開できる。視点操作を再び有効にしよう。';
  $('launch').textContent='探索に戻る';
  started=false;
}
$('launch').addEventListener('click',hideCurtain);
$('help').addEventListener('click',()=>{
  if(document.pointerLockElement===canvas)document.exitPointerLock();
  showCurtain();
});
canvas.addEventListener('click',()=>{if(started&&!isTouch&&document.pointerLockElement!==canvas)canvas.requestPointerLock?.().catch(()=>{});});
document.addEventListener('pointerlockchange',()=>{});
function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function turn(dx,dy){player.yaw+=dx*(isTouch?.0049:.0026);player.pitch=clamp(player.pitch-dy*(isTouch?.0047:.0026),-1.14,1.20);}
document.addEventListener('mousemove',e=>{if(started&&document.pointerLockElement===canvas)turn(e.movementX,e.movementY);});
window.addEventListener('keydown',e=>{
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
  keys[e.code]=true;
  if(!started||e.repeat)return;
  if(e.code==='KeyV')switchView();
  if(e.code==='KeyF')toggleShip();
  if(e.code==='KeyE')interact();
  if(e.code==='KeyQ')setQuality(quality==='high'?'low':'high');
  if(e.code==='KeyH')showCurtain();
});
window.addEventListener('keyup',e=>{keys[e.code]=false;});
window.addEventListener('blur',()=>{for(const k in keys)keys[k]=false;mobile.up=mobile.down=false;});

let activeLookPointer=null,lookLastX=0,lookLastY=0;
canvas.addEventListener('pointerdown',e=>{
  if(!isTouch||!started||e.clientX<innerWidth*.40||activeLookPointer!==null)return;
  activeLookPointer=e.pointerId;lookLastX=e.clientX;lookLastY=e.clientY;canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove',e=>{
  if(e.pointerId!==activeLookPointer)return;
  turn(e.clientX-lookLastX,e.clientY-lookLastY);lookLastX=e.clientX;lookLastY=e.clientY;
});
function releaseLook(e){if(activeLookPointer===e.pointerId)activeLookPointer=null;}
canvas.addEventListener('pointerup',releaseLook);canvas.addEventListener('pointercancel',releaseLook);
const base=$('stickBase'),tip=$('stickTip');let stickPointer=null;
function stickMove(e){const r=base.getBoundingClientRect(),centerX=r.left+r.width/2,centerY=r.top+r.height/2;
  const dx=e.clientX-centerX,dy=e.clientY-centerY,lim=r.width*.34,m=Math.hypot(dx,dy),mul=m>lim?lim/m:1;
  mobile.x=clamp(dx*mul/lim,-1,1);mobile.y=clamp(-dy*mul/lim,-1,1);
  tip.style.transform=`translate(${dx*mul}px,${dy*mul}px)`;
}
base.addEventListener('pointerdown',e=>{if(stickPointer!==null)return;stickPointer=e.pointerId;base.setPointerCapture(e.pointerId);stickMove(e);});
base.addEventListener('pointermove',e=>{if(e.pointerId===stickPointer)stickMove(e);});
function stickEnd(e){if(e.pointerId!==stickPointer)return;stickPointer=null;mobile.x=mobile.y=0;tip.style.transform='';}
base.addEventListener('pointerup',stickEnd);base.addEventListener('pointercancel',stickEnd);
const buttonHeld=(id,name)=>{const button=$(id);button.addEventListener('pointerdown',e=>{mobile[name]=true;button.setPointerCapture(e.pointerId);});
  button.addEventListener('pointerup',()=>mobile[name]=false);button.addEventListener('pointercancel',()=>mobile[name]=false);
};
buttonHeld('btnUp','up');buttonHeld('btnDown','down');
$('btnInteract').addEventListener('click',interact);
$('btnShip').addEventListener('click',toggleShip);
$('introKeys').innerHTML=isTouch?'スマホ：左スティック 移動 ・ 右画面ドラッグ 視点<br>ボタンでジャンプ／飛行艇の上昇・降下・装置起動・乗降':$('introKeys').innerHTML;

function toggleShip(){
  if(ship.isMounted){
    const landing=world.sampleGround(player.position.x,player.position.z,Infinity);
    if(!landing||player.position.y>landing.height+8){toast('降機するには島や橋の近くまで下降しよう');return;}
    const old=player.position.clone();
    ship.isMounted=false;player.position.set(old.x,landing.height+.2,old.z);player.verticalSpeed=0;player.grounded=true;
    ship.velocity.set(0,0,0);skiff.position.copy(old);toast('飛行艇から降りた');return;
  }
  const dist=player.position.distanceTo(skiff.position);
  if(dist>8.5){toast('飛行艇の近くで F を押すと搭乗できる');return;}
  ship.isMounted=true;player.position.copy(skiff.position);player.verticalSpeed=0;ship.velocity.set(0,0,0);
  ship.yaw=player.yaw;toast('ZEPHYR 飛行艇 起動 | Space 上昇 / Ctrl 降下 / Shift 加速');
}
function interact(){
  if(ship.isMounted){toast('装置は降機してから起動できる');return;}
  const b=world.closestBeacon(player.position,7.8);
  if(!b){
    const obs=world.metadata.islands.find(v=>v.id==='observatory');
    if(world.activatedCount()===5&&Math.hypot(player.position.x-obs.x,player.position.z-(obs.z+15))<12){
      toast('星門は完全に起動した。天空航路が開かれた。',5);return;
    }
    toast('近くに起動できる装置がない');return;
  }
  world.activateBeacon(b.id);
  const n=world.activatedCount();
  toast(`エーテル灯 起動：${b.name}   (${n}/5)`,3.7);
  updateObjective();
  if(n===5)toast('全エーテル灯、再起動完了。天球観測院の星門が開いた！',5.4);
}
function updateObjective(){
  const n=world.activatedCount(),prog=$('beaconProgress');prog.replaceChildren();
  for(let k=0;k<5;k++){const el=document.createElement('i');el.className='beacon'+(k<n?' active':'');prog.append(el);}
  $('questTitle').textContent=n===5?'星門の解放を確認せよ':`エーテル灯の起動  ${n} / 5`;
  $('questDesc').textContent=n===5?'5つの灯が連動した。北の天球観測院に出現した星門を探索しよう。':'庭園・採掘島・風車街・果樹園・環流炉に眠る装置を探そう。';
}
updateObjective();

const FWD=new THREE.Vector3(),RIGHT=new THREE.Vector3(),INPUT=new THREE.Vector3(),CAM=new THREE.Vector3();
function movementInput(){
  const a=(keys['KeyD']||keys['ArrowRight']?1:0)-(keys['KeyA']||keys['ArrowLeft']?1:0)+mobile.x;
  const b=(keys['KeyW']||keys['ArrowUp']?1:0)-(keys['KeyS']||keys['ArrowDown']?1:0)+mobile.y;
  INPUT.set(clamp(a,-1,1),0,clamp(b,-1,1));if(INPUT.lengthSq()>1)INPUT.normalize();
  FWD.set(Math.sin(player.yaw),0,-Math.cos(player.yaw));RIGHT.set(Math.cos(player.yaw),0,Math.sin(player.yaw));
  return INPUT;
}
function simulateFoot(dt){
  const input=movementInput(),running=!!(keys['ShiftLeft']||keys['ShiftRight']);
  const speed=running?12.4:7.4;
  const targetX=(RIGHT.x*input.x+FWD.x*input.z)*speed,targetZ=(RIGHT.z*input.x+FWD.z*input.z)*speed;
  const smoothing=1-Math.exp(-12*dt);
  player.velocity.x=THREE.MathUtils.lerp(player.velocity.x,targetX,smoothing);
  player.velocity.z=THREE.MathUtils.lerp(player.velocity.z,targetZ,smoothing);
  player.position.x+=player.velocity.x*dt;player.position.z+=player.velocity.z*dt;
  world.resolveFootCollision(player.position);
  const surface=world.sampleGround(player.position.x,player.position.z,player.position.y);
  if(player.grounded&&(!surface||player.position.y>surface.height+1.6))player.grounded=false;
  const wantsJump=keys['Space']||mobile.up;
  if(wantsJump&&!jumpWasHeld&&player.grounded){player.verticalSpeed=9.3;player.grounded=false;}
  jumpWasHeld=!!wantsJump;
  player.verticalSpeed-=23*dt;
  const updraft=world.getUpdraft(player.position);
  if(updraft){player.verticalSpeed=Math.max(player.verticalSpeed,11.6);player.grounded=false;}
  player.position.y+=player.verticalSpeed*dt;
  const land=world.sampleGround(player.position.x,player.position.z,player.position.y+Math.max(0,-player.verticalSpeed*dt)+1.4);
  if(land&&player.verticalSpeed<=0&&player.position.y<=land.height+.26){
    player.position.y=land.height+.05;player.grounded=true;player.verticalSpeed=0;
  }else if(land&&player.grounded&&Math.abs(player.position.y-land.height)<.72){player.position.y=land.height+.05;}
  if(player.position.y<-48){
    player.position.set(spawn.x,spawn.y,spawn.z);player.verticalSpeed=0;player.grounded=true;
    player.velocity.set(0,0,0);toast('空中航路へ復帰した');
  }
  player.walkCycle+=dt*Math.hypot(player.velocity.x,player.velocity.z);
  avatar.position.copy(player.position);avatar.rotation.y=player.yaw;
  const stride=Math.min(.7,Math.hypot(player.velocity.x,player.velocity.z)*.067)*(player.grounded?1:.18);
  avatar.userData.leftLeg.rotation.x=Math.sin(player.walkCycle*1.5)*stride;
  avatar.userData.rightLeg.rotation.x=-Math.sin(player.walkCycle*1.5)*stride;
  avatar.userData.cape.rotation.x=-.24-Math.sin(elapsed*4)*.09;
  avatar.visible=player.view==='TPS';
}
function simulateShip(dt){
  const input=movementInput(),fast=!!(keys['ShiftLeft']||keys['ShiftRight']);
  const speed=fast?53:33;const v=ship.velocity;
  const desiredX=(RIGHT.x*input.x+FWD.x*input.z)*speed,desiredZ=(RIGHT.z*input.x+FWD.z*input.z)*speed;
  const alpha=1-Math.exp(-2.8*dt);
  v.x=lerpDemo(v.x,desiredX,alpha);v.z=lerpDemo(v.z,desiredZ,alpha);
  const lift=(keys['Space']||mobile.up?1:0)-(keys['ControlLeft']||keys['ControlRight']||mobile.down?1:0);
  v.y=lerpDemo(v.y,lift*(fast?24:17),1-Math.exp(-4*dt));
  player.position.addScaledVector(v,dt);
  player.position.y=clamp(player.position.y,-12,138);
  const below=world.sampleGround(player.position.x,player.position.z,Infinity);
  if(below&&player.position.y<below.height+2.9){player.position.y=below.height+2.9;v.y=Math.max(0,v.y);}
  const yawDelta=THREE.MathUtils.euclideanModulo(player.yaw-ship.yaw+Math.PI,Math.PI*2)-Math.PI;
  ship.yaw+=clamp(yawDelta,-dt*4.5,dt*4.5);
  skiff.position.copy(player.position);skiff.position.y+=Math.sin(elapsed*3.6)*.12;
  skiff.rotation.set(clamp(v.z*.007,-.16,.16),ship.yaw,clamp(-input.x*.14,-.16,.16),'YXZ');
  avatar.visible=false;
}
function lerpDemo(a,b,t){return a+(b-a)*t;}
const cameraTarget=new THREE.Vector3();
function positionCamera(dt){
  FWD.set(Math.sin(player.yaw),0,-Math.cos(player.yaw));
  const eyeOffset=ship.isMounted?2.0:1.73;
  if(player.view==='FPS'){
    if(ship.isMounted)camera.position.copy(player.position).add(new THREE.Vector3(0,1.35,-.1).applyAxisAngle(new THREE.Vector3(0,1,0),player.yaw));
    else camera.position.copy(player.position).add(new THREE.Vector3(0,eyeOffset,0));
    camera.rotation.set(player.pitch,player.yaw,0,'YXZ');
  }else{
    const distance=ship.isMounted?15.5:8.3,height=ship.isMounted?5.3:3.8;
    CAM.copy(player.position).addScaledVector(FWD,-distance);CAM.y+=height-player.pitch*(ship.isMounted?5:3.5);
    const alpha=1-Math.exp(-9.2*dt);
    camera.position.lerp(CAM,alpha);
    cameraTarget.copy(player.position).addScaledVector(FWD,4.5);cameraTarget.y+=eyeOffset+Math.sin(player.pitch)*6.5;
    camera.lookAt(cameraTarget);
  }
}
function navInfo(){
  const p=player.position,isl=world.metadata.islands;
  let nearest=isl[0],best=Infinity;
  for(const i of isl){const dd=Math.hypot(i.x-p.x,i.z-p.z);if(dd<best){best=dd;nearest=i;}}
  if(nearest.id!==lastArea){lastArea=nearest.id;$('areaJp').textContent=nearest.name;$('areaEn').textContent=nearest.subtitle;}
  const alt=Math.round(p.y-2);
  $('hudStats').textContent=(ship.isMounted?'ZEPHYR 飛行艇':'探索者')+` | ALT ${alt}m | ${quality==='high'?'HIGH':'LITE'} | ${Math.round(1/Math.max(.001,averageDelta))} FPS`;
  const beacon=ship.isMounted?null:world.closestBeacon(p,7.8);
  const dist=p.distanceTo(skiff.position);
  let text='橋を歩くか、飛行艇で自由に探索しよう。';
  if(ship.isMounted)text='WASD 飛行 / Space 上昇 / Ctrl 降下 / Shift 加速 / F 降機';
  else if(beacon)text=`[ E ] ${beacon.name} のエーテル灯を起動する`;
  else if(dist<8.5)text='[ F ] 飛行艇 ZEPHYR に乗る';
  else if(world.getUpdraft(p))text='上昇気流！ 空中へ押し上げられる';
  if(isTouch)text=text.replace('[ E ]','[ 起動 ]').replace('[ F ]','[ 乗降 ]').replace('Ctrl','降下ボタン').replace('Space','上昇ボタン').replace('F 降機','乗降ボタン');
  $('hint').textContent=text;
}
function drawMap(){
  const map=$('map'),ctx=map.getContext('2d'),W=map.width,H=map.height;
  ctx.clearRect(0,0,W,H);ctx.save();ctx.translate(W/2,H/2);
  ctx.fillStyle='rgba(22,52,74,.67)';ctx.beginPath();ctx.arc(0,0,W*.475,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='rgba(122,241,223,.20)';ctx.lineWidth=1;
  for(let r of [.2,.36,.46]){ctx.beginPath();ctx.arc(0,0,r*W,0,Math.PI*2);ctx.stroke();}
  const scale=W/290,areas=world.metadata.islands;
  const m=new Map(areas.map(i=>[i.id,i]));
  const pairs=[['dock','nexus'],['nexus','garden'],['garden','quarry'],['quarry','observatory'],['observatory','wind'],['wind','orchard'],['orchard','power'],['power','dock'],['nexus','orchard'],['nexus','wind']];
  ctx.strokeStyle='#91d3d4';ctx.lineWidth=3;
  for(const [a,b] of pairs){ctx.beginPath();ctx.moveTo(m.get(a).x*scale,m.get(a).z*scale);ctx.lineTo(m.get(b).x*scale,m.get(b).z*scale);ctx.stroke();}
  for(const i of areas){ctx.beginPath();ctx.ellipse(i.x*scale,i.z*scale,i.r*scale*.65,i.r*scale*.65,0,0,Math.PI*2);ctx.fillStyle=i.id==='observatory'?'#b4a1df':'#83b8a9';ctx.fill();
    ctx.fillStyle='#153443';ctx.font='bold 17px system-ui';ctx.textAlign='center';ctx.fillText(i.id==='observatory'?'★':i.id==='dock'?'D':'•',i.x*scale,i.z*scale+6);
  }
  for(const b of world.getBeacons()){ctx.beginPath();ctx.arc(b.x*scale,b.z*scale,6,0,Math.PI*2);ctx.fillStyle=b.active?'#ffdd91':'#5be8ed';ctx.fill();}
  const p=player.position;
  ctx.save();ctx.translate(p.x*scale,p.z*scale);ctx.rotate(player.yaw);
  ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(-8,9);ctx.lineTo(8,9);ctx.closePath();ctx.fillStyle='#ffffff';ctx.fill();ctx.strokeStyle='#183046';ctx.lineWidth=2;ctx.stroke();ctx.restore();
  ctx.restore();
}
let averageDelta=.0167;const clock=new THREE.Clock();
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);}window.addEventListener('resize',resize);
function animate(){requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),.06);elapsed+=dt;averageDelta=lerpDemo(averageDelta,dt,.07);
  if(!started){
    const a=elapsed*.028;camera.position.set(Math.sin(a)*126,81+Math.sin(a*.65)*13,Math.cos(a)*156);
    camera.lookAt(0,12,0);
  }else{
    if(ship.isMounted)simulateShip(dt);else simulateFoot(dt);
    positionCamera(dt);
  }
  world.update(dt,{playerPosition:player.position,shipPosition:skiff.position,quality});
  if(toastTimeout<elapsed&&$('toast').classList.contains('visible'))$('toast').classList.remove('visible');
  if(elapsed-lastMap>.17){lastMap=elapsed;drawMap();if(started)navInfo();}
  renderer.render(scene,camera);
  frame++;
}
resize();animate();
window.__AETHER_TEAM03__={world,player,skiff,renderer,scene,camera,setQuality,
  stats:()=>({drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,quality,beacons:world.activatedCount()})};

window.addEventListener('beforeunload',()=>{world.dispose();skiff.userData.dispose?.();avatar.userData.dispose?.();renderer.dispose();});
