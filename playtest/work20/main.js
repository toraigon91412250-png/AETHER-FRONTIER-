import * as THREE from './vendor/three.module.js';
import {createWorld,V,cityStart,shipBerth,islandOffset,vaultOffset,arena,arenaSpawn} from './world.js';
import {AetherFlightController} from './modules/flight.js';
import {createAetherModule as createPlayer} from './modules/player.js';
import {createAetherInputAdapter} from './modules/input.js';
import {createAetherModule as createPerformance} from './modules/performance.js';
import {createAetherModule as createWeapon} from './modules/weapon.js';

const $=id=>document.getElementById(id);
const ui=Object.fromEntries(['world','region','view','quality','help','chapter','objective','distance','enemy','enemyName','enemyHP','prompt','notice','flight','health','metrics','damage','cover','start','controls','reset'].map(id=>[id,$(id)]));
const touch=matchMedia('(pointer: coarse)').matches;
ui.controls.textContent=touch?'左スティックで移動。右側をスワイプで視点操作。飛行中はスティック上下で加減速、上昇・下降ボタンで高度調整。':'WASD 移動 ／ マウス 視点 ／ Shift 走る ／ Space ジャンプ ／ Q ダッシュ ／ E 調べる ／ V 視点 ／ クリック・R 攻撃。飛行中は W/S 加減速、A/D 旋回、Space/Q 上昇・下降。';
let renderer;
try {
  renderer=new THREE.WebGLRenderer({canvas:ui.world,antialias:false});
  const game=await boot(renderer);
  requestAnimationFrame(game.frame);
} catch (error) {
  ui.start.disabled=true;
  ui.start.textContent='起動できませんでした';
  const reason=error?.message||String(error);
  ui.controls.textContent=renderer
    ? `ゲームの初期化に失敗しました [AF-BOOT] ${reason}`
    : `3D描画を開始できません [AF-WEBGL]。公開URLをSafariまたはChromeで直接開いてみてください。 ${reason}`;
  console.error(error);
}

async function boot(renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.1;
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(66,1,.09,1450);
  scene.add(camera);
  const world=await createWorld(scene);
  const {exploration}=world;
  const {city,district,islands,ship,drone,dragon,vault}=world;
  const weapon=createWeapon(THREE,{quality:'low'});
  const avatar=new THREE.Group();
  const suit=new THREE.MeshStandardMaterial({color:0x172e47,roughness:.5,metalness:.35});
  const plate=new THREE.MeshStandardMaterial({color:0xb2c9ca,roughness:.36,metalness:.5});
  const visor=new THREE.MeshBasicMaterial({color:0x72efed});
  function piece(size,at,material,parent=avatar) {
    const part=new THREE.Mesh(new THREE.BoxGeometry(...size),material);
    part.position.set(...at); parent.add(part); return part;
  }
  piece([.55,.60,.29],[0,1.18,0],suit);
  piece([.59,.24,.36],[0,1.38,.025],plate);
  piece([.27,.27,.27],[0,1.68,0],plate);
  piece([.25,.09,.044],[0,1.70,-.145],visor);
  piece([.32,.41,.17],[0,1.16,.22],suit);
  piece([.19,.23,.04],[0,1.16,.32],visor);
  const legs=[-.155,.155].map(x=>{
    const joint=new THREE.Group();joint.position.set(x,.89,0);avatar.add(joint);
    piece([.20,.70,.22],[0,-.36,0],suit,joint);
    piece([.21,.13,.31],[0,-.80,-.06],plate,joint);
    return joint;
  });
  const arms=[-.35,.35].map(x=>{
    const joint=new THREE.Group();joint.position.set(x,1.39,0);avatar.add(joint);
    piece([.16,.51,.18],[0,-.25,0],suit,joint);
    piece([.17,.17,.23],[0,-.02,0],plate,joint);
    return joint;
  });
  const player=createPlayer(THREE,{camera,scene,avatar,position:cityStart,mode:'tps',yaw:-.10,sprintSpeed:11.8,moveSpeed:6.5,orbitDistance:5.6});
  const input=createAetherInputAdapter({domElement:ui.world,showTouch:touch});
  input.setEnabled(false);
  const flight=new AetherFlightController(THREE,{minAltitude:1.65,maxAltitude:160,maxSpeedByTier:[46,58,69]});
  const perf=createPerformance(THREE,{renderer,camera,quality:'lite',adaptive:true,managePixelRatio:true});
  for (const [id,part] of Object.entries({city,district,islands,ship,drone,dragon,vault,player,weapon})) {
    perf.registerClient(id,{setQuality:mode=>part.setQuality(mode==='lite'&&(id==='district'||id==='weapon')?'low':mode)});
  }
  for(const {module} of exploration.areas.values())perf.registerClient(module.id,module);
  const progressKey='aether-frontier-work20-v1';
  const defaults=()=>({unlocked:false,beacons:[],vaultCleared:false,won:false});
  let progress=defaults();
  try {
    const saved=JSON.parse(localStorage.getItem(progressKey));
    if(saved&&typeof saved==='object') {
      progress={unlocked:saved.unlocked===true,beacons:Array.isArray(saved.beacons)?saved.beacons.filter(id=>islands.metadata.beaconIds.includes(id)):[],vaultCleared:saved.vaultCleared===true,won:saved.won===true};
      for(const id of progress.beacons)islands.activateBeacon(id);
      if(saved.vault)vault.setState(saved.vault);
      if(saved.wilds)exploration.areas.get('wilds').module.instance.loadState(saved.wilds);
    }
  } catch {}
  function save() {
    try {localStorage.setItem(progressKey,JSON.stringify({...progress,vault:vault.getState(),wilds:exploration.areas.get('wilds').module.instance.getState()}));} catch {}
  }

  let playing=false,started=false,flying=false,quality='lite',attackPressed=false;
  let prevInput={},health=100,noticeUntil=0,damageUntil=0;
  let lastTime=0,time=0,walkPhase=0,fireCooldown=0,swing=0,hudTimer=0;
  let droneHP=100,bossHP=360,droneTimer=2,bossTimer=2,bossPhase='idle';
  let breathHit=false,flightCameraReady=false;
  const droneHome=V(-9,3.2,-171),bossHome=arena.clone().add(V(0,0,-4));
  const shipParking=shipBerth.clone(),playerDirection=V(),flightFocus=V(),flightEye=V();
  const bossAim=V(),beamDirection=V(0,0,1),direction=V(),point=V(),scratch=V(),landPoint=V(),playerEye=V();
  const boltGeometry=new THREE.SphereGeometry(.21,8,5);
  const boltMat=new THREE.MeshBasicMaterial({color:0x93fff3});
  const hostileMat=new THREE.MeshBasicMaterial({color:0xff7c9c});
  const bossWarning=new THREE.Mesh(new THREE.BoxGeometry(4.8,.035,47),new THREE.MeshBasicMaterial({color:0xff726f,transparent:true,opacity:.32,depthWrite:false}));
  bossWarning.visible=false;scene.add(bossWarning);
  const bolts=[];
  const wire=Array.from({length:18},()=>{
    const mesh=new THREE.Mesh(boltGeometry,boltMat);mesh.visible=false;scene.add(mesh);
    return {mesh,velocity:V(),life:0,enemy:null,hostile:false};
  });
  dragon.root.position.copy(bossHome);
  drone.root.position.copy(droneHome);
  ship.root.visible=true;
  ship.root.position.copy(shipParking);
  const labels={city:'AETHER CROWN',bridge:'CROWN TRANSIT',district:'LUMEN QUARTER',islands:'SKYWARD ARCHIPELAGO',vault:'MERIDIAN VAULT',arena:'VHALKOR / 星環闘技場',air:'AETHER AIRSPACE'};
  for(const {key,label} of exploration.areas.values())labels[key]=label;
  const travel=document.getElementById('travel');
  const destination=document.getElementById('destination');
  for(const {key,label} of exploration.areas.values())destination.add(new Option(label,key));
  travel.addEventListener('submit',event=>{
    event.preventDefault();
    if(!playing||flying||player.root.position.distanceTo(exploration.hub)>5)return;
    const area=exploration.areas.get(destination.value);
    if(!area)return;
    warp(area.spawn);travel.hidden=true;notify(area.label);
  });
  const missionNames=['飛行艇を起動する','浮遊島で共鳴碑を1基起動する','星環遺構を開く','VHALKORを撃破する','航路を確保した'];
  const mobileButtons=input.ui;
  let touchAttack=null;
  if(mobileButtons) {
    touchAttack=document.createElement('button');
    touchAttack.className='a19-btn attack';
    touchAttack.textContent='攻撃';
    touchAttack.setAttribute('aria-label','攻撃');
    mobileButtons.querySelector('.a19-buttons').append(touchAttack);
    touchAttack.addEventListener('pointerdown',event=>{event.preventDefault();attackPressed=true;});
  }
  function notify(message,seconds=3.6) {
    ui.notice.textContent=message||'';
    noticeUntil=time+seconds;
  }
  function resize(){
    const w=innerWidth,h=innerHeight;
    renderer.setSize(w,h,false);
    camera.aspect=w/h;camera.updateProjectionMatrix();
  }
  resize();
  addEventListener('resize',resize);
  function setQuality(mode) {
    quality=mode;
    perf.setQuality(mode);
    ui.quality.textContent=mode==='lite'?'軽量':'高品質';
    camera.far=mode==='lite'?1000:1450;camera.updateProjectionMatrix();
    if(playing)notify(mode==='lite'?'軽量モード':'高品質モード',1.4);
  }
  ui.quality.addEventListener('click',()=>setQuality(quality==='lite'?'high':'lite'));
  function toggleView() {
    const mode=player.getMode()==='fps'?'tps':'fps';
    player.setMode(mode);flightCameraReady=false;
    ui.view.textContent=mode.toUpperCase();
  }
  ui.view.addEventListener('click',toggleView);
  function updateButtons() {
    if(!mobileButtons)return;
    mobileButtons.hidden=!playing;
    mobileButtons.querySelector('.jump').textContent=flying?'上昇':'ジャンプ';
    mobileButtons.querySelector('.dash').textContent=flying?'下降':'ダッシュ';
    mobileButtons.querySelector('.sprint').textContent=flying?'加速':'走る';
    mobileButtons.querySelector('.action').textContent=flying?'着陸':'調べる';
    touchAttack.hidden=flying;
  }
  function pause() {
    playing=false;input.setEnabled(false);attackPressed=false;
    document.body.classList.remove('playing');
    ui.cover.hidden=false;ui.start.textContent='探索に戻る';ui.reset.hidden=false;
    document.exitPointerLock?.();updateButtons();
  }
  ui.help.addEventListener('click',pause);
  ui.start.disabled=false;ui.start.textContent='探索を開始';
  ui.start.addEventListener('click',()=>{
    playing=true;ui.cover.hidden=true;document.body.classList.add('playing');
    input.setEnabled(true);prevInput={};updateButtons();
    if(!started){started=true;warp(cityStart,-.10);notify('金色のマーカーを目指して進もう',4);}
  });
  ui.reset.addEventListener('click',()=>{
    try {localStorage.removeItem(progressKey);} catch {}
    location.reload();
  });
  ui.world.addEventListener('pointerdown',event=>{
    if(playing&&event.pointerType==='mouse'&&event.button===0&&input.locked)attackPressed=true;
  });
  addEventListener('keydown',event=>{
    if(event.code==='KeyR'&&!event.repeat&&playing)attackPressed=true;
    if(event.code==='Escape'&&playing&&!input.locked&&touch)pause();
  });
  updateButtons();
  const movement={getGroundHeight:(x,z)=>world.ground(x,z,player.root.position.y),resolveMovement:world.resolve};
  const emptyInput={};
  function warp(p,yaw=0) {
    player.teleport(p.x,p.y,p.z,yaw);
    player.update(1/120,{...movement,input:emptyInput});
  }
  warp(cityStart,-.10);
  camera.position.set(129,59,135);
  camera.lookAt(0,88,0);
  function board() {
    if(!progress.unlocked)return;
    flying=true;flightCameraReady=false;
    const {yaw}=player.getState();
    const p=ship.root.position;
    flight.reset([p.x,p.y,p.z]);flight.yaw=-yaw;
    flight.throttle=.24;
    flight.setTier(progress.vaultCleared?3:progress.beacons.length?2:1);
    player.setEnabled(false);player.root.visible=false;
    updateButtons();notify('飛行艇に乗った。E／着陸で降りる');
  }
  function landingCandidate() {
    const p=flight.position;
    const g=world.ground(p.x,p.z,p.y);
    const zone=world.zoneAt(p.x,p.z,p.y);
    if(!Number.isFinite(g)||!['city','district','islands','temple','plant','wilds'].includes(zone)||p.y-g>8.5||p.y-g<.25)return false;
    if(zone==='city'&&(Math.hypot(p.x,p.z)<26||g>10))return false;
    if(zone==='district'&&g>2)return false;
    landPoint.set(p.x,g,p.z);
    return flight.speed<18;
  }
  function land() {
    if(!landingCandidate()){notify('地面に近づき、減速してから着陸',2.5);return;}
    const yaw=-flight.yaw;
    flying=false;shipParking.copy(landPoint).y+=1.26;
    ship.root.position.copy(shipParking);ship.root.rotation.set(0,flight.yaw,0);
    player.root.visible=true;player.setEnabled(true);
    playerDirection.set(Math.sin(yaw),0,-Math.cos(yaw));
    point.copy(landPoint).addScaledVector(playerDirection,5.8);
    const g=world.ground(point.x,point.z,landPoint.y);
    if(Number.isFinite(g)&&Math.abs(g-landPoint.y)<1.2)landPoint.copy(point).y=g;
    warp(landPoint,yaw);
    updateButtons();notify('着陸した');
  }
  function returnToDock() {
    warp(world.dock);
    shipParking.copy(world.dock).add(V(-7,1.26,1));
    ship.root.position.copy(shipParking);
  }
  function currentAction(pos,zone) {
    if(flying)return null;
    const near=(p,r=4.5)=>p.distanceToSquared(pos)<r*r;
    if(zone==='city'&&near(exploration.hub,5))return {label:'探索ゲートを開く',run:()=>{travel.hidden=!travel.hidden;}};
    const area=exploration.areas.get(zone);
    if(area){
      if(near(area.spawn,4))return {label:'中央都市へ戻る',run:()=>{warp(exploration.hub);notify('中央都市');}};
      const target=area.module.nearestWorld(pos,zone==='wilds'?10:3.15);
      if(target)return {label:target.title||target.name||target.label,run:()=>{
        const result=area.module.interactWorld(pos);
        notify(result?.message||area.module.instance.getObjective?.()||result?.reason||'装置を操作した');
        if(result?.ok)save();
      }};
    }
    if(near(world.launchRelay)&&!progress.unlocked)return {label:'飛行艇を起動',run:()=>{
      progress.unlocked=true;save();notify('LUMEN KESTRELを解放した');
    }};
    if(zone==='islands'){
      localFeet.copy(pos).sub(islandOffset);
      const beacon=islands.closestBeacon(localFeet,5.7);
      if(beacon)return {label:beacon.name+'を起動',run:()=>{
        if(islands.activateBeacon(beacon.id)){progress.beacons.push(beacon.id);save();notify('共鳴碑が起動した。艇が強化され、艇庫の星環遺構へ進める');}
      }};
      if(near(world.dockRelay,5))return {label:'星環遺構へ転移',run:()=>{
        if(!progress.beacons.length){notify('浮遊島の共鳴碑を1基起動すると転移できる');return;}
        const s=vault.getSpawn();warp(point.set(s.x,s.y,s.z).add(vaultOffset));notify('MERIDIAN VAULTに到着');
      }};
    }
    if(progress.unlocked&&near(shipParking,9))return {label:'飛行艇に乗る',run:board};
    if(zone==='city'){
      const target=city.getNearbyInteraction(pos,4.3);
      if(target)return {label:target.label,run:()=>{
        const result=city.interact(target.id);
        if(result.warpTo)warp(point.copy(result.warpTo),-Math.PI/2);
        notify(result.message);
      }};
    }
    if(zone==='district'){
      const target=district.getNearestInteraction(pos,3.6);
      if(target)return {label:target.label,run:()=>notify(district.interact(target.id)?.message)};
    }
    if(zone==='vault'){
      if(near(world.vaultExit,3))return {label:'機械竜の闘技場へ転移',run:()=>{
        if(!progress.vaultCleared){notify('星環転送門を起動しよう');return;}
        health=100;warp(arenaSpawn);notify('VHALKOR出現。金色に光る胸部を狙え');
      }};
      if(near(world.vaultReturn,2.6))return {label:'艇庫へ戻る',run:returnToDock};
      camera.getWorldDirection(direction);
      playerEye.copy(pos).y+=1.1;
      let target=vault.findInteractable({origin:camera.position,direction,playerPosition:playerEye,maxPlayerDistance:4.15});
      if(!target?.available) {
        let best=3.3;
        for(const entry of vault.getInteractables()){
          if(!entry.available)continue;
          const dist=entry.position.distanceTo(playerEye);
          if(dist<best){target=entry;best=dist;}
        }
      }
      if(target?.available)return {label:target.hint||target.action||target.label,run:()=>{
        const result=vault.interact(target.id,{playerPosition:playerEye});
        if(result.type==='teleport'){
          if(result.localPosition.z< -20)progress.vaultCleared=true;
          warp(point.copy(result.position),0);
        }
        save();notify(result.message);
      }};
    }
    if(zone==='arena'&&near(world.recoveryRelay,4.5))return {label:'艇庫へ戻る',run:returnToDock};
    return null;
  }
  const localFeet=V();
  function emitBolt(origin,dir,speed,hostile,enemy=null) {
    const bolt=wire.find(b=>b.life<=0);
    if(!bolt)return;
    bolt.mesh.material=hostile?hostileMat:boltMat;
    bolt.mesh.scale.setScalar(hostile?1.5:1);
    bolt.mesh.position.copy(origin);bolt.mesh.visible=true;
    bolt.velocity.copy(dir).multiplyScalar(speed);
    bolt.life=1.55;bolt.hostile=hostile;bolt.enemy=enemy;bolts.push(bolt);
  }
  function targetPoint(enemy,out) {
    if(enemy==='boss')return dragon.anchors.core.getWorldPosition(out);
    return out.copy(drone.root.position);
  }
  function attack(zone,pos) {
    if(fireCooldown>0||flying)return;
    fireCooldown=.37;swing=.32;weapon.playAction('slash');
    camera.getWorldDirection(direction);
    point.copy(pos).y+=1.35;
    const target=zone==='arena'&&bossHP>0?'boss':zone==='district'&&droneHP>0?'drone':null;
    let locked=null;
    if(target) {
      targetPoint(target,scratch).sub(camera.position);
      const range=scratch.length();
      if(range<62&&scratch.normalize().dot(direction)>(touch?.78:.88)){
        direction.copy(targetPoint(target,scratch).sub(point).normalize());
        locked=target;
      }
    }
    emitBolt(point,direction,65,false,locked);
  }
  function hurt(damage) {
    health=Math.max(0,health-damage);
    damageUntil=time+.20;ui.damage.style.opacity='.85';
  }
  function updateBolts(dt,pos,zone) {
    for(let i=bolts.length-1;i>=0;i--){
      const b=bolts[i];b.life-=dt;
      b.mesh.position.addScaledVector(b.velocity,dt);
      if(b.hostile&&!flying&&b.mesh.position.distanceToSquared(scratch.copy(pos).add(playerEye.set(0,1,0)))<1.1){
        hurt(13);b.life=0;
      } else if(!b.hostile) {
        const target=b.enemy||(zone==='arena'?'boss':zone==='district'?'drone':null);
        if(target&&b.mesh.position.distanceToSquared(targetPoint(target,scratch))<(target==='boss'?5.6:2.25)){
          b.life=0;
          if(target==='boss'&&bossHP>0){
            bossHP=Math.max(0,bossHP-(bossPhase==='charge'?40:24));
            if(!bossHP){progress.won=true;save();dragon.setPhase('land');notify('VHALKOR撃破。空環航路を確保した',8);}
          }
          if(target==='drone'&&droneHP>0){
            droneHP=Math.max(0,droneHP-34);
            if(!droneHP)notify('防衛ドローンを停止した');
          }
        }
      }
      if(b.life<=0){b.life=0;b.mesh.visible=false;bolts.splice(i,1);}
    }
  }
  function clearBolts() {
    for(const b of bolts){b.life=0;b.mesh.visible=false;}
    bolts.length=0;
  }
  function combat(dt,zone,pos) {
    const droneActive=zone==='district'&&droneHP>0&&pos.distanceToSquared(droneHome)<48*48;
    drone.root.visible=droneActive;
    if(droneActive) {
      drone.root.position.copy(droneHome).add(point.set(Math.sin(time*.62)*5,Math.sin(time*1.35)*.6,Math.cos(time*.62)*4.3));
      drone.root.rotation.y=Math.atan2(drone.root.position.x-pos.x,drone.root.position.z-pos.z);
      drone.update(dt);
      if((droneTimer-=dt)<=0&&!flying){
        droneTimer=2.55;drone.triggerScan();
        direction.copy(pos).add(point.set(0,.9,0)).sub(drone.root.position).normalize();
        emitBolt(drone.root.position,direction,16,true);
      }
    }
    const active=zone==='arena';
    dragon.root.visible=active;
    bossWarning.visible=active&&bossHP>0&&(bossPhase==='charge'||bossPhase==='breath');
    if(active){
      if(bossHP>0&&!flying) {
        bossTimer-=dt;
        if(bossTimer<=0){
          if(bossPhase==='charge'){bossPhase='breath';bossTimer=.9;breathHit=false;}
          else if(bossPhase==='breath'){bossPhase='idle';bossTimer=2.25;}
          else {bossPhase='charge';bossTimer=1.38;notify('ブレス予告。光る帯から横へ離れろ',1.8);}
        }
        if(bossPhase==='idle'||(bossPhase==='charge'&&bossTimer>.64)){
          beamDirection.copy(pos).sub(bossHome).setY(0);
          if(beamDirection.lengthSq()>.1)beamDirection.normalize();
          dragon.root.rotation.y=Math.atan2(-beamDirection.x,-beamDirection.z);
        }
        if(bossWarning.visible) {
          bossWarning.position.copy(bossHome).addScaledVector(beamDirection,23);bossWarning.position.y=arena.y+.045;
          bossWarning.rotation.y=dragon.root.rotation.y;
          bossWarning.material.opacity=bossPhase==='breath'?.76:.28+.13*Math.sin(time*14);
        }
        if(bossPhase==='breath'&&!breathHit) {
          bossAim.copy(pos).sub(bossHome);
          const along=bossAim.dot(beamDirection);
          const side=Math.abs(bossAim.x*beamDirection.z-bossAim.z*beamDirection.x);
          if(along>0&&along<49&&side<2.5){breathHit=true;hurt(34);}
        }
        dragon.setPhase(bossPhase);
      }
      dragon.update(dt);
    }
    updateBolts(dt,pos,zone);
  }
  function updateFlight(dt,controls) {
    const oldX=flight.position.x,oldZ=flight.position.z;
    const p=flight.position;
    const updraft=islands.getUpdraft(localFeet.copy(p).sub(islandOffset));
    const data=flight.update(dt,{
      throttle:controls.moveY,yaw:THREE.MathUtils.clamp(controls.moveX+(controls.lookX||0)*8,-1,1),
      pitch:THREE.MathUtils.clamp(-(controls.lookY||0)*7,-1,1),
      lift:(controls.jump?1:0)-(controls.dash?1:0)+(updraft?.45:0),
      boost:controls.sprint,brake:controls.moveY<-.65&&flight.throttle<.09
    });
    const zone=world.zoneAt(p.x,p.z,p.y);
    const ground=world.ground(p.x,p.z,p.y);
    if(Number.isFinite(ground))p.y=Math.max(p.y,ground+1.26);
    if(zone==='city'&&Math.hypot(p.x,p.z)<23){p.x=oldX;p.z=oldZ;flight.speed*=.8;}
    ship.root.position.copy(p);ship.root.quaternion.copy(data.quaternion);
    ship.update(dt,{flight:data,...data});
    const fps=player.getMode()==='fps';
    flightEye.set(0,fps?1.10:4.1,fps?-1.35:12.5).applyQuaternion(flight.quaternion).add(p);
    flightFocus.set(0,fps?.4:1,fps?-30:-16).applyQuaternion(flight.quaternion).add(p);
    if(!flightCameraReady||fps)camera.position.copy(flightEye);
    else camera.position.lerp(flightEye,1-Math.exp(-8*dt));
    camera.lookAt(flightFocus);flightCameraReady=true;
    return p;
  }
  function currentMission(zone,pos) {
    if(progress.won)return [4,null];
    if(zone==='arena')return [3,dragon.anchors.core.getWorldPosition(bossAim)];
    if(zone==='vault'){
      if(progress.vaultCleared)return [3,world.vaultExit];
      const p=vault.getProgress();
      const entries=vault.getInteractables();
      const target=entries.find(entry=>entry.id===(!p.coreDocked?(p.coreHeld?'socket':'cell'):'gate_main'));
      return [2,p.coreDocked&&p.aligned<p.total?null:target?.position??null];
    }
    if(!progress.unlocked)return [0,world.launchRelay];
    if(!progress.beacons.length) {
      const beacon=islands.getBeacons().find(b=>b.id==='power');
      const target=zone==='islands'||flying?point.set(beacon.x,beacon.y,beacon.z).add(islandOffset):shipParking;
      return [1,target];
    }
    return [progress.vaultCleared?3:2,zone==='islands'||flying?world.dockRelay:shipParking];
  }
  let currentHint='';
  function renderHUD(zone,pos,action) {
    const [chapter,target]=currentMission(zone,pos);
    ui.region.textContent=labels[zone];
    ui.chapter.textContent='0'+(chapter+1)+' / 05';
    const v=vault.getProgress();
    ui.objective.textContent=zone==='vault'&&!progress.vaultCleared
      ?'星核と位相盤を揃える　'+v.aligned+'/'+v.total+'　'+(v.coreDocked?'星核接続済':v.coreHeld?'星核運搬中':'星核を回収')
      :missionNames[chapter];
    if(flying&&target){
      direction.copy(target).sub(pos);
      const relative=Math.atan2(direction.x,-direction.z)+flight.yaw;
      const bearing=Math.atan2(Math.sin(relative),Math.cos(relative));
      const indicator=Math.abs(bearing)>2.55?'▼':bearing<-.32?'◀':bearing>.32?'▶':'▲';
      ui.distance.textContent=indicator+' '+Math.round(direction.length())+' m  /  目標高度 '+Math.round(target.y)+' m';
    }
    else ui.distance.textContent=target?Math.round(pos.distanceTo(target))+' m':'';
    if(target&&zone!=='arena') {
      world.marker.visible=true;
      world.marker.position.copy(target);
      world.markerMesh.position.y=2.4+Math.sin(time*2.2)*.35;
      world.markerMesh.rotation.y=time*.9;
    } else world.marker.visible=false;
    const enemy=zone==='arena'&&bossHP>0?'boss':world.drone.root.visible?'drone':null;
    ui.enemy.hidden=!enemy;
    if(enemy){ui.enemyName.textContent=enemy==='boss'?'VHALKOR':'SERAPH-11 / 防衛機';ui.enemyHP.value=enemy==='boss'?bossHP/3.6:droneHP;}
    ui.health.value=health;
    ui.flight.hidden=!flying;
    if(flying)ui.flight.textContent=Math.round(flight.speed*3.6)+' km/h  ·  高度 '+Math.round(flight.position.y)+' m  ·  Tier '+flight.tier;
    const hint=flying?(landingCandidate()?'着陸可能':'Space / Q  上昇・下降'):action?.label||'';
    if(hint!==currentHint) {
      currentHint=hint;ui.prompt.hidden=!hint;
      ui.prompt.textContent=hint?(!touch&&action?'E  ·  ':'')+(touch&&hint.startsWith('Space')?'上昇・下降で高度調整':hint):'';
    }
    const m=perf.getMetrics();
    ui.metrics.textContent=m.samples>1?Math.round(m.fps)+' FPS · '+m.p95Ms.toFixed(1)+' ms P95':'';
  }
  function resetEncounter(zone) {
    clearBolts();health=100;
    if(zone==='arena'){
      if(!progress.won)bossHP=360;
      bossTimer=2;bossPhase='idle';dragon.setPhase('idle');warp(arenaSpawn);
    } else if(exploration.areas.has(zone)){
      warp(exploration.areas.get(zone).spawn);
    } else if(zone==='islands') {
      warp(world.dock);
      shipParking.copy(world.dock).y+=1.26;
    } else if(zone==='vault') {
      const s=vault.getSpawn();warp(point.set(s.x,s.y,s.z).add(vaultOffset));
    } else {
      warp(cityStart,-.10);shipParking.copy(shipBerth);
    }
    ship.root.position.copy(shipParking);
    notify('耐久を回復し、チェックポイントに戻った');
  }
  const weaponPivot=new THREE.Group();
  camera.add(weaponPivot);weaponPivot.add(weapon.root);
  let lastWeaponMode='';
  function animatePlayer(dt,state) {
    const moving=state.moving&&state.grounded;
    walkPhase+=dt*(state.sprinting?12:8);
    const stride=moving?Math.sin(walkPhase)*.48:0;
    legs[0].rotation.x=stride;legs[1].rotation.x=-stride;
    arms[0].rotation.x=-stride*.52;arms[1].rotation.x=stride*.32;
    const mode=player.getMode();
    if(mode!==lastWeaponMode) {
      lastWeaponMode=mode;
      (mode==='fps'?camera:avatar).add(weaponPivot);
      weapon.root.scale.setScalar(mode==='fps'?.25:.43);
    }
    weaponPivot.visible=!flying;
    swing=Math.max(0,swing-dt);
    if(mode==='fps'){
      weaponPivot.position.set(.46,-.37+(moving?Math.cos(walkPhase)*.019:0),-.59);
      weaponPivot.rotation.set(-.26+swing*.7,-.35-swing*2.2,-.12);
    } else {
      weaponPivot.position.set(.50,.96,-.20);
      weaponPivot.rotation.set(-.38+swing*1.9,-.31-swing*2,.22);
    }
    weapon.update(dt,{form:progress.beacons.length?'awakened':'sealed'});
  }
  let safeZone='city';
  function frame(now) {
    requestAnimationFrame(frame);
    const raw=(now-lastTime)/1000||1/60;lastTime=now;
    const dt=Math.min(raw,.045);
    const controls=input.sample();
    let pos=player.root.position;
    if(playing) {
      time+=dt;
      fireCooldown=Math.max(0,fireCooldown-dt);
      const actionEdge=controls.action&&!prevInput.action;
      if(controls.toggleView&&!prevInput.toggleView)toggleView();
      if(flying){
        pos=updateFlight(dt,controls);
        if(actionEdge){land();if(!flying)pos=player.root.position;}
      } else {
        const state=player.update(dt,{...movement,input:{...controls,toggleView:false,action:false}});
        if(actionEdge)currentAction(pos,world.zoneAt(pos.x,pos.z,pos.y))?.run();
        animatePlayer(dt,state);
      }
      prevInput=controls;
      let zone=world.zoneAt(pos.x,pos.z,pos.y);
      if(!flying&&zone!=='air')safeZone=zone;
      if(attackPressed){attack(zone,pos);attackPressed=false;}
      combat(dt,zone,pos);
      if(health<=0||(!flying&&pos.y< -9)){
        resetEncounter(safeZone);zone=world.zoneAt(pos.x,pos.z,pos.y);
      }
      if(time>noticeUntil&&ui.notice.textContent)ui.notice.textContent='';
      if(time>damageUntil&&ui.damage.style.opacity!=='0')ui.damage.style.opacity='0';
      world.updateVisibility(pos,zone,flying,quality==='high');
      if(city.root.visible)city.update(dt,{playerPosition:pos});
      if(district.root.visible)district.update(dt);
      if(islands.root.visible)islands.update(dt);
      if(vault.root.visible)vault.update(dt,{playerPosition:pos,cameraPosition:camera.position});
      if(!flying){
        ship.root.visible=shipParking.distanceToSquared(pos)<220*220;
        if(ship.root.visible)ship.update(dt,{flight:{landing:true,speed:0,throttle:0,boost:false}});
      }
      else {ship.root.visible=player.getMode()!=='fps';weaponPivot.visible=false;}
      hudTimer-=dt;
      if(hudTimer<=0){hudTimer=.10;renderHUD(zone,pos,currentAction(pos,zone));}
    } else {
      world.updateVisibility(pos,world.zoneAt(pos.x,pos.z,pos.y),flying,quality==='high');
      if(!started){city.update(dt);ship.update(dt,{flight:{landing:true,speed:0,throttle:0}});dragon.root.visible=false;drone.root.visible=false;}
    }
    if(!playing||flying||pos.distanceTo(exploration.hub)>5)travel.hidden=true;
    exploration.update(dt,pos,world.zoneAt(pos.x,pos.z,pos.y),quality);
    world.sky.position.copy(camera.position);
    if(playing||!started)perf.update(raw);
    perf.beginFrame();
    renderer.render(scene,camera);
    perf.endFrame();
  }
  // Read-only diagnostics for repeatable input and rendering checks in the browser.
  window.aetherStatus=()=>({position:(flying?flight.position:player.root.position).toArray(),flying,zone:world.zoneAt(...[player.root.position.x,player.root.position.z,player.root.position.y]),view:player.getMode(),quality,
    ...progress,beacons:[...progress.beacons],vault:vault.getProgress(),health,bossHP,droneHP,metrics:perf.getMetrics()});
  if(progress.won){bossHP=0;dragon.setPhase('land');}
  setQuality('lite');
  return {frame};
}
