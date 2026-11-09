// Team No.20 standalone demonstration controller. This file is not needed by game integration.
const canvas=document.querySelector('#scene');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.32;
renderer.setClearColor(0x0a1a2a,1);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1a2b);
scene.fog = new THREE.FogExp2(0x10263c,.009);
const camera = new THREE.PerspectiveCamera(70,1,.08,280);
const $=(id)=>document.getElementById(id);
const ui={focus:$('focus'),name:$('targetName'),hint:$('targetHint'),toast:$('toast'),cross:$('crosshair'),status:$('statusText'),q:$('qualityLabel'),view:$('viewLabel')};
const module20=createAetherModule(THREE,{quality:'high',includeStage:true,includeLights:true,onEvent:onModuleEvent});
scene.add(module20.root);
// A quiet aurora sky, without relying on textures or external art.
const skyGeo=new THREE.SphereGeometry(210,32,20);
const skyMat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,
 vertexShader:'varying vec3 vPosition;void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:'precision mediump float;varying vec3 vPosition;void main(){float h=normalize(vPosition).y;vec3 low=vec3(.055,.13,.21);vec3 mid=vec3(.037,.11,.19);vec3 high=vec3(.009,.025,.065);vec3 col=mix(low,mid,smoothstep(-.3,.22,h));col=mix(col,high,smoothstep(.15,.95,h));float haze=exp(-pow((h-.02)*9.,2.));col+=vec3(.02,.07,.09)*haze;gl_FragColor=vec4(col,1.);}' });
scene.add(new THREE.Mesh(skyGeo,skyMat));
const starPositions=[];
for(let i=0;i<340;i++) {
 const a=i*2.3999632297,z=-1+2*(i+.5)/340,r=Math.sqrt(1-z*z);
 const d=145;starPositions.push(Math.cos(a)*r*d,Math.abs(z)*d*.87+22,Math.sin(a)*r*d);
}
const starsGeo=new THREE.BufferGeometry();starsGeo.setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3));
const starsMat=new THREE.PointsMaterial({color:0xb5e9ff,size:.58,sizeAttenuation:false,transparent:true,opacity:.67,depthWrite:false});
const stars=new THREE.Points(starsGeo,starsMat);scene.add(stars);
// Third-person explorer built from GPU-lightweight primitives.
const avatar=new THREE.Group();avatar.name='DemoExplorer';scene.add(avatar);
const avMaterials={armor:new THREE.MeshStandardMaterial({color:0x344f65,metalness:.63,roughness:.36}),
 trim:new THREE.MeshStandardMaterial({color:0xb5a886,metalness:.7,roughness:.28}),
 dark:new THREE.MeshStandardMaterial({color:0x132d3e,metalness:.58,roughness:.42}),
 visor:new THREE.MeshBasicMaterial({color:0x73eff5}),
 cloak:new THREE.MeshStandardMaterial({color:0x253d52,metalness:.2,roughness:.72,side:THREE.DoubleSide}),
 core:new THREE.MeshBasicMaterial({color:0xb9fff2})};
const avatarParts=[];
function avBox(size,pos,mat,parent=avatar){const m=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);m.position.set(...pos);parent.add(m);avatarParts.push(m);return m;}
function avSphere(rad,pos,mat,parent=avatar){const m=new THREE.Mesh(new THREE.IcosahedronGeometry(rad,1),mat);m.position.set(...pos);parent.add(m);avatarParts.push(m);return m;}
const body=new THREE.Group();body.position.y=.04;avatar.add(body);
avBox([.54,.72,.31],[0,1.13,0],avMaterials.armor,body);
avBox([.46,.1,.33],[0,1.52,0],avMaterials.trim,body);
avBox([.18,.36,.08],[0,1.24,-.21],avMaterials.visor,body);
const head=avSphere(.3,[0,1.81,0],avMaterials.dark,body);
const visor=avBox([.43,.14,.15],[0,1.82,-.25],avMaterials.visor,body);
const leftArm=new THREE.Group();const rightArm=new THREE.Group();leftArm.position.set(-.39,1.42,.0);rightArm.position.set(.39,1.42,0);body.add(leftArm,rightArm);
avBox([.2,.6,.25],[0,-.32,0],avMaterials.armor,leftArm);
avBox([.2,.6,.25],[0,-.32,0],avMaterials.armor,rightArm);
const leftLeg=new THREE.Group();const rightLeg=new THREE.Group();leftLeg.position.set(-.18,.82,0);rightLeg.position.set(.18,.82,0);body.add(leftLeg,rightLeg);
avBox([.23,.75,.28],[0,-.4,0],avMaterials.dark,leftLeg);
avBox([.23,.75,.28],[0,-.4,0],avMaterials.dark,rightLeg);
avBox([.28,.13,.46],[0,-.76,-.12],avMaterials.armor,leftLeg);
avBox([.28,.13,.46],[0,-.76,-.12],avMaterials.armor,rightLeg);
const scarf=avBox([.57,.32,.035],[0,1.35,.21],avMaterials.cloak,body);
const handCore=avSphere(.18,[.48,.87,-.4],avMaterials.core,body);
const avatarGlow=new THREE.PointLight(0x63e9f6,.7,4.5);avatarGlow.position.set(0,1.5,-.45);avatar.add(avatarGlow);
// Movement and view model, cleanly separated from the reusable module.
const pos=new THREE.Vector3(0,0,10.9);
let view='TPS',quality='high',yaw=0,pitch=-.12,grounded=true,verticalVelocity=0;
let bob=0,frame=0,qualityFps=60,elapsed=0,finalReached=false,hasCrossedDoor=false;
let introTimer=0,toastUntil=0,now=0,prev=performance.now();
const keys=new Set();let cursorTarget=null;
const touch={moveX:0,moveY:0,lookId:null,lookX:0,lookY:0,run:false};
const dprCap={high:1.55,low:1.0};
function resized(){
 const w=window.innerWidth,h=window.innerHeight;
 const dpr=Math.min(window.devicePixelRatio||1,dprCap[quality]);
 renderer.setPixelRatio(dpr);renderer.setSize(w,h,false);
 camera.aspect=w/h;camera.updateProjectionMatrix();
}
window.addEventListener('resize',resized,{passive:true});
function setQuality(mode){
 quality=mode==='low'?'low':'high';module20.setQuality(quality);
 renderer.toneMappingExposure=quality==='high'?1.32:1.25;
 renderer.shadowMap.enabled=false;
 stars.visible=quality==='high';avatarGlow.visible=quality==='high';
 ui.q.textContent=quality==='high'?'HIGH':'LITE';resized();
}
function switchView(){view=view==='TPS'?'FPS':'TPS';ui.view.textContent=view;avatar.visible=view==='TPS';}
$('qualityBtn').addEventListener('click',()=>setQuality(quality==='high'?'low':'high'));
$('viewBtn').addEventListener('click',switchView);
function tip(message,duration=3.4){if(!message)return;ui.toast.textContent=message;toastUntil=now+duration;ui.toast.classList.add('show');}
function onModuleEvent(e){ if(e.type==='vault_unlocked'){tip('共鳴回路が完成。六葉封印門が開いた',4);}}
function updateMission(){
 const p=module20.getProgress();
 const complete=[p.aligned===3,p.coreDocked,p.unlocked&&hasCrossedDoor,finalReached];
 const objectiveText=[`3基の位相器を共鳴させる (${p.aligned}/3)`,p.coreHeld?'星核を運搬中：中枢へ接続する':p.coreDocked?'星核の接続が完了':'星核を中枢へ接続する',p.unlocked?'六葉封印門を通過する':'六葉封印門を解放する',finalReached?'転送成功：星海の展望台':'転送門で星海へ渡る'];
 for(let i=0;i<4;i++){
  const n=$('obj'+i); n.classList.toggle('complete',complete[i]);
  n.classList.toggle('active',!complete[i] && complete.slice(0,i).every(Boolean));
  $('task'+i).textContent=objectiveText[i];
 }
 ui.status.textContent=`共鳴回路 ${p.aligned} / 3　|　星核 ${p.coreHeld?'運搬中':p.coreDocked?'接続済み':'未接続'}`;
}
function doInteraction(){
 if(!cursorTarget){tip('装置の近くで照準を合わせて操作しよう',1.8);return;}
 const r=module20.interact(cursorTarget.id,{requireRange:true,playerPosition:pos});
 if(r.type==='teleport'&&r.position){
  pos.set(r.position.x,0,r.position.z);
  yaw=r.position.z< -20?Math.PI:0;pitch=-.13;
  verticalVelocity=0;grounded=true;
  if(r.position.z< -20) finalReached=true;
 }
 if(r.message)tip(r.message,r.type==='lore'?5.5:3.2);
 if(r.type==='reset'){finalReached=false;hasCrossedDoor=false;}
 updateMission();
}
window.addEventListener('keydown',e=>{
 const key=e.key.toLowerCase();
 if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(key))e.preventDefault();
 keys.add(key);
 if(e.repeat)return;
 if(key==='e'||key==='f')doInteraction();
 if(key==='v')switchView();
 if(key==='q')setQuality(quality==='high'?'low':'high');
 if(key===' '&&grounded){verticalVelocity=6.7;grounded=false;}
});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>{keys.clear();touch.moveX=touch.moveY=0;touch.run=false;});
let mouseDragging=false,lastMouseX=0,lastMouseY=0;
canvas.addEventListener('pointerdown',e=>{
 if(e.pointerType!=='mouse')return;
 mouseDragging=true;lastMouseX=e.clientX;lastMouseY=e.clientY;
 if(!document.pointerLockElement && canvas.requestPointerLock){ const lock=canvas.requestPointerLock(); if(lock && typeof lock.catch==='function')lock.catch(()=>{}); }
});
window.addEventListener('pointerup',()=>{mouseDragging=false;});
document.addEventListener('mousemove',e=>{
 if(document.pointerLockElement===canvas){yaw-=e.movementX*.0026;pitch=Math.max(-1.26,Math.min(1.22,pitch-e.movementY*.0022));}
 else if(mouseDragging){yaw-=(e.clientX-lastMouseX)*.004;pitch=Math.max(-1.26,Math.min(1.22,pitch-(e.clientY-lastMouseY)*.003));lastMouseX=e.clientX;lastMouseY=e.clientY;}
});
// Mobile: dual control. Virtual left stick, right-side look drag and distinct action button.
const stick=$('stick'),knob=$('knob'),zone=$('lookZone');
let stickId=null;
const stickSize=()=>stick.getBoundingClientRect().width;
function setKnob(x,y){const s=stickSize(),offset=s*.5-25;knob.style.left=`${offset+x*(s*.31)}px`;knob.style.top=`${offset+y*(s*.31)}px`;}
function stickPoint(e){const r=stick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
 const dx=e.clientX-cx,dy=e.clientY-cy,max=r.width*.32;
 const mag=Math.hypot(dx,dy),scale=mag>max?max/mag:1;
 touch.moveX=dx*scale/max;touch.moveY=dy*scale/max;
 setKnob(touch.moveX,touch.moveY);
}
stick.addEventListener('pointerdown',e=>{stickId=e.pointerId;stick.setPointerCapture(e.pointerId);stickPoint(e);e.preventDefault();});
stick.addEventListener('pointermove',e=>{if(e.pointerId===stickId)stickPoint(e);});
function endStick(e){if(e.pointerId!==stickId)return;stickId=null;touch.moveX=touch.moveY=0;setKnob(0,0);}
stick.addEventListener('pointerup',endStick);stick.addEventListener('pointercancel',endStick);
zone.addEventListener('pointerdown',e=>{if(touch.lookId!==null)return;touch.lookId=e.pointerId;touch.lookX=e.clientX;touch.lookY=e.clientY;zone.setPointerCapture(e.pointerId);e.preventDefault();});
zone.addEventListener('pointermove',e=>{if(e.pointerId!==touch.lookId)return;yaw-=(e.clientX-touch.lookX)*.0055;pitch=Math.max(-1.26,Math.min(1.22,pitch-(e.clientY-touch.lookY)*.005));touch.lookX=e.clientX;touch.lookY=e.clientY;});
zone.addEventListener('pointerup',e=>{if(e.pointerId===touch.lookId)touch.lookId=null;});
zone.addEventListener('pointercancel',e=>{if(e.pointerId===touch.lookId)touch.lookId=null;});
$('actButton').addEventListener('pointerdown',e=>{e.preventDefault();doInteraction();});
$('jumpButton').addEventListener('pointerdown',e=>{e.preventDefault();if(grounded){verticalVelocity=6.7;grounded=false;}});
$('sprintButton').addEventListener('pointerdown',e=>{e.preventDefault();touch.run=!touch.run;e.currentTarget.style.borderColor=touch.run?'#b9fff5':'';});
function frameLoop(t){
 requestAnimationFrame(frameLoop);
 const dt=Math.min(.05,Math.max(.001,(t-prev)/1000));prev=t;now=t/1000;elapsed+=dt;frame++;
 if(introTimer++===130)$('intro').classList.add('hidden');
 if(now>toastUntil)ui.toast.classList.remove('show');
 const fx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+touch.moveX;
 const fz=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0)-touch.moveY;
 const mag=Math.hypot(fx,fz),speed=keys.has('shift')||touch.run?7.0:4.0;
 let moving=mag>.08;
 if(moving){
  const f= Math.min(1,mag),dx=(Math.cos(yaw)*fx+Math.sin(yaw)*fz)/mag*speed*dt*f;
  const dz=(Math.sin(yaw)*fx-Math.cos(yaw)*fz)/mag*speed*dt*f;
  const candX=pos.x+dx,candZ=pos.z+dz;
  if(module20.isPassageClear(pos.x,pos.z,candX,pos.z))pos.x=candX;
  if(module20.isPassageClear(pos.x,pos.z,pos.x,candZ))pos.z=candZ;
  bob+=dt*(speed>5?13:9);
 }
 if(!grounded){verticalVelocity-=17.5*dt;pos.y+=verticalVelocity*dt;if(pos.y<=0){pos.y=0;verticalVelocity=0;grounded=true;}}
 // Animation and role-play visuals remain separate from interactive module state.
 avatar.position.copy(pos);avatar.rotation.y=yaw;
 body.position.y=.04+(moving?.04*Math.sin(bob*2):.025*Math.sin(now*1.4));
 const stride=moving?.5*Math.sin(bob):0;
 leftArm.rotation.x=stride;rightArm.rotation.x=-stride;
 leftLeg.rotation.x=-stride;rightLeg.rotation.x=stride;
 scarf.rotation.x=.045+.06*Math.sin(now*2);
 handCore.visible=module20.getState().coreHeld;
 avatar.visible=view==='TPS';
 const target=new THREE.Vector3(pos.x,pos.y+1.53,pos.z);
 const cosPitch=Math.cos(pitch),lookDir=new THREE.Vector3(Math.sin(yaw)*cosPitch,Math.sin(pitch),-Math.cos(yaw)*cosPitch);
 if(view==='FPS'){
  camera.position.set(pos.x,pos.y+1.68+(moving?.018*Math.sin(bob*2):0),pos.z);
  camera.lookAt(camera.position.clone().add(lookDir));
 } else {
  camera.position.copy(target).addScaledVector(lookDir,-5.5).add(new THREE.Vector3(0,1.12,0));
  camera.lookAt(target.clone().addScaledVector(lookDir,5));
 }
 module20.update(dt,{playerPosition:pos,cameraPosition:camera.position,viewMode:view});
 const aimDirection=camera.getWorldDirection(new THREE.Vector3());
 const selected=module20.findInteractable({origin:camera.position,direction:aimDirection,playerPosition:new THREE.Vector3(pos.x,pos.y+1.1,pos.z),maxPlayerDistance:4.3,maxDistance:22});
 cursorTarget=selected;
 ui.focus.style.display=selected?'block':'none';
 ui.cross.classList.toggle('focus',Boolean(selected));
 if(selected){ui.name.textContent=selected.label;ui.hint.innerHTML='<kbd>E</kbd>'+selected.hint;}
 const progress=module20.getProgress();
 if(progress.unlocked&&pos.z< -13.5)hasCrossedDoor=true;
 if(frame%10===0)updateMission();
 renderer.render(scene,camera);
}
setQuality('high');updateMission();
requestAnimationFrame(frameLoop);
// Expose a small console utility for integrators and automated smoke tests.
window.AETHER_NO20_DEMO={module:module20,getPlayer:()=>pos.clone(),setPlayer:(v)=>pos.set(v.x,v.y||0,v.z),interact:(id)=>module20.interact(id),setQuality,setView:(v)=>{if(v!==view)switchView();},getStats:()=>({quality,view,...module20.getProgress()})};
