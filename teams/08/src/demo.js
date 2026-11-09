/** Standalone playable AETHER FRONTIER No.08 proving ground. */
export function launchDemo(THREE, createAetherModule, AetherFlightController) {
  'use strict';
  const $ = id => document.getElementById(id);
  const clamp=THREE.MathUtils.clamp;
  const mount=$('scene');
  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0x09172b);
  scene.fog=new THREE.FogExp2(0x2a506e,.0024);
  const camera=new THREE.PerspectiveCamera(67,1,.1,970);
  const isTouch=window.matchMedia('(pointer: coarse)').matches;
  const renderer=new THREE.WebGLRenderer({antialias:!isTouch,alpha:false,powerPreference:'high-performance'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.15;
  renderer.setClearColor(0x071222,1);
  renderer.shadowMap.enabled=false;
  mount.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-label','LUMEN KESTREL flight simulator 3D scene');
  const hemisphere=new THREE.HemisphereLight(0xbce7ff,0x243147,2.05);scene.add(hemisphere);
  const sunlight=new THREE.DirectionalLight(0xffe4b3,2.12);sunlight.position.set(-120,170,-230);scene.add(sunlight);
  const rimlight=new THREE.DirectionalLight(0x5c9de5,.7);rimlight.position.set(120,80,190);scene.add(rimlight);
  // Procedural atmospheric sky. Does not use textures or external models.
  const sky=new THREE.Mesh(
    new THREE.SphereGeometry(870,24,16),
    new THREE.ShaderMaterial({
      side:THREE.BackSide,depthWrite:false,fog:false,
      uniforms:{top:{value:new THREE.Color(0x071a37)},middle:{value:new THREE.Color(0x29729a)},bottom:{value:new THREE.Color(0xe3a976)}},
      vertexShader:'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader:'uniform vec3 top;uniform vec3 middle;uniform vec3 bottom;varying vec3 vP;void main(){float h=normalize(vP).y;vec3 col=mix(bottom,middle,smoothstep(-.45,.08,h));col=mix(col,top,smoothstep(.03,.82,h));gl_FragColor=vec4(col,1.);}'
    })
  );sky.frustumCulled=false;scene.add(sky);
  // Ground cloud layer serves as a depth cue when climbing above it.
  const cloudGeo=new THREE.SphereGeometry(1,8,5);
  const cloudMat=new THREE.MeshBasicMaterial({color:0x9cc9db,transparent:true,opacity:.19,depthWrite:false,fog:true});
  const cloudCount=isTouch?90:145;
  const clouds=new THREE.InstancedMesh(cloudGeo,cloudMat,cloudCount);
  clouds.frustumCulled=false;
  const cloudDummy=new THREE.Object3D();
  const rand=(s)=>{let v=Math.sin(s*127.1+31.22)*43758.5453;return v-Math.floor(v);};
  for(let i=0;i<cloudCount;i++){
    const x=(rand(i+9)-.5)*750;
    const z=50-rand(i+83)*680;
    cloudDummy.position.set(x,1.5+(rand(i+71)-.5)*15,z);
    cloudDummy.scale.set(13+rand(i+3)*31,1.3+rand(i+35)*5,8+rand(i+44)*19);
    cloudDummy.rotation.set(0,rand(i+10)*Math.PI,0);
    cloudDummy.updateMatrix();clouds.setMatrixAt(i,cloudDummy.matrix);
  }
  clouds.instanceMatrix.needsUpdate=true;scene.add(clouds);
  // A faint cloud ocean under the island field.
  const sea=new THREE.Mesh(new THREE.PlaneGeometry(1400,1400),new THREE.MeshBasicMaterial({color:0x396784,transparent:true,opacity:.18,depthWrite:false}));
  sea.rotation.x=-Math.PI/2;sea.position.set(0,-19,-245);scene.add(sea);
  const worldHigh=new THREE.Group();worldHigh.name='decorative_world_high';scene.add(worldHigh);
  const world=new THREE.Group();world.name='floating_island_world';scene.add(world);
  const rockMats=[0x405368,0x4f6575,0x3c5260,0x576677].map(c=>new THREE.MeshStandardMaterial({color:c,roughness:1,flatShading:true}));
  const topMat=new THREE.MeshStandardMaterial({color:0x668c78,roughness:1,flatShading:true});
  const rimMat=new THREE.MeshStandardMaterial({color:0xa5ad8b,metalness:.16,roughness:.83});
  const ancientMat=new THREE.MeshStandardMaterial({color:0xa6b3a5,metalness:.17,roughness:.75});
  const goldMat=new THREE.MeshStandardMaterial({color:0xf0c384,metalness:.58,roughness:.36});
  const crystalMat=new THREE.MeshStandardMaterial({color:0x6acbd6,emissive:0x2c98b9,emissiveIntensity:.65,metalness:.25,roughness:.28,flatShading:true});
  const templeMat=new THREE.MeshStandardMaterial({color:0x2e4557,metalness:.45,roughness:.58});
  const islandGeo=new THREE.CylinderGeometry(1,.24,.82,7,1);
  const islandTopGeo=new THREE.CylinderGeometry(1,1,.11,9);
  const crystalGeo=new THREE.ConeGeometry(1,2,5);
  const shardGeo=new THREE.OctahedronGeometry(1,0);
  const columnGeo=new THREE.CylinderGeometry(.48,.58,1,6);
  const isles=[];
  function makeIsland(x,y,z,r,seed){
    const g=new THREE.Group();g.position.set(x,y,z);world.add(g);
    const rock=new THREE.Mesh(islandGeo,rockMats[seed%rockMats.length]);
    rock.position.y=-r*.41;rock.scale.set(r,r,r);g.add(rock);
    const top=new THREE.Mesh(islandTopGeo,topMat);top.scale.set(r*.97,1.1,r*.97);g.add(top);
    const trim=new THREE.Mesh(new THREE.TorusGeometry(r*.93,.085,5,12),rimMat);
    trim.rotation.x=Math.PI/2;trim.position.y=.10;g.add(trim);
    const ancient=new THREE.Group();ancient.position.y=.22;g.add(ancient);
    const houseCount=r<11?1:2;
    for(let j=0;j<houseCount;j++){
      const a=(j*2.38+seed*.9);
      const rad=r*(.20+.20*rand(seed+j));
      const col=new THREE.Mesh(columnGeo,ancientMat);col.position.set(Math.sin(a)*rad,1.8,Math.cos(a)*rad);
      const h=2.6+rand(seed+j+94)*4.3;
      col.scale.set(.9,h,.9);ancient.add(col);
      const cap=new THREE.Mesh(new THREE.ConeGeometry(.9,1.5,5),goldMat);
      cap.position.set(col.position.x,h/2+2.5,col.position.z);ancient.add(cap);
    }
    const c=new THREE.Mesh(crystalGeo,crystalMat);
    c.position.set((rand(seed+17)-.5)*r*.7,2.0,(rand(seed+49)-.5)*r*.7);
    c.scale.set(.6+rand(seed)*.7,1.3+rand(seed+5)*1.5,.6+rand(seed+22)*.7);ancient.add(c);
    const platform=new THREE.Mesh(new THREE.TorusGeometry(r*.34,.14,5,24),goldMat);
    platform.rotation.x=Math.PI/2;platform.position.y=.4;ancient.add(platform);
    const spire=new THREE.Mesh(shardGeo,crystalMat);
    spire.position.set((rand(seed+39)-.5)*r, -r*.54, (rand(seed+17)-.5)*r);
    spire.scale.set(1.1,r*.38,1.1);g.add(spire);
    isles.push({x,y,z,r});return g;
  }
  const islandDefs=[
    [-23,6,20,17,1],[29,9,-12,12,2],[34,17,-69,15,3],[-28,16,-70,12,4],
    [-55,26,-122,17,5],[12,24,-133,15,6],[52,35,-174,19,7],[-13,20,-198,13,8],
    [-41,34,-258,17,9],[26,31,-270,17,10],[-58,42,-331,15,11],
    [29,48,-345,20,12],[-8,48,-384,15,13],[48,65,-441,18,14],
    [-44,59,-466,18,15],[18,73,-498,13,16],[-11,68,-564,19,17],
    [59,46,-512,15,18],[-65,48,-580,16,19]
  ];
  for(const [x,y,z,r,seed] of islandDefs)makeIsland(x,y,z,r,seed);
  // One-instanced-drawcall scatter of ancient fragments.
  const shardCount=76,smallShard=new THREE.InstancedMesh(shardGeo,templeMat,shardCount);
  const dummy=new THREE.Object3D();
  for(let i=0;i<shardCount;i++){
    const x=(rand(i+37)-.5)*190,z=40-rand(i+58)*670;
    dummy.position.set(x,8+rand(i+38)*80,z);
    dummy.rotation.set(rand(i+2)*Math.PI,rand(i+5)*Math.PI,rand(i+7)*Math.PI);
    const s=.4+rand(i+99)*1.8;dummy.scale.set(s,s*2.4,s);
    dummy.updateMatrix();smallShard.setMatrixAt(i,dummy.matrix);
  }
  smallShard.instanceMatrix.needsUpdate=true;worldHigh.add(smallShard);
  // Six portal rings, placed along a climbable 3D route.
  const targetCoords=[[0,22,-53],[-27,31,-126],[31,41,-211],[-18,54,-302],[21,71,-417],[0,84,-545]];
  const portalGold=new THREE.MeshBasicMaterial({color:0xeaca83,transparent:true,opacity:.95});
  const portals=[];
  let prev=new THREE.Vector3(0,18,40);
  for(let i=0;i<targetCoords.length;i++){
    const g=new THREE.Group();g.position.set(...targetCoords[i]);world.add(g);
    const pathDir=g.position.clone().sub(prev).normalize();
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),pathDir);
    const ringMat=new THREE.MeshBasicMaterial({color:0x467e8e,transparent:true,opacity:.84});
    const mainRing=new THREE.Mesh(new THREE.TorusGeometry(7.6,.34,8,48),ringMat);g.add(mainRing);
    const innerMat=new THREE.MeshBasicMaterial({color:0x3eb8d2,transparent:true,opacity:.82});
    const innerRing=new THREE.Mesh(new THREE.TorusGeometry(6.94,.057,5,48),innerMat);g.add(innerRing);
    const detailGroup=new THREE.Group();g.add(detailGroup);
    for(let j=0;j<12;j++){
      const a=j*Math.PI/6;
      const point=new THREE.Mesh(new THREE.BoxGeometry(.34,.72,.6),j%3===0?goldMat:ancientMat);
      point.position.set(Math.sin(a)*7.54,Math.cos(a)*7.54,0);
      point.rotation.z=-a;detailGroup.add(point);
    }
    const beacon=new THREE.Mesh(new THREE.OctahedronGeometry(.54,0),crystalMat);
    beacon.position.set(0,8.8,0);g.add(beacon);
    const halo=new THREE.Mesh(new THREE.TorusGeometry(8.04,.07,4,32),portalGold);
    halo.visible=false;g.add(halo);
    const core=new THREE.Mesh(new THREE.CircleGeometry(6.67,36),new THREE.MeshBasicMaterial({color:0x62dbec,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
    core.position.z=-.14;g.add(core);
    portals.push({g,mainRing,innerRing,detailGroup,beacon,halo,core,ringMat,innerMat,done:false});
    prev=g.position;
  }
  // A few background rock arches, enormous landmarks on distant sky islands.
  function makeArch(pos,scale){
    const g=new THREE.Group();g.position.set(...pos);g.scale.setScalar(scale);worldHigh.add(g);
    for(const s of [-1,1]){
      const pier=new THREE.Mesh(new THREE.CylinderGeometry(.8,1.2,14,6),ancientMat);pier.position.set(s*7,6,0);g.add(pier);
      const cap=new THREE.Mesh(new THREE.ConeGeometry(1.3,2.3,5),goldMat);cap.position.set(s*7,13.7,0);g.add(cap);
    }
    const bridge=new THREE.Mesh(new THREE.BoxGeometry(14,1.2,1.6),ancientMat);
    bridge.position.set(0,12,0);g.add(bridge);
    const orb=new THREE.Mesh(new THREE.OctahedronGeometry(2.2,1),crystalMat);orb.position.set(0,10.4,0);g.add(orb);
  }
  makeArch([77,18,-200],1.55);makeArch([-93,21,-430],1.85);
  const ship=createAetherModule(THREE,{quality:'high'});scene.add(ship.root);
  const controller=new AetherFlightController(THREE,{position:[0,18,40]});
  const keys=new Set();
  const sticks={left:{x:0,y:0},right:{x:0,y:0}};
  const held={boost:false,brake:false};
  let view='TPS',quality='high',auto=false,paused=true,completed=0,flightTime=0;
  let orbitYaw=0,orbitPitch=0,camReady=false,frameCount=0,fpsAccumulator=0,lastFPS=60;
  let noticeUntil=0,previousFrame=0,noticeText='';
  let meterAccumulator=0;
  const clock=new THREE.Clock();
  const help=$('splash');
  const gateNotice=$('gate-notice');
  const $speed=$('speed'),$alt=$('altitude'),$energy=$('energy-bar'),$meters=$('distance'),$fps=$('fps');
  const $tier=$('tier'),$progress=$('progress'),$target=$('target-label'),$view=$('view-label'),$quality=$('quality-label'),$auto=$('auto-label');
  const $targetPin=$('target-pin'),$targetDist=$('target-distance');
  const $finished=$('finish');
  function printNotice(text){noticeText=text;gateNotice.textContent=text;noticeUntil=performance.now()+2600;gateNotice.classList.add('show');}
  function refreshProgress(){
    $progress.innerHTML=targetCoords.map((_,i)=>`<span class="step ${i<completed?'done':i===completed?'active':''}">${i<completed?'◆':String(i+1).padStart(2,'0')}</span>`).join('');
    $target.textContent=completed>=targetCoords.length?'全ゲート通過':`飛行ゲート ${String(completed+1).padStart(2,'0')} / ${targetCoords.length}`;
    $tier.textContent=`MK-${controller.tier} / ${['SCOUT','VANGUARD','HORIZON'][controller.tier-1]}`;
  }
  function changeQuality(q){
    quality=q==='low'?'low':'high';ship.setQuality(quality);
    worldHigh.visible=quality==='high';
    const dpr=window.devicePixelRatio||1;
    renderer.setPixelRatio(Math.min(dpr,quality==='low'?1.05:(isTouch?1.45:1.65)));
    renderer.setSize(window.innerWidth,window.innerHeight,false);
    $quality.textContent=quality==='high'?'HIGH':'LITE';
    document.querySelectorAll('[data-action="quality"]').forEach(el=>el.title=`Current quality: ${quality}`);
  }
  function changeView(v){view=v;camReady=false;$view.textContent=v;printNotice(v==='TPS'?'CHASE CAMERA / TPS':'COCKPIT CAMERA / FPS');}
  function changeAuto(a){auto=!!a;$auto.textContent=auto?'AUTO ON':'AUTO OFF';$('auto-button').classList.toggle('is-on',auto);printNotice(auto?'航路補助 ON / AUTOPILOT':'航路補助 OFF / MANUAL');}
  function start(){paused=false;help.classList.add('hidden');$finished.classList.add('hidden');clock.getDelta();}
  function restart(){
    controller.reset([0,18,40]);completed=0;flightTime=0;camReady=false;auto=false;$auto.textContent='AUTO OFF';$('auto-button').classList.remove('is-on');
    portals.forEach(p=>{p.done=false;p.core.material.opacity=0;});refreshProgress();start();printNotice('FLIGHT RESTARTED');
  }
  function keyIs(key){return keys.has(key);}
  window.addEventListener('keydown',ev=>{
    const k=ev.key.toLowerCase();
    if(['arrowup','arrowdown','arrowleft','arrowright',' ','shift'].includes(k))ev.preventDefault();
    keys.add(k);
    if(ev.repeat)return;
    if(k==='v')changeView(view==='TPS'?'FPS':'TPS');
    if(k==='1')changeQuality('low');
    if(k==='2')changeQuality('high');
    if(k==='p')changeAuto(!auto);
    if(k==='x')restart();
    if(k==='escape'&&!paused) {paused=true;help.classList.remove('hidden');}
    if((k==='enter'||k===' ')&&paused)start();
  });
  window.addEventListener('keyup',ev=>keys.delete(ev.key.toLowerCase()));
  window.addEventListener('blur',()=>{keys.clear();held.boost=false;held.brake=false;sticks.left.x=sticks.left.y=sticks.right.x=sticks.right.y=0;});
  function readInput(){
    const input={yaw:0,pitch:0,throttle:0,lift:0,strafe:0,boost:false,brake:false};
    input.yaw=clamp((keyIs('d')||keyIs('arrowright')?1:0)-(keyIs('a')||keyIs('arrowleft')?1:0)+sticks.left.x,-1,1);
    input.pitch=clamp((keyIs('arrowup')||keyIs('i')?1:0)-(keyIs('arrowdown')||keyIs('k')?1:0)+sticks.left.y,-1,1);
    input.throttle=clamp((keyIs('w')?1:0)-(keyIs('s')?1:0)+sticks.right.y,-1,1);
    input.lift=clamp((keyIs('r')||keyIs('e')?1:0)-(keyIs('f')||keyIs('q')?1:0)+sticks.right.x,-1,1);
    input.boost=keyIs('shift')||held.boost;
    input.brake=keyIs(' ')||held.brake;
    if(auto && completed<targetCoords.length){
      const target=portals[completed].g.position;
      const dx=target.x-controller.position.x,dz=target.z-controller.position.z;
      const dy=target.y-controller.position.y;
      const desiredYaw=Math.atan2(-dx,-dz);
      const err=Math.atan2(Math.sin(desiredYaw-controller.yaw),Math.cos(desiredYaw-controller.yaw));
      const dist=Math.hypot(dx,dz);
      const desiredPitch=clamp(Math.atan2(dy,Math.max(dist,1)),-.36,.38);
      input.yaw=clamp(-err*2.0,-1,1);
      input.pitch=clamp((desiredPitch-controller.pitch)*3.0,-1,1);
      input.lift=clamp(dy*.035,-.7,.7);
      input.throttle=controller.throttle<.83?.85:0;
      input.boost=false;input.brake=dist<16&&Math.abs(dy)>8;
    }
    return input;
  }
  // Touch joysticks: left yaw/pitch; right vertical throttle and horizontal hover lift.
  function installStick(name){
    const pad=$(`${name}-pad`), knob=$(`${name}-knob`),state=sticks[name];
    let pointer=null;
    function update(ev){
      if(pointer!==ev.pointerId)return;
      const r=pad.getBoundingClientRect();const x=ev.clientX-(r.left+r.width/2),y=ev.clientY-(r.top+r.height/2);
      const radius=r.width*.34;
      const length=Math.hypot(x,y),factor=length>radius?radius/length:1;
      const xx=x*factor,yy=y*factor;
      state.x=clamp(xx/radius,-1,1);state.y=clamp(-yy/radius,-1,1);
      knob.style.transform=`translate(${xx}px,${yy}px)`;
    }
    function release(ev){if(pointer===ev.pointerId){pointer=null;state.x=0;state.y=0;knob.style.transform='translate(0px,0px)';pad.classList.remove('engaged');}}
    pad.addEventListener('pointerdown',ev=>{ev.preventDefault();pointer=ev.pointerId;pad.setPointerCapture(pointer);pad.classList.add('engaged');update(ev);});
    pad.addEventListener('pointermove',update);pad.addEventListener('pointerup',release);pad.addEventListener('pointercancel',release);
  }
  installStick('left');installStick('right');
  function holdButton(id,key){
    const el=$(id);const fn=val=>{held[key]=val;el.classList.toggle('is-on',val);};
    el.addEventListener('pointerdown',ev=>{ev.preventDefault();el.setPointerCapture(ev.pointerId);fn(true);});
    el.addEventListener('pointerup',()=>fn(false));el.addEventListener('pointercancel',()=>fn(false));
  }
  holdButton('boost-button','boost');holdButton('brake-button','brake');
  const menuActions={view:()=>changeView(view==='TPS'?'FPS':'TPS'),quality:()=>changeQuality(quality==='high'?'low':'high'),auto:()=>changeAuto(!auto),restart};
  for(const el of document.querySelectorAll('[data-action]')){
    el.addEventListener('click',()=>menuActions[el.dataset.action]?.());
  }
  $('start-button').addEventListener('click',start);
  $('again-button').addEventListener('click',restart);
  // Mouse / free touch swipe on viewport: chase camera orbit.
  let mousePointer=null,px=0,py=0;
  renderer.domElement.addEventListener('pointerdown',ev=>{
    if(ev.pointerType==='mouse'&&ev.button!==0)return;
    mousePointer=ev.pointerId;px=ev.clientX;py=ev.clientY;
    renderer.domElement.setPointerCapture(mousePointer);
  });
  renderer.domElement.addEventListener('pointermove',ev=>{
    if(ev.pointerId!==mousePointer||view!=='TPS')return;
    const dx=ev.clientX-px,dy=ev.clientY-py;px=ev.clientX;py=ev.clientY;
    orbitYaw-=dx*.004;orbitPitch=clamp(orbitPitch+dy*.0025,-.48,.82);
  });
  const endPointer=ev=>{if(ev.pointerId===mousePointer)mousePointer=null;};
  renderer.domElement.addEventListener('pointerup',endPointer);renderer.domElement.addEventListener('pointercancel',endPointer);
  function onResize(){
    const width=window.innerWidth,height=window.innerHeight;
    camera.aspect=width/Math.max(height,1);camera.updateProjectionMatrix();
    renderer.setSize(width,height,false);
  }
  window.addEventListener('resize',onResize,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();}clock.getDelta();});
  const forward=new THREE.Vector3(),desired=new THREE.Vector3(),aim=new THREE.Vector3(),tmp=new THREE.Vector3();
  function updateCamera(dt){
    forward.set(0,0,-1).applyQuaternion(controller.quaternion);
    if(view==='FPS'){
      desired.set(0,1.42,-2.38).applyQuaternion(controller.quaternion).add(controller.position);
      if(!camReady)camera.position.copy(desired);else camera.position.lerp(desired,Math.min(1,dt*19));
      camera.quaternion.copy(controller.quaternion);
      camera.fov=73;
    }else{
      const bearing=controller.yaw+orbitYaw;
      const dist=16.7;
      desired.set(Math.sin(bearing)*dist,5.9+orbitPitch*9.2,Math.cos(bearing)*dist).add(controller.position);
      if(!camReady)camera.position.copy(desired);else camera.position.lerp(desired,Math.min(1,dt*5.8));
      aim.copy(controller.position).addScaledVector(forward,4.9);aim.y+=.42;
      camera.lookAt(aim);
      camera.fov=66;
    }
    camReady=true;camera.updateProjectionMatrix();
    // Scene environment follows camera, sky shader's world space remains fixed relative to dome.
    sky.position.copy(camera.position);
  }
  function updateGates(dt,now){
    portals.forEach((p,i)=>{
      const active=i===completed;
      p.mainRing.scale.setScalar(active?1+.012*Math.sin(now*.0022):1);
      p.innerRing.rotation.z=now*.00012*(i%2?1:-1);
      p.detailGroup.rotation.z=now*.00006*(i%2?1:-1);
      p.beacon.rotation.y=now*.001;
      p.halo.visible=active;
      p.ringMat.color.setHex(p.done?0x366c73:active?0xf1b865:0x3b8b9c);
      p.innerMat.opacity=p.done?.25:active?.9:.45;
      p.core.material.opacity=p.done?.03:active?.035+.022*Math.sin(now*.0018):0;
    });
    if(completed<portals.length&&!paused){
      const p=portals[completed];
      // Check the portal's 3D distance in meters, not a pre-scripted timeline.
      if(controller.position.distanceToSquared(p.g.position)<8.7*8.7){
        p.done=true;completed++;
        if(completed===2||completed===4){
          controller.setTier(completed===2?2:3);
          printNotice(completed===2?'UPGRADE / MK-II VANGUARD 解放':'UPGRADE / MK-III HORIZON 解放');
        }else printNotice(completed===portals.length?'ALL PORTALS CLEARED':'PORTAL CLEARED +1');
        refreshProgress();
        if(completed===portals.length){
          paused=true;$('finish-time').textContent=`${Math.floor(flightTime/60)}:${Math.floor(flightTime%60).toString().padStart(2,'0')}`;
          $('finish-distance').textContent=`${Math.round(controller.travelled)}m`;
          $finished.classList.remove('hidden');
        }
      }
    }
  }
  function updateHud(dt,now){
    meterAccumulator+=dt;
    if(meterAccumulator>.09){
      meterAccumulator=0;
      $speed.textContent=String(Math.round(controller.speed*3.6)).padStart(3,'0');
      $alt.textContent=Math.round(controller.position.y).toString();
      $energy.style.width=`${controller.energy.toFixed(0)}%`;
      $meters.textContent=Math.floor(controller.travelled).toLocaleString('ja-JP');
      $fps.textContent=lastFPS.toFixed(0);
      if(completed<portals.length){
        const range=controller.position.distanceTo(portals[completed].g.position);
        $targetDist.textContent=`${range<1000?Math.round(range)+'m':(range/1000).toFixed(1)+'km'} TO GATE`;
      }else $targetDist.textContent='SECTOR COMPLETE';
    }
    if(noticeUntil<now)gateNotice.classList.remove('show');
    if(completed<portals.length){
      tmp.copy(portals[completed].g.position).project(camera);
      let x=(tmp.x*.5+.5)*window.innerWidth,y=(-tmp.y*.5+.5)*window.innerHeight;
      const behind=tmp.z>1;
      if(behind){x=window.innerWidth-x;y=window.innerHeight-y;}
      const margin=45;
      x=clamp(x,margin,window.innerWidth-margin);y=clamp(y,100,window.innerHeight-80);
      $targetPin.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%)`;
      $targetPin.classList.remove('hidden');
    }else $targetPin.classList.add('hidden');
  }
  function loop(){
    requestAnimationFrame(loop);
    const dt=Math.min(clock.getDelta(),.05),now=performance.now();
    fpsAccumulator+=dt;frameCount++;
    if(fpsAccumulator>.6){lastFPS=frameCount/fpsAccumulator;fpsAccumulator=0;frameCount=0;}
    if(!paused){
      const input=readInput();const state=controller.update(dt,input);
      ship.root.position.copy(controller.position);ship.root.quaternion.copy(controller.quaternion);
      ship.update(dt,{flight:state});
      flightTime+=dt;
      // Simple elevated-island collision safety: place ship above traversable island tops.
      for(const island of isles){
        const dx=controller.position.x-island.x,dz=controller.position.z-island.z;
        if(dx*dx+dz*dz<(island.r*.80)**2 && controller.position.y<island.y+2.1 && controller.position.y>island.y-island.r*.45){
          controller.position.y=island.y+2.1;
          controller.speed*=.94;
        }
      }
    }else ship.update(dt,{flight:controller.telemetry()});
    updateCamera(Math.max(dt,.016));updateGates(dt,now);updateHud(dt,now);
    renderer.render(scene,camera);
  }
  refreshProgress();changeQuality(isTouch?'low':'high');onResize();ship.root.position.copy(controller.position);
  ship.root.quaternion.copy(controller.quaternion);updateCamera(.016);
  // Lightweight integration diagnostics for host game and automated smoke checks.
  window.__AF08={
    ship,controller,scene,camera,renderer,
    get status(){return {paused,view,quality,auto,completed,fps:lastFPS,tier:controller.tier};},
    setQuality:changeQuality,setView:changeView,reset:restart,start,
    dispose(){window.removeEventListener('resize',onResize);ship.dispose();renderer.dispose();}
  };
  loop();
}
