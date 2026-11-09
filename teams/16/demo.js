/** Standalone combat arena host. No code in this file is required by enemyModule.js. */
import { createAetherModule } from './enemyModule.js';
import * as THREE from 'three';

const $ = (id) => document.getElementById(id);
const canvas = $('world');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x060e18);
scene.fog = new THREE.FogExp2(0x060e18,0.022);
const camera = new THREE.PerspectiveCamera(66,1,.075,250);
const renderer = new THREE.WebGLRenderer({canvas,antialias:false,alpha:false,powerPreference:'high-performance'});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.20;
renderer.setClearColor(0x060e18);
const mobile = matchMedia('(pointer: coarse)').matches;
let quality = mobile ? 'low' : 'high';
let currentDpr = 1;
function resize(){
  const w=window.innerWidth, h=window.innerHeight;
  currentDpr=quality==='low'?Math.min(devicePixelRatio||1,1.30):Math.min(devicePixelRatio||1,1.8);
  renderer.setPixelRatio(currentDpr);
  renderer.setSize(w,h,false);
  camera.aspect=w/h;camera.fov=w<h?72:66;camera.updateProjectionMatrix();
}
window.addEventListener('resize',resize,{passive:true});
scene.add(new THREE.HemisphereLight(0x9bd5ff,0x1a1c25,2.45));
const moonLight = new THREE.DirectionalLight(0x92c9ff,2.8);moonLight.position.set(-9,18,11);scene.add(moonLight);
const warmLight=new THREE.PointLight(0xff6e80,26,16);warmLight.position.set(0,5,0);scene.add(warmLight);
const blueLight=new THREE.PointLight(0x29e1ff,22,18);blueLight.position.set(9,5,-8);scene.add(blueLight);
const mat=(color,metalness=.2,roughness=.7)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
const baseMat=mat(0x0b1925,.56,.86), stoneMat=mat(0x162638,.56,.74), stoneBright=mat(0x294051,.65,.67), bronze=mat(0xb59a78,.82,.35);
const lineCyan=new THREE.MeshBasicMaterial({color:0x36e2f6,transparent:true,opacity:.72,depthWrite:false});
const lineAmber=new THREE.MeshBasicMaterial({color:0xe5ae70,transparent:true,opacity:.58,depthWrite:false});
function object(geo,material,x=0,y=0,z=0,parent=scene){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);parent.add(m);return m;}
const ground=object(new THREE.CylinderGeometry(13.8,14.2,.8,72),baseMat,0,-.49,0);
const inner=object(new THREE.CylinderGeometry(12.3,12.3,.06,72),stoneMat,0,-.045,0);
function circle(radius,tube,material,y=.025){const o=object(new THREE.TorusGeometry(radius,tube,5,96),material,0,y,0);o.rotation.x=Math.PI/2;return o;}
circle(12.2,.052,bronze,.018);circle(11.85,.024,lineCyan,.027);circle(9.7,.025,lineAmber,.029);
circle(6.7,.031,lineCyan,.028);circle(4.6,.016,lineAmber,.026);
function strip(a,b,width,material,y=.045){
 const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
 const o=object(new THREE.BoxGeometry(width,.028,len),material,(a[0]+b[0])/2,y,(a[1]+b[1])/2);
 o.rotation.y=Math.atan2(-dx,-dz);return o;
}
for(let i=0;i<32;i++){
 const a=i*Math.PI/16;
 const x1=Math.cos(a)*10.3,z1=Math.sin(a)*10.3;
 const x2=Math.cos(a)*11.35,z2=Math.sin(a)*11.35;
 strip([x1,z1],[x2,z2],i%4===0?.13:.05,i%4===0?lineCyan:lineAmber,.032);
}
for(let i=0;i<12;i++){
 const a=i*Math.PI/6, r=7.95;
 const x=Math.sin(a)*r,z=Math.cos(a)*r;
 const glyph=new THREE.Group();scene.add(glyph);glyph.position.set(x,.038,z);glyph.rotation.y=-a;
 strip([x-.28,z],[x+.28,z],.035,lineCyan,.046);
 object(new THREE.OctahedronGeometry(.19,0),lineAmber,x,.07,z).scale.set(1,.13,1);
}
// Ruined ceremonial pylons outside playable arena.
const pylons=[];
for(let i=0;i<12;i++){
 const a=i*Math.PI/6+.11,r=15.75;
 const group=new THREE.Group();scene.add(group);group.position.set(Math.sin(a)*r,0,Math.cos(a)*r);group.rotation.y=a;
 const h=i%3===0?9:6.8+(i%4)*.45;
 object(new THREE.CylinderGeometry(.78,1.1,.6,6),baseMat,0,0,0,group);
 const column=object(new THREE.CylinderGeometry(.50,.68,h,6),stoneMat,0,h/2,0,group);column.rotation.y=.52;
 object(new THREE.CylinderGeometry(.63,.50,.26,6),bronze,0,h,0,group);
 const crystals=object(new THREE.OctahedronGeometry(.40,0),lineCyan,0,h+.46,0,group);crystals.scale.set(.62,1.55,.62);
 for(const sx of [-1,1]) object(new THREE.BoxGeometry(.10,h*.61,.12),lineAmber,sx*.38,h*.58,-.35,group);
 pylons.push(group);
}
// Horizon towers, all simple instanced geometry.
const towers=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),stoneMat,90);
const dummy=new THREE.Object3D();
for(let i=0;i<90;i++){
 const a=i*.721+(i%4)*.13,r=27+(i%13)*1.45,h=3+(i*7%12)*1.8;
 dummy.position.set(Math.sin(a)*r,h/2-1.2,Math.cos(a)*r);
 dummy.scale.set(1.2+(i%4)*.45,h,1.5+(i%6)*.28);dummy.rotation.set(0,a,0);dummy.updateMatrix();towers.setMatrixAt(i,dummy.matrix);
}scene.add(towers);
// Atmospheric particle field.
const starPositions=new Float32Array(165*3);
for(let i=0;i<165;i++){const a=i*2.399,r=16+(i%14)*2.4;starPositions[i*3]=Math.sin(a)*r;starPositions[i*3+1]=3+(i*17%120)*.22;starPositions[i*3+2]=Math.cos(a)*r;}
const starGeo=new THREE.BufferGeometry();starGeo.setAttribute('position',new THREE.BufferAttribute(starPositions,3));
const stars=new THREE.Points(starGeo,new THREE.PointsMaterial({color:0x8fd7f0,size:.085,transparent:true,opacity:.48,sizeAttenuation:true}));scene.add(stars);
// Arena's subtle void-haze beneath the surface.
const cloudPlane=object(new THREE.PlaneGeometry(180,180),new THREE.MeshBasicMaterial({color:0x06111b,transparent:true,opacity:.23,depthWrite:false}),0,-1.2,0);cloudPlane.rotation.x=-Math.PI/2;

const enemy=createAetherModule(THREE,{position:{x:0,y:0,z:-.2},quality,onEvent:handleEnemyEvent});
scene.add(enemy.root);
const playerRoot=new THREE.Group();scene.add(playerRoot);
const playerRig=new THREE.Group();playerRoot.add(playerRig);
const pilotDark=mat(0x182c3d,.67,.37),pilotBright=mat(0x426078,.66,.33),pilotGold=mat(0xe4b780,.72,.36);
const pilotGlow=new THREE.MeshBasicMaterial({color:0x4deaff});
object(new THREE.CylinderGeometry(.30,.37,.84,9),pilotDark,0,1.08,0,playerRig);
object(new THREE.BoxGeometry(.58,.39,.35),pilotBright,0,1.39,-.04,playerRig);
object(new THREE.SphereGeometry(.34,14,10),pilotDark,0,1.78,0,playerRig);
object(new THREE.BoxGeometry(.54,.16,.20),pilotGlow,0,1.78,-.25,playerRig);
object(new THREE.BoxGeometry(.20,.07,.10),pilotGold,0,1.56,-.32,playerRig);
const playerLegs=[],playerArms=[];
for(const s of [-1,1]){
 const l=new THREE.Group();l.position.set(s*.20,.80,0);playerRig.add(l);playerLegs.push(l);
 object(new THREE.CylinderGeometry(.13,.15,.77,8),pilotDark,0,-.38,0,l);
 object(new THREE.BoxGeometry(.31,.18,.52),pilotBright,0,-.77,-.10,l);
 const a=new THREE.Group();a.position.set(s*.44,1.41,-.02);playerRig.add(a);playerArms.push(a);
 object(new THREE.CylinderGeometry(.14,.15,.7,8),pilotBright,0,-.31,0,a);
 object(new THREE.BoxGeometry(.29,.17,.31),pilotDark,0,-.65,-.06,a);
}
const swordHand = new THREE.Group();playerArms[1].add(swordHand);swordHand.position.set(.04,-.64,-.09);
object(new THREE.CylinderGeometry(.09,.10,.42,8),pilotGold,0,-.13,-.16,swordHand);
object(new THREE.BoxGeometry(.40,.07,.24),pilotDark,0,-.32,-.17,swordHand);
const sword=object(new THREE.OctahedronGeometry(.28,0),pilotGlow,0,-.96,-.23,swordHand);sword.scale.set(.57,3.4,.28);
object(new THREE.BoxGeometry(.06,1.08,.06),pilotGold,0,-1.05,-.25,swordHand);
// Readable cyan attack arcs, timed to the player's damage frames.
const slashMaterial=new THREE.MeshBasicMaterial({color:0x7ef1ff,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide});
const slashArc=object(new THREE.TorusGeometry(1.22,.085,5,32,2.35),slashMaterial,0,1.25,-1.35,playerRig);
slashArc.visible=false;
const slashInner=object(new THREE.TorusGeometry(1.05,.028,4,32,2.35),slashMaterial,0,1.25,-1.4,playerRig);
slashInner.visible=false;
// Fake character shadow is much cheaper than world shadow maps.
const shadow=object(new THREE.CircleGeometry(.65,24),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.36,depthWrite:false}),0,.022,0);
shadow.rotation.x=-Math.PI/2;
// Reusable hit-shard VFX pool, no mid-combat geometry allocation.
const debris=[];
const glowShard=new THREE.MeshBasicMaterial({color:0x62e9ff,transparent:true,opacity:1,depthWrite:false});
const redShard=new THREE.MeshBasicMaterial({color:0xff9475,transparent:true,opacity:1,depthWrite:false});
for(let i=0;i<24;i++){
 const node=object(new THREE.OctahedronGeometry(.085,0),i%3?glowShard:redShard);node.visible=false;
 debris.push({node,t:0,v:new THREE.Vector3()});
}
let debrisIdx=0;
function sparks(position,color=false,count=10){
 for(let i=0;i<count;i++){
   const d=debris[(debrisIdx++)%debris.length];
   d.node.visible=true;d.node.position.copy(position);
   const theta=Math.random()*Math.PI*2,vy=Math.random()*3.9;
   d.v.set(Math.cos(theta)*(2+Math.random()*3.5),vy+.3,Math.sin(theta)*(2+Math.random()*3.5));
   d.t=.45+Math.random()*.34; d.node.scale.setScalar(.45+Math.random()*.95);
 }
}
// UI and game rules.
const startModal=$('startModal'), endModal=$('endModal'), mainHud=$('hud'), msg=$('message'), floating=$('floating');
const bossBar=$('bossBar'),playerBar=$('playerBar'), postureBar=$('postureBar'),dodgeBar=$('dodgeBar');
const playerHealth=$('playerHealth'), bossHealth=$('bossHealth'),postureLabel=$('postureLabel');
const bossPhase=$('bossPhase'),qualityBtn=$('qualityBtn'),fpsLabel=$('fpsLabel'),viewBtn=$('viewBtn');
const announce=$('announce'), announceTitle=$('announceTitle'),announceSub=$('announceSub');
let gameState='intro', playerHP=180, playerMaxHP=180, invulnerable=0, hurtTint=0;
let characterYaw=Math.PI, cameraYaw=0, cameraPitch=.22, viewpoint='TPS';
let dodgeTime=0,dodgeCooldown=0,dodgeDirection=new THREE.Vector3();
let jumpVel=0,airHeight=0;
let attackTime=0,attackMode='',attackCooldown=0,attackHit=false;
let hitCombo=0, comboTimer=0,winTime=0;
let floatFrames=0,perfElapsed=0;
let memo='';
const keys=new Set();
const pad={x:0,y:0,active:false};
function say(text,kind='normal',duration=1.55){
 msg.textContent=text;msg.dataset.kind=kind;msg.style.opacity='1';msg.dataset.remaining=String(duration);
}
function alertAttack(type){
 const data={cleave:['斬撃予兆','横へ回避'],pulse:['衝撃波予兆','ジャンプ or 範囲外へ'],ray:['直線レーザー予兆','横へ移動して回避']}[type];
 if(!data)return;
 announceTitle.textContent=data[0];announceSub.textContent=data[1];
 announce.dataset.type=type;announce.classList.add('active');
}
function hideAttack(){announce.classList.remove('active');}
function popDamage(text,position,kind='normal'){
 const target=new THREE.Vector3(position.x,position.y,position.z).project(camera);
 if(target.z< -1 || target.z>1)return;
 const e=document.createElement('span');e.className='hit-text '+kind;e.textContent=text;
 e.style.left=((target.x*.5+.5)*100)+'%';e.style.top=((-target.y*.5+.5)*100)+'%';
 floating.appendChild(e);setTimeout(()=>e.remove(),800);
}
function handleEnemyEvent(event){
 if(gameState!=='playing')return;
 if(event.type==='telegraph')alertAttack(event.attack);
 if(event.type==='attackImpact'){
   hideAttack();
   if(event.blocked)say('回避成功  /  PERFECT', 'good',.75);
   if(event.attack==='pulse')sparks(new THREE.Vector3(enemy.root.position.x,1,enemy.root.position.z),true,14);
 }
 if(event.type==='playerHit'){
   if(invulnerable>0)return;
   playerHP=Math.max(0,playerHP-event.damage);
   invulnerable=.55;hurtTint=.35;hitCombo=0;
   const direction=event.direction;
   const l=Math.hypot(direction.x,direction.z)||1;
   playerRoot.position.x+=direction.x/l*Math.min(event.knockback,1.1);
   playerRoot.position.z+=direction.z/l*Math.min(event.knockback,1.1);
   popDamage('-'+event.damage,{x:playerRoot.position.x,y:2.7,z:playerRoot.position.z},'bad');
   say('被弾  /  回避で攻撃を抜けろ','bad',.9);
   if(playerHP<=0)finish(false);
 }
 if(event.type==='phaseChanged'){
   hideAttack();say('第2形態  /  OVERDRIVE','warning',2.3);
   bossPhase.textContent='PHASE 02  /  OVERDRIVE';bossPhase.classList.add('danger');
   sparks(new THREE.Vector3(enemy.root.position.x,3,enemy.root.position.z),true,24);
 }
 if(event.type==='enemyStaggered')say('体勢崩壊！  /  今が攻撃のチャンス','good',1.7);
 if(event.type==='enemyDefeated'){hideAttack();finish(true);}
}
function finish(victory){
 if(gameState!=='playing')return;
 gameState=victory?'win':'lose';winTime=0;
 endModal.classList.remove('hidden');
 $('endOverline').textContent=victory?'ENCOUNTER COMPLETE':'SIGNAL LOST';
 $('endTitle').textContent=victory?'AEGIS-IX 破壊成功':'戦闘不能';
 $('endDescription').textContent=victory?'戦術解析完了。攻撃予兆を見極め、守護機を突破した。':'攻撃範囲の赤い予告が消える瞬間を狙って回避してみよう。';
}
function startGame(){
 enemy.reset({position:{x:0,y:0,z:-.2}});
 playerRoot.position.set(0,0,8);
 playerRoot.rotation.set(0,0,0);characterYaw=Math.PI;cameraYaw=0;cameraPitch=.22;
 playerHP=playerMaxHP;invulnerable=0;hurtTint=0;dodgeTime=0;dodgeCooldown=0;jumpVel=0;airHeight=0;
 attackTime=0;attackMode='';attackCooldown=0;hitCombo=0;comboTimer=0;
 bossPhase.textContent='PHASE 01 / SENTINEL';bossPhase.classList.remove('danger');
 gameState='playing';startModal.classList.add('hidden');endModal.classList.add('hidden');hideAttack();
 say('赤い攻撃予兆を見て回避。攻撃後の隙を狙え！','good',2.6);
}
$('startBtn').addEventListener('click',startGame);
$('retryBtn').addEventListener('click',startGame);
$('restartBtn').addEventListener('click',startGame);
function changeQuality(){quality=quality==='low'?'high':'low';enemy.setQuality(quality);
  stars.visible=quality==='high';cloudPlane.visible=quality==='high';
  warmLight.intensity=quality==='high'?26:15;blueLight.intensity=quality==='high'?22:9;
  qualityBtn.textContent=quality==='high'?'画質: HIGH':'画質: LOW';resize();
}
qualityBtn.addEventListener('click',changeQuality);
qualityBtn.textContent=quality==='high'?'画質: HIGH':'画質: LOW';
function switchView(){viewpoint=viewpoint==='TPS'?'FPS':'TPS';viewBtn.textContent='視点: '+viewpoint;}
viewBtn.addEventListener('click',switchView);
function dodge(){
 if(gameState!=='playing'||dodgeCooldown>0||dodgeTime>0)return;
 dodgeTime=.28;dodgeCooldown=1.05;invulnerable=Math.max(invulnerable,.37);
 const input=getMove();
 if(Math.hypot(input.x,input.y)>.08){
   dodgeDirection.set(Math.cos(cameraYaw)*input.x-Math.sin(cameraYaw)*input.y,0,-Math.sin(cameraYaw)*input.x-Math.cos(cameraYaw)*input.y).normalize();
 }else{dodgeDirection.set(Math.cos(cameraYaw),0,-Math.sin(cameraYaw));}
 say('DASH  /  回避','good',.48);
}
function jump(){if(gameState!=='playing'||airHeight>.03)return;jumpVel=7.4;}
function doAttack(mode){
 if(gameState!=='playing'||attackCooldown>0||dodgeTime>0)return;
 attackMode=mode;attackTime=mode==='heavy'?.49:.31;
 attackCooldown=mode==='heavy'?.87:.36;attackHit=false;
}
function performAttackHit(){
 if(attackHit||!attackMode)return;
 attackHit=true;
 const ex=enemy.root.position.x,ez=enemy.root.position.z;
 const dist=Math.hypot(playerRoot.position.x-ex,playerRoot.position.z-ez);
 const range=attackMode==='heavy'?3.55:3.20;
 if(dist>range){say('射程外  /  もう少し近づこう','normal',.6);return;}
 const result=enemy.receiveHit({damage:attackMode==='heavy'?38:17,stagger:attackMode==='heavy'?45:21,position:playerRoot.position});
 if(!result.accepted)return;
 hitCombo+=1;comboTimer=2;
 popDamage(Math.ceil(result.damage),{x:ex+(Math.random()-.5)*.8,y:2.85+(Math.random()-.5)*.6,z:ez-.7},result.weakness?'crit':'normal');
 sparks(new THREE.Vector3(ex,2.7,ez-.68),false,attackMode==='heavy'?15:8);
 if(result.weakness)say('WEAK POINT  /  ダメージ 1.55×','good',.8);
 if(attackMode==='heavy')playerRoot.position.z+=Math.cos(characterYaw)*-.08;
}
function getMove(){
 let x=0,y=0;
 if(keys.has('KeyA')||keys.has('ArrowLeft'))x-=1;
 if(keys.has('KeyD')||keys.has('ArrowRight'))x+=1;
 if(keys.has('KeyW')||keys.has('ArrowUp'))y+=1;
 if(keys.has('KeyS')||keys.has('ArrowDown'))y-=1;
 x+=pad.x;y+=pad.y;
 const l=Math.hypot(x,y);
 return l>1?{x:x/l,y:y/l}:{x,y};
}
window.addEventListener('keydown',(e)=>{
 if(['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();
 if(e.repeat)return;
 keys.add(e.code);
 if(e.code==='KeyJ'||e.code==='KeyF')doAttack('quick');
 if(e.code==='KeyK'||e.code==='KeyE')doAttack('heavy');
 if(e.code==='Space'||e.code==='ShiftLeft'||e.code==='ShiftRight')dodge();
 if(e.code==='KeyQ')jump();
 if(e.code==='KeyC')switchView();
 if(e.code==='KeyR'&&gameState!=='intro')startGame();
 if(e.code==='Enter'&&gameState!=='playing')startGame();
});
window.addEventListener('keyup',(e)=>keys.delete(e.code));
window.addEventListener('blur',()=>{keys.clear();pad.active=false;pad.x=pad.y=0;});
$('quickBtn').addEventListener('pointerdown',(e)=>{e.preventDefault();doAttack('quick');});
$('heavyBtn').addEventListener('pointerdown',(e)=>{e.preventDefault();doAttack('heavy');});
$('dashBtn').addEventListener('pointerdown',(e)=>{e.preventDefault();dodge();});
$('jumpBtn').addEventListener('pointerdown',(e)=>{e.preventDefault();jump();});
const joystick=$('joystick'),joystickThumb=$('joystickThumb');
let joyId=null;
function joyInput(e){
 const b=joystick.getBoundingClientRect(),cx=b.left+b.width/2,cy=b.top+b.height/2;
 const dx=e.clientX-cx,dy=e.clientY-cy,max=b.width*.28,len=Math.hypot(dx,dy);
 pad.x=THREE.MathUtils.clamp(dx/max,-1,1);pad.y=THREE.MathUtils.clamp(-dy/max,-1,1);
 if(len>max){pad.x=dx/len;pad.y=-dy/len;}
 joystickThumb.style.transform=`translate(${pad.x*max}px,${-pad.y*max}px)`;
}
joystick.addEventListener('pointerdown',e=>{e.preventDefault();joyId=e.pointerId;pad.active=true;joystick.setPointerCapture(joyId);joyInput(e);});
joystick.addEventListener('pointermove',e=>{if(e.pointerId===joyId)joyInput(e);});
function resetJoy(e){if(e.pointerId!==joyId)return;joyId=null;pad.active=false;pad.x=pad.y=0;joystickThumb.style.transform='translate(0,0)';}
joystick.addEventListener('pointerup',resetJoy);joystick.addEventListener('pointercancel',resetJoy);
let lookPointer=null,lastX=0,lastY=0,dragged=false;
canvas.addEventListener('pointerdown',e=>{
 if(gameState!=='playing')return;
 if(e.pointerType==='mouse'&&e.button===0){doAttack('quick');return;}
 lookPointer=e.pointerId;lastX=e.clientX;lastY=e.clientY;dragged=false;canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove',e=>{
 if(e.pointerId!==lookPointer)return;
 const dx=e.clientX-lastX,dy=e.clientY-lastY;
 if(Math.abs(dx)+Math.abs(dy)>2)dragged=true;
 cameraYaw-=dx*.006;cameraPitch=THREE.MathUtils.clamp(cameraPitch+dy*.004,-.15,.65);
 lastX=e.clientX;lastY=e.clientY;
});
canvas.addEventListener('pointerup',e=>{if(e.pointerId===lookPointer){lookPointer=null;}});
canvas.addEventListener('pointercancel',()=>lookPointer=null);
canvas.addEventListener('contextmenu',e=>e.preventDefault());
const camTarget=new THREE.Vector3(),camGoal=new THREE.Vector3(),camLook=new THREE.Vector3();
function smoothAngle(v,to,k){const d=Math.atan2(Math.sin(to-v),Math.cos(to-v));return v+d*Math.min(k,1);}
function updatePlayer(dt,t){
 if(gameState!=='playing')return;
 invulnerable=Math.max(0,invulnerable-dt);hurtTint=Math.max(0,hurtTint-dt);
 dodgeCooldown=Math.max(0,dodgeCooldown-dt);attackCooldown=Math.max(0,attackCooldown-dt);
 if(comboTimer>0)comboTimer-=dt;else hitCombo=0;
 const move=getMove();const moving=Math.hypot(move.x,move.y)>.1;
 let dx=Math.cos(cameraYaw)*move.x-Math.sin(cameraYaw)*move.y;
 let dz=-Math.sin(cameraYaw)*move.x-Math.cos(cameraYaw)*move.y;
 const ml=Math.hypot(dx,dz);
 if(ml>1){dx/=ml;dz/=ml;}
 if(dodgeTime>0){
    dodgeTime=Math.max(0,dodgeTime-dt);
    playerRoot.position.addScaledVector(dodgeDirection,dt*15.8);
 }else{
    const slow=attackTime>0?.48:1;
    const speed=keys.has('ControlLeft')?3.4:5.75;
    playerRoot.position.x+=dx*speed*slow*dt;
    playerRoot.position.z+=dz*speed*slow*dt;
 }
 const rr=Math.hypot(playerRoot.position.x,playerRoot.position.z);
 if(rr>11.55){playerRoot.position.x*=11.55/rr;playerRoot.position.z*=11.55/rr;}
 const epos=enemy.root.position;const d=Math.hypot(playerRoot.position.x-epos.x,playerRoot.position.z-epos.z);
 if(d<1.34){const dd=Math.max(d,.001);playerRoot.position.x=epos.x+(playerRoot.position.x-epos.x)/dd*1.34;
 playerRoot.position.z=epos.z+(playerRoot.position.z-epos.z)/dd*1.34;}
 if(airHeight>0||jumpVel>0){
   jumpVel-=18.5*dt;airHeight=Math.max(0,airHeight+jumpVel*dt);
   if(airHeight===0)jumpVel=0;
 }
 if(moving&&dodgeTime===0){
   const facingMove=Math.atan2(-dx,-dz);
   characterYaw=smoothAngle(characterYaw,facingMove,dt*11);
 }
 if(attackTime>0){
    attackTime=Math.max(0,attackTime-dt);
    const faceEnemy=Math.atan2(-(epos.x-playerRoot.position.x),-(epos.z-playerRoot.position.z));
    characterYaw=smoothAngle(characterYaw,faceEnemy,dt*25);
    const timeline=attackMode==='heavy'?.49:.31;
    const progress=1-attackTime/timeline;
    if(progress> (attackMode==='heavy'?.45:.34))performAttackHit();
    slashArc.visible=slashInner.visible=true;
    slashArc.rotation.z=-.7+progress*2.2;
    slashInner.rotation.z=slashArc.rotation.z;
    const slashScale=attackMode==='heavy'?1.25:1;
    slashArc.scale.setScalar(slashScale);
    slashInner.scale.setScalar(slashScale);
    slashMaterial.opacity=Math.max(0,Math.sin(progress*Math.PI))*(attackMode==='heavy'?.92:.7);
    if(attackTime===0){attackMode='';attackHit=false;}
 }else{slashArc.visible=slashInner.visible=false;}
 playerRoot.rotation.y=characterYaw;
 playerRig.position.y=airHeight+(moving&&dodgeTime===0?Math.sin(t*12)*.035:Math.sin(t*2.8)*.026);
 playerRig.rotation.z=dodgeTime>0?Math.sin((.28-dodgeTime)/.28*Math.PI)*-.30:0;
 playerLegs[0].rotation.x=moving?Math.sin(t*12)*.46:0;
 playerLegs[1].rotation.x=moving?-Math.sin(t*12)*.46:0;
 playerArms[0].rotation.x=moving?Math.sin(t*12)*.2:0;
 playerArms[1].rotation.x=attackTime>0?-1.3+(attackTime/(attackMode==='heavy'?.49:.31))*2.5:0;
 swordHand.rotation.z=attackTime>0?Math.sin((1-attackTime/(attackMode==='heavy'?.49:.31))*Math.PI)*1.45:0;
 playerRig.visible=!(invulnerable>0&&Math.sin(t*45)>.8);
 shadow.position.set(playerRoot.position.x,.025,playerRoot.position.z);
 shadow.material.opacity=THREE.MathUtils.clamp(.28-airHeight*.055,.08,.28);
 shadow.scale.setScalar(1+airHeight*.11);
}
function updateCamera(dt){
 const p=playerRoot.position;
 if(viewpoint==='FPS'){
   const toEnemy=new THREE.Vector3(-Math.sin(characterYaw),0,-Math.cos(characterYaw));
   camGoal.set(p.x,1.69+airHeight,p.z).addScaledVector(toEnemy,.1);
   camLook.copy(camGoal).addScaledVector(new THREE.Vector3(-Math.sin(cameraYaw),cameraPitch*.6,-Math.cos(cameraYaw)),5);
   playerRig.visible=false;
 }else{
   const behind=6.9;
   camGoal.set(p.x+Math.sin(cameraYaw)*behind*Math.cos(cameraPitch),3.5+airHeight+Math.sin(cameraPitch)*5.5,p.z+Math.cos(cameraYaw)*behind*Math.cos(cameraPitch));
   camLook.set(p.x,1.55+airHeight,p.z);
 }
 camera.position.lerp(camGoal,Math.min(1,dt*10));
 camTarget.lerp(camLook,Math.min(1,dt*14));camera.lookAt(camTarget);
}
function updateUI(dt){
 const s=enemy.snapshot();
 playerBar.style.width=(playerHP/playerMaxHP*100).toFixed(2)+'%';
 bossBar.style.width=(s.hpRatio*100).toFixed(2)+'%';
 postureBar.style.width=s.poise.toFixed(1)+'%';
 dodgeBar.style.width=(100-THREE.MathUtils.clamp(dodgeCooldown/1.05,0,1)*100).toFixed(1)+'%';
 playerHealth.textContent=`${Math.ceil(playerHP)} / ${playerMaxHP}`;
 bossHealth.textContent=`${Math.ceil(s.hp)} / ${Math.ceil(s.maxHP)}`;
 postureLabel.textContent=s.state==='stagger'?'BREAK':Math.floor(s.poise)+' / 100';
 $('dashBtn').classList.toggle('cooling',dodgeCooldown>0);
 $('heavyBtn').classList.toggle('cooling',attackCooldown>.5);
 const duration=parseFloat(msg.dataset.remaining||'0')-dt;
 msg.dataset.remaining=duration;msg.style.opacity=duration>0?1:0;
 announce.style.setProperty('--attack-progress',Math.floor(s.attackProgress*100)+'%');
 if(s.state!=='telegraph')hideAttack();
 $('screenFlash').style.opacity=(hurtTint/.35*.23).toFixed(3);
}
function updateParticles(dt){for(const d of debris){if(d.t<=0)continue;d.t-=dt;if(d.t<=0){d.node.visible=false;continue;}d.node.position.addScaledVector(d.v,dt);d.v.y-=10*dt;d.node.rotation.x+=dt*7;d.node.rotation.y+=dt*8;d.node.scale.multiplyScalar(1-dt*.8);}}
let last=performance.now(),clock=0;
function frame(now){
 requestAnimationFrame(frame);
 const dt=Math.min((now-last)/1000,.05);last=now;clock+=dt;
 updatePlayer(dt,clock);
 if(gameState==='playing')enemy.update(dt,{player:{position:{x:playerRoot.position.x,y:airHeight,z:playerRoot.position.z},radius:.42,height:airHeight,invulnerable:invulnerable>0}});
 else enemy.update(dt,{});
 updateCamera(dt);
 updateParticles(dt);updateUI(dt);
 stars.rotation.y=clock*.005;
 renderer.render(scene,camera);
 floatFrames++;perfElapsed+=dt;
 if(perfElapsed>1.1){fpsLabel.textContent=`${Math.round(floatFrames/perfElapsed)} FPS`;floatFrames=0;perfElapsed=0;}
}
// Ready state and render loop.
resize();playerRoot.position.set(0,0,8);
camera.position.set(0,4.0,15);camera.lookAt(0,2.0,0);
if(mobile){$('mobileControls').classList.add('shown');$('desktopHelp').classList.add('hidden');}
if(quality==='low'){stars.visible=false;cloudPlane.visible=false;warmLight.intensity=15;blueLight.intensity=9;}
requestAnimationFrame(frame);
