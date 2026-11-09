// Standalone showcase scene only. Never include this file in game-world integration.
const stage=document.getElementById('stage');
const hudFPS=document.getElementById('fps');
const hudDraw=document.getElementById('drawcalls');
const hudTriangles=document.getElementById('triangles');
const modeLabel=document.getElementById('modeLabel');
const mobile=/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (window.matchMedia('(pointer:coarse)').matches && window.innerWidth<960);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x060c1a);scene.fog=new THREE.FogExp2(0x060e21,.0043);
const camera=new THREE.PerspectiveCamera(43,innerWidth/innerHeight,.1,400);
const renderer=new THREE.WebGLRenderer({alpha:false,antialias:!mobile,powerPreference:'high-performance',stencil:false});
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.65;
renderer.setClearColor(0x080d20,1);
renderer.shadowMap.enabled=false;
renderer.domElement.setAttribute('aria-label','3D機械竜モデル展示ビュー');
stage.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0x9fcdf5,0x16202a,1.50));
scene.add(new THREE.AmbientLight(0x506f9d,.36));
function directed(hex,power,xyz){const l=new THREE.DirectionalLight(hex,power);l.position.set(...xyz);scene.add(l);}
directed(0xc4eaff,2.65,[9,29,-16]);
directed(0x68c8ff,1.65,[-19,11,5]);
directed(0xffa364,1.20,[16,6,19]);
const boss=createAetherModule(THREE,{quality:mobile?'low':'high'});
scene.add(boss.root);
window.AETHER13 = {boss,scene,camera,renderer}; // Demo debugging only; not required by module.
const world=new THREE.Group();world.name='StandaloneCeremonialStage';scene.add(world);
const materials=[];const geos=[];
const MM=(color,metalness=.7,roughness=.42,emissive=0,emissiveIntensity=0,extra={})=>{const m=new THREE.MeshStandardMaterial({color,metalness,roughness,emissive,emissiveIntensity,...extra});materials.push(m);return m;};
const rock=MM(0x182536,.67,.54),metal=MM(0x37465b,.82,.36),trim=MM(0x9fa5b2,.76,.25),gold=MM(0xad8852,.72,.34),glow=MM(0x5ce8ff,.3,.25,0x15c6f5,2.3);
function mesh(g,m,p,rot=null){geos.push(g);const o=new THREE.Mesh(g,m);o.position.set(...p);if(rot)o.rotation.set(...rot);world.add(o);return o;}
const base=mesh(new THREE.CylinderGeometry(18,19.5,1.7,64,1),rock,[0,-1.40,0]);
mesh(new THREE.CylinderGeometry(17.1,17.25,.20,64),metal,[0,-.47,0]);
mesh(new THREE.CylinderGeometry(14.9,14.9,.08,64),rock,[0,-.29,0]);
for(const [r,t] of [[17.2,.17],[14.86,.085],[12.4,.045],[8.2,.06],[5.1,.03]]){
  mesh(new THREE.TorusGeometry(r,t,6,104),r>=14?gold:glow,[0,-.16,0],[Math.PI/2,0,0]);
}
for(let i=0;i<28;i++){
  const a=i*2*Math.PI/28,rad=15.65;
  const o=mesh(new THREE.BoxGeometry(.27,.08,1.55),i%4?metal:gold,[Math.sin(a)*rad,-.12,Math.cos(a)*rad],[0,a,0]);
}
for(let i=0;i<12;i++){
  const a=i*2*Math.PI/12,rad=18.25,x=Math.sin(a)*rad,z=Math.cos(a)*rad;
  const stem=mesh(new THREE.CylinderGeometry(.32,.5,2.4,6),rock,[x,.24,z]);
  stem.rotation.y=a;
  const top=mesh(new THREE.OctahedronGeometry(.50,0),glow,[x,1.68,z]);top.rotation.y=a;
}
const outer = new THREE.Group();world.add(outer);
for(let i=0;i<8;i++){
  const a=i*2*Math.PI/8,rad=38, x=Math.sin(a)*rad,z=Math.cos(a)*rad;
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(1.1,2.25,18+(i%3)*4,6),rock);
  pole.position.set(x,-3,z);outer.add(pole);
  const cap=new THREE.Mesh(new THREE.ConeGeometry(2.6,5.6,6),metal);cap.position.set(x,7.8+(i%3)*2,z);outer.add(cap);
  const gl=new THREE.Mesh(new THREE.OctahedronGeometry(1.0,0),glow);gl.position.set(x,10.8+(i%3)*2,z);outer.add(gl);
}
const particlesN=mobile?190:480,pointsArray=new Float32Array(particlesN*3);
for(let i=0;i<particlesN;i++){
  const r=24+Math.random()*94,a=Math.random()*Math.PI*2;
  pointsArray[i*3]=Math.sin(a)*r;pointsArray[i*3+1]=-4+Math.random()*65;pointsArray[i*3+2]=Math.cos(a)*r;
}
const pointsGeo=new THREE.BufferGeometry();pointsGeo.setAttribute('position',new THREE.BufferAttribute(pointsArray,3));
const pointMat=new THREE.PointsMaterial({color:0x88dce6,size:.16,transparent:true,opacity:.72,depthWrite:false,sizeAttenuation:true});
const motes=new THREE.Points(pointsGeo,pointMat);scene.add(motes);
let currentQuality=mobile?'low':'high';
const phaseNames={idle:'静止 / 哨戒',roar:'咆哮 / 威嚇',charge:'魔法炉心 / 充填',breath:'エーテルブレス / 放射',flight:'飛行 / 翼展開'};
function setMode(phase){boss.setPhase(phase);modeLabel.textContent=phaseNames[phase]||phase;document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('selected',b.dataset.mode===phase));}
let autoDemo=false,autoTime=0,autoIndex=0;const tour=[['idle',4.2],['roar',2.7],['charge',2.8],['breath',2.2],['flight',5.0]];
function switchQuality(mode){
  currentQuality=boss.setQuality(mode);world.visible=true;
  outer.visible=currentQuality==='high';
  motes.visible=currentQuality==='high';
  renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?(currentQuality==='high'?1.35:1.0):(currentQuality==='high'?1.8:1.25)));
  renderer.setSize(innerWidth,innerHeight,false);
  document.querySelectorAll('[data-quality]').forEach(b=>b.classList.toggle('selected',b.dataset.quality===currentQuality));
  document.getElementById('qualityLabel').textContent=currentQuality==='high'?'HIGH / 精密':'LITE / 軽量';
}
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{autoDemo=false;document.getElementById('auto').classList.remove('selected');setMode(b.dataset.mode);}));
document.querySelectorAll('[data-quality]').forEach(b=>b.addEventListener('click',()=>switchQuality(b.dataset.quality)));
const autoBtn=document.getElementById('auto');autoBtn.addEventListener('click',()=>{autoDemo=!autoDemo;autoBtn.classList.toggle('selected',autoDemo);autoTime=0;autoIndex=0;if(autoDemo)setMode(tour[0][0]);});
let yaw=.32,pitch=.20,dist=60,drag=false,px=0,py=0,panLockedUntil=0,spinEnabled=true;
const tpoint=new THREE.Vector3(0,6.5,0);
function pointerDown(e){if(e.button>0)return;drag=true;px=e.clientX;py=e.clientY;renderer.domElement.setPointerCapture(e.pointerId);panLockedUntil=performance.now()+7000;}
function pointerMove(e){if(!drag)return;const dx=e.clientX-px,dy=e.clientY-py;px=e.clientX;py=e.clientY;yaw-=dx*.006;pitch=Math.max(-.04,Math.min(.85,pitch+dy*.0045));}
function pointerUp(){drag=false;}
renderer.domElement.addEventListener('pointerdown',pointerDown);
renderer.domElement.addEventListener('pointermove',pointerMove);
renderer.domElement.addEventListener('pointerup',pointerUp);
renderer.domElement.addEventListener('pointercancel',pointerUp);
renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();dist=Math.max(21,Math.min(112,dist+e.deltaY*.037));panLockedUntil=performance.now()+7000;},{passive:false});
let pinch=0;renderer.domElement.addEventListener('touchmove',e=>{
  if(e.touches.length===2){const a=e.touches[0],b=e.touches[1],d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);if(pinch)dist=Math.max(22,Math.min(116,dist+(pinch-d)*.105));pinch=d;}
},{passive:true});renderer.domElement.addEventListener('touchend',()=>pinch=0);
window.addEventListener('keydown',e=>{
  if(e.target instanceof HTMLButtonElement)return;
  const maps={'1':'idle','2':'roar','3':'charge','4':'breath','5':'flight'};
  if(maps[e.key])setMode(maps[e.key]);
  if(e.key===' ') {e.preventDefault();spinEnabled=!spinEnabled;}
});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();switchQuality(currentQuality);});
function updateCamera(dt){
  if(spinEnabled && !drag && performance.now()>panLockedUntil)yaw+=dt*.035;
  const pp=pitch;
  camera.position.set(Math.sin(yaw)*dist*Math.cos(pp),tpoint.y+Math.sin(pp)*dist, -Math.cos(yaw)*dist*Math.cos(pp));
  camera.lookAt(tpoint);
}
const clock=new THREE.Clock();let frameCount=0,sum=.0001,lastHUD=0;
function frame(){
  const dt=Math.min(clock.getDelta(),.06);sum+=dt;frameCount++;
  if(autoDemo){autoTime+=dt;const curr=tour[autoIndex];if(autoTime>curr[1]){autoTime=0;autoIndex=(autoIndex+1)%tour.length;setMode(tour[autoIndex][0]);}}
  boss.update(dt);
  motes.rotation.y+=dt*.001;
  updateCamera(dt);
  renderer.render(scene,camera);
  if(sum>=.75){
    hudFPS.textContent=Math.round(frameCount/sum)+' FPS';
    hudDraw.textContent=renderer.info.render.calls.toString();
    hudTriangles.textContent=(renderer.info.render.triangles/1000).toFixed(1)+'k';
    frameCount=0;sum=0;
  }
  requestAnimationFrame(frame);
}
switchQuality(currentQuality);setMode('idle');frame();
window.addEventListener('pagehide',()=>{
  // Demo page unload cleanup; game integration can call boss.dispose() explicitly.
  boss.dispose();renderer.dispose();geos.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());pointsGeo.dispose();pointMat.dispose();
},{once:true});
