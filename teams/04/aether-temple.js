/* AETHER FRONTIER | Team 04 | ASTRAEUM: Temple of the Three Seals
 * Three.js 0.160.0 | Y up, -Z forward, 1 unit ~= 1 meter.
 * Integration entry: createAetherModule(THREE, options)
 * No scene/camera/renderer/input ownership; no external assets.
 * options: {quality:'low'|'high', onEvent(event), origin:{x,y,z}}
 * context: {time, playerPosition:THREE.Vector3, interact:boolean, interactionPressed:boolean}
 */
(function(global){
'use strict';
function createAetherModule(THREE, options={}){
 const root=new THREE.Group(); root.name='AF04_Astraeum_Temple';
 const origin=options.origin||{x:0,y:0,z:0}; root.position.set(origin.x||0,origin.y||0,origin.z||0);
 const allGeo=new Set(), allMat=new Set(), dynamic=[], interactables=[], blockers=[];
 const lowOnly=[], highOnly=[]; let quality='high', elapsed=0, disposed=false, gateOpen=false;
 const flags={west:false,east:false,heart:false,gate:false,archive:false};
 const MAT={};
 function material(key,color,metalness=.15,roughness=.78,emissive=0,ei=0){
   let m=new THREE.MeshStandardMaterial({color,metalness,roughness,emissive,emissiveIntensity:ei}); allMat.add(m);MAT[key]=m;return m;
 }
 material('stone',0x354352,.12,.93);material('stone2',0x566477,.18,.84);material('dark',0x192735,.28,.72);
 material('edge',0x8396a5,.32,.58);material('gold',0xc2a46b,.76,.32);material('obsidian',0x111b29,.45,.39);
 material('glow',0x2caac0,.25,.4,0x0ca6cd,1.35);material('glowGold',0xf9cb83,.25,.45,0xe9a44a,1.1);
 material('inactive',0x344757,.36,.45,0x102337,.25);material('ground',0x26363e,.02,1);
 const basicBox=new THREE.BoxGeometry(1,1,1), basicCylinder=new THREE.CylinderGeometry(1,1,1,12),basicSphere=new THREE.IcosahedronGeometry(1,1);
 allGeo.add(basicBox);allGeo.add(basicCylinder);allGeo.add(basicSphere);
 function cube(x,y,z,w,h,d,mat=MAT.stone,parent=root,high=false){
  const m=new THREE.Mesh(basicBox,mat);m.position.set(x,y,z);m.scale.set(w,h,d);parent.add(m);if(high)highOnly.push(m);return m;
 }
 function geomMesh(g,m,x=0,y=0,z=0,parent=root,high=false){allGeo.add(g);let o=new THREE.Mesh(g,m);o.position.set(x,y,z);parent.add(o);if(high)highOnly.push(o);return o;}
 function cyl(x,y,z,rt,rb,h,mat,segments=12,parent=root,high=false){const g=new THREE.CylinderGeometry(rt,rb,h,segments);return geomMesh(g,mat,x,y,z,parent,high);}
 function ring(x,y,z,r,t,mat,rot=[0,0,0],high=false){const g=new THREE.TorusGeometry(r,t,6,high?56:36);let m=geomMesh(g,mat,x,y,z,root,high);m.rotation.set(...rot);return m;}
 function line(a,b,r,mat,parent=root){const p1=new THREE.Vector3(...a),p2=new THREE.Vector3(...b),diff=p2.clone().sub(p1);let ob=geomMesh(new THREE.CylinderGeometry(r,r,diff.length(),6),mat,0,0,0,parent,true);ob.position.copy(p1).add(p2).multiplyScalar(.5);ob.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),diff.normalize());return ob;}
 function collision(x1,z1,x2,z2,minY=-3,maxY=16,tag='wall'){blockers.push({x1:Math.min(x1,x2),x2:Math.max(x1,x2),z1:Math.min(z1,z2),z2:Math.max(z1,z2),minY,maxY,tag});}
 function wallX(x1,x2,y,z,h=14,th=1.5,mat=MAT.stone){cube((x1+x2)/2,y,z,x2-x1,h,th,mat); collision(x1,z-th/2,x2,z+th/2,y-h/2,y+h/2);}
 function wallZ(x,y,z1,z2,h=14,th=1.5,mat=MAT.stone){cube(x,y,(z1+z2)/2,th,h,z2-z1,mat);collision(x-th/2,z1,x+th/2,z2,y-h/2,y+h/2);}
 function steps(zStart,zEnd,width,yStart,yEnd,n,mat=MAT.stone2){for(let i=0;i<n;i++){let f=(i+.5)/n,z=zStart+(zEnd-zStart)*f,y=yStart+(yEnd-yStart)*f;cube(0,y-.12,z,width,.24,Math.abs(zEnd-zStart)/n+.04,mat);cube(0,y+.015,z,width,.032,.12,MAT.gold,root,true);}}
 function pillar(x,z,height=15,base=2.1){
  cube(x,2.35,z,base+1,.7,base+1,MAT.obsidian);
  cube(x,2.9+height/2,z,base,height,base,MAT.stone2);
  cube(x,2.9+height-.2,z,base+1.5,1,base+1.5,MAT.gold);
  cube(x,2.9+height+1.1,z,base+2,.4,base+2,MAT.stone);
  for(let s of [-1,1])cube(x+s*(base/2+.04),2.9+height/2,z,.08,height*.86,.15,MAT.glow,root,true);
 }
 function arch(x,z,width,height=15,thick=1.4){
  cube(x-width/2,2+height/2,z,thick,height,2.5,MAT.stone2);
  cube(x+width/2,2+height/2,z,thick,height,2.5,MAT.stone2);
  cube(x,2+height-.3,z,width+thick,2.2,2.5,MAT.stone);
  cube(x,2+height+.7,z,width+3,.35,2.7,MAT.gold);
  for(let s of [-1,1])cube(x+s*width/2,2+height/2,z,thick+.16,height*.76,.1,MAT.gold,root,true);
 }
 function sigil(x,y,z,r=2,orientation='front',mat=MAT.glow){
  const g=new THREE.Group();g.position.set(x,y,z);root.add(g);if(orientation==='floor')g.rotation.x=-Math.PI/2;
  const outer=geomMesh(new THREE.TorusGeometry(r,.07,5,48),mat,0,0,0,g);
  geomMesh(new THREE.TorusGeometry(r*.68,.035,4,36),mat,0,0,0,g,true);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;cube(Math.cos(a)*r,Math.sin(a)*r,0,.24,.08,.15,mat,g,true).rotation.z=a;}
  for(let k=0;k<3;k++){let a=k*2*Math.PI/3;let b=(k+1)*2*Math.PI/3;line([Math.cos(a)*r*.63,Math.sin(a)*r*.63,0],[Math.cos(b)*r*.63,Math.sin(b)*r*.63,0],.035,mat,g);}
  return {group:g,outer};
 }
 function crystal(x,y,z,scale=1,mat=MAT.glow){
  let g=new THREE.OctahedronGeometry(scale,0),o=geomMesh(g,mat,x,y,z);o.rotation.y=Math.PI/4;return o;
 }
 function rail(x1,z1,x2,z2,y=3.45){
  const dx=x2-x1,dz=z2-z1,length=Math.hypot(dx,dz),n=Math.ceil(length/2.5);
  for(let i=0;i<=n;i++){let t=i/n;cube(x1+dx*t,y-.35,z1+dz*t,.22,1.45,.22,MAT.gold);}
  const mid=new THREE.Vector3((x1+x2)/2,y+.35,(z1+z2)/2);let beam=cube(mid.x,mid.y,mid.z,.18,.14,length,MAT.gold);beam.rotation.y=Math.atan2(dx,dz);
 }
 // Setting: tectonic platform, approaching the temple through a ruined causeway.
 cube(0,-.6,21,114,1.2,120,MAT.ground);
 for(let x of [-47,47])for(let z of [44,27,7,-18,-42]){
  cube(x,.1,z,10,1,13,MAT.stone);cyl(x,1.2,z,2.4,3.3,2,MAT.stone2,8);
  let ob=crystal(x,3.6,z,1.3,MAT.glow);dynamic.push({type:'float',ob,baseY:3.6,phase:x+z});
 }
 // Bridge and threshold: upward journey, without invisible barriers.
 cube(0,.15,47,15,.4,34,MAT.stone2);steps(39,30,16,.15,2,8);
 for(let x of [-8.9,8.9])for(let z=35;z<=56;z+=4){cube(x,.75,z,.45,1.5,.45,MAT.gold);}
 // Main temple foundations and floors.
 cube(0,1.25,-13,44,1.5,90,MAT.stone);
 cube(0,1.25,-60,15,1.5,7,MAT.stone2);
 cube(0,2.04,-13,41,.09,87,MAT.stone2);
 for(let z=25;z>=-55;z-=5){cube(0,2.11,z,38,.025,.09,MAT.gold,root,true);}
 for(let x of [-13,13])cube(x,2.15,-11,.11,.035,81,MAT.gold,root,true);
 // Exterior perimeter, broken silhouette and carved buttresses.
 for(let sx of [-22,22]){wallZ(sx,9,-56,-21.5,14,1.8);wallZ(sx,9,-14.5,29,14,1.8);}
 wallX(-22,-7,9,29,14); wallX(7,22,9,29,14);
 wallX(-22,22,9,-56,14);
 for(let x of [-21,21])for(let z of [25,9,-9,-27,-45]){
  cube(x,10,z,2.5,17,3,MAT.stone2);cube(x,18.5,z,3.6,.8,4.5,MAT.gold);
  for(let t=0;t<3;t++)cube(x,20+t*1.3,z,3.3-t*.6,1,3.5-t*.6,MAT.stone);
 }
 for(let z of [17,1,-15,-31,-47]){
  cube(-22,20,z,2.5,4,3,MAT.obsidian);cube(22,20,z,2.5,4,3,MAT.obsidian);
 }
 // Open roof with transverse arches; central nave gets spectacular vertical scale.
 for(let z of [22,7,-8,-23,-38,-52]){
  arch(0,z,26,17,1.9);
  cube(0,21.2,z,44,1.25,2.5,MAT.stone2);
  cube(0,22,z,43,.25,2.7,MAT.gold,root,true);
 }
 for(let x of [-18,18])for(let z of [17,3,-11,-25,-39])pillar(x,z,14,1.7);
 // Central hanging star mechanism, layered tilted rings under the open ceiling.
 const astrolabe=new THREE.Group();astrolabe.position.set(0,17,-14);root.add(astrolabe);
 let ar1=geomMesh(new THREE.TorusGeometry(5.1,.32,8,72),MAT.gold,0,0,0,astrolabe);ar1.rotation.x=.32;
 let ar2=geomMesh(new THREE.TorusGeometry(4.0,.18,8,64),MAT.glow,0,0,0,astrolabe);ar2.rotation.y=.5;
 let ar3=geomMesh(new THREE.TorusGeometry(2.75,.22,8,60),MAT.gold,0,0,0,astrolabe);ar3.rotation.x=Math.PI/2;
 geomMesh(new THREE.IcosahedronGeometry(1.6,1),MAT.glow,0,0,0,astrolabe);
 for(let x of [-3,3])for(let z of [-3,3])crystal(x,17,z-14,.42,MAT.glowGold);
 dynamic.push({type:'rotate',ob:astrolabe,speed:.09});dynamic.push({type:'rotate',ob:ar2,speed:-.25,axis:'z'});
 // High level gallery, viewed from the ground. Includes ramps to access balcony on two sides.
 for(let x of [-14.9,14.9]){
  cube(x,10.05,-12,4.2,.55,65,MAT.stone2);
  for(let z=-43;z<=17;z+=7)cube(x,10.45,z,4.5,.14,.17,MAT.gold,root,true);
  rail(x>0?12.55:-12.55,-44,x>0?12.55:-12.55,18,10.7);
 }
 // Access to east balcony by long gentle ramp inside hall (separate height zone).
 for(let i=0;i<20;i++){
  let t=(i+.5)/20,z=18-39*t,y=2+8*t;
  cube(9.25,y-.12,z,3.6,.24,2.05,MAT.stone2);
  cube(9.25,y+.04,z,3.4,.04,.09,MAT.gold,root,true);
 }
 // Side chambers built beyond original outer facade as embedded annexes.
 for(let s of [-1,1]){
  const cx=33*s;
  cube(cx,1.55,-18,20,1.1,29,MAT.stone);
  cube(cx,2.14,-18,18,.08,27,MAT.stone2);
  wallX(Math.min(cx-10,cx+10),Math.max(cx-10,cx+10),8,-32.5,12,1.5);
  wallX(Math.min(cx-10,cx+10),Math.max(cx-10,cx+10),8,-3.5,12,1.5);
  wallZ(s*43,8,-32.5,-3.5,12,1.5);
  // Open doorway across outer walls: 7m clearance at z=-18.
  arch(s*22,-18,7,11,1.1);
  for(let zz of [-27,-9]){
   pillar(s*37.7,zz,8,1.2);
  }
  for(let zz of [-29,-7])sigil(s*42.2,8,zz,1.4,'front',MAT.glowGold);
  cube(cx,4,-18,6,3.8,6,MAT.obsidian);
  cyl(cx,6.2,-18,3,3.5,.7,MAT.gold,12);
  const id=s<0?'west':'east';
  const o=crystal(cx,8,-18,1.55,MAT.inactive);dynamic.push({type:'float',ob:o,baseY:8,phase:s*2});
  sigil(cx,6.65,-18,2.2,'floor',MAT.glow);
  interactables.push({id,position:new THREE.Vector3(cx,3.2,-18),radius:5,label:s<0?'西の星印を起動':'東の星印を起動',crystal:o});
 }
 // Entrance monumental facade: pylons, horns, clockwork sun emblem.
 for(let x of [-18,18]){
  cube(x,12,30,9,24,8,MAT.obsidian);
  cube(x,23.8,30,10,.8,9,MAT.gold);
  for(let i=0;i<3;i++)cube(x,25+i*2.2,30,8-i*2,2,7-i*1.1,MAT.stone2);
  for(let j=0;j<6;j++)cube(x-3.1+j*1.2,13,25.9,.11,16,.1,j%2?MAT.gold:MAT.glow,root,true);
  sigil(x,15,25.8,3.25);
 }
 arch(0,29,14,20,2.1);
 cube(0,23.7,28.9,14,.8,4,MAT.gold);
 sigil(0,22.5,26.8,5.2);
 for(let x of [-6.1,6.1])for(let z of [30,22])cube(x,10.5,z,.15,15,.15,MAT.gold,root,true);
 // Huge central core in nave: third accessible puzzle switch.
 for(let x of [-7,7])for(let z of [-39,-43])cyl(x,2.6,z,1.3,1.6,1.1,MAT.obsidian,8);
 cyl(0,2.8,-41,5.3,6,1.4,MAT.obsidian,12);
 ring(0,3.54,-41,4.4,.13,MAT.glow,[Math.PI/2,0,0]);
 cyl(0,4.5,-41,2.6,3.3,2.4,MAT.stone2,12);
 const heart=crystal(0,7.3,-41,1.9,MAT.inactive);dynamic.push({type:'float',ob:heart,baseY:7.3,phase:1.5});
 for(let i=0;i<8;i++){let a=i*Math.PI/4;cyl(Math.cos(a)*4.7,4.2, -41+Math.sin(a)*4.7,.13,.13,1.8,MAT.gold,6);}
 interactables.push({id:'heart',position:new THREE.Vector3(0,3.4,-41),radius:7.2,label:'中央の星核を起動',crystal:heart});
 // Sealed divide. Gate is dynamic: independent collision tag.
 wallX(-22,-6,9,-56,14);wallX(6,22,9,-56,14);
 const gate=new THREE.Group();gate.position.set(0,2,-56);root.add(gate);
 cube(0,6,0,11.7,12,.8,MAT.obsidian,gate);for(let k=-4;k<=4;k++)cube(k*1.2,6,0,.12,11.3,.94,MAT.gold,gate);
 sigil(0,10,-55.32,3.1,'front',MAT.glowGold);
 collision(-6,-56.8,6,-55.2,0,14,'gate');
 // Subterranean sanctum beyond the gate, dramatic descent by raised terraced steps.
 cube(0,-5.8,-80,30,1.2,33,MAT.obsidian);
 for(let i=0;i<14;i++){
  let z=-63.3-i*.93,y=1.75-(i+1)*.5;
  cube(0,y-.1,z,15,.3,1.05,MAT.stone2);
  cube(0,y+.07,z,15,.035,.09,MAT.gold,root,true);
 }
 cube(0,-4.94,-81,28,.12,28,MAT.stone2);
 for(let x of [-15,15]){cube(x,4.4,-81,2,19,32,MAT.stone);for(let z of [-72,-80,-88])pillar(x*.85,z,11,1.3);}
 cube(0,5,-95,31,21,2,MAT.stone);collision(-15.5,-96,15.5,-94,-6,18);
 // Circular vault and suspended artifact.
 cyl(0,-4.55,-85,8.1,9.1,.95,MAT.obsidian,24);
 ring(0,-3.99,-85,7.4,.2,MAT.gold,[Math.PI/2,0,0]);
 const relic=new THREE.Group();relic.position.set(0,3.2,-85);root.add(relic);
 const relicCore=geomMesh(new THREE.DodecahedronGeometry(2.25,0),MAT.glow,0,0,0,relic);
 for(let i=0;i<3;i++){
  let r=geomMesh(new THREE.TorusGeometry(3.7+i*.55,.19,8,64),i%2?MAT.gold:MAT.glow,0,0,0,relic);
  r.rotation.set(i*.75,i*.55,0);
 }
 dynamic.push({type:'rotate',ob:relic,speed:.22});
 for(let i=0;i<12;i++){const a=i*Math.PI/6;const x=Math.cos(a)*9.7,z=-85+Math.sin(a)*9.7;cyl(x,-1.8,z,.65,1,6,MAT.stone2,8);crystal(x,2,z,.45,MAT.glowGold);}
 const archive=crystal(0,-1.9,-85,1.0,MAT.glowGold);interactables.push({id:'archive',position:new THREE.Vector3(0,-5,-85),radius:7,label:'星霊の記録を読み取る',crystal:archive});
 // floating dust motes, grouped small object count for high quality only.
 const dustGeo=new THREE.BufferGeometry(), pts=[],seed=(n)=>{let v=Math.sin(n*78.233)*43758.5453;return v-Math.floor(v);};
 for(let i=0;i<180;i++){pts.push((seed(i+4)-.5)*41,3+seed(i+12)*18, -52+seed(i+20)*85);}
 dustGeo.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));allGeo.add(dustGeo);
 const dustMat=new THREE.PointsMaterial({color:0x82cddd,size:.085,transparent:true,opacity:.5,depthWrite:false});allMat.add(dustMat);
 const dust=new THREE.Points(dustGeo,dustMat);root.add(dust);highOnly.push(dust);
 // Gate state + safe event emitter.
 function emit(type,detail={}){if(typeof options.onEvent==='function')options.onEvent({module:'No04',type,...detail});}
 function unlock(){if(flags.gate)return;flags.gate=true;gateOpen=true;emit('gateUnlocked',{flags:{...flags}});}
 function activate(id){
  if(!Object.prototype.hasOwnProperty.call(flags,id))return {ok:false,reason:'unknown'};
  if(id==='archive'&&!flags.gate)return {ok:false,reason:'locked'};
  if(flags[id])return {ok:false,reason:'alreadyActive'};
  flags[id]=true;
  let item=interactables.find(o=>o.id===id);if(item)item.crystal.material=MAT.glow;
  if(id==='archive')emit('archiveRead',{message:'THE SKY REMEMBERS WHAT THE EARTH HAS FORGOTTEN'});
  else emit('sealActivated',{id,flags:{...flags}});
  if(flags.west&&flags.east&&flags.heart)unlock();
  return {ok:true,id,flags:{...flags},message:id==='archive'?'記録を解読した':flags.gate?'三つの封印が共鳴し、奥の扉が開いた！':'星印が共鳴した'};
 }
 function nearest(position,radiusOverride){
  if(!position)return null;
  let p=new THREE.Vector3(position.x-root.position.x,position.y-root.position.y,position.z-root.position.z);
  let best=null,dist=Infinity;
  for(const it of interactables){if(it.id==='archive'&&!flags.gate)continue;if(flags[it.id])continue;
   let d=p.distanceTo(it.position);if(d<(radiusOverride||it.radius)&&d<dist){best=it;dist=d;}}
  return best?{id:best.id,label:best.label,distance:dist,position:best.position.clone().add(root.position)}:null;
 }
 function interact(worldPosition){const target=nearest(worldPosition);return target?activate(target.id):{ok:false,reason:'outOfRange'};}
 function local(x,z){return {x:x-root.position.x,z:z-root.position.z};}
 function getFloorHeight(x,z){const p=local(x,z);x=p.x;z=p.z;
  if(Math.abs(x)<8.1&&z<=39&&z>=30)return .15+(39-z)/9*1.85;
  if(Math.abs(x)<8&&z<=-62&&z>=-76.5)return 2-(Math.min(14,Math.floor((-62-z)/1.0)+1))*.5;
  if(z< -76.5&&z> -96&&Math.abs(x)<15)return -5;
  if(Math.abs(x-9.25)<1.8&&z<=18&&z>=-21)return 2+(18-z)/39*8;
  if(Math.abs(x)>12.8&&Math.abs(x)<17&&z<=18&&z>=-44)return 10.2;
  if(Math.abs(x)<=22&&z>=-62&&z<=30)return 2;
  if(Math.abs(Math.abs(x)-33)<10&&z>=-32.5&&z<=-3.5)return 2;
  if(Math.abs(x)<8&&z>=30&&z<=60)return z>39?.15:2;
  return 0;
 }
 function isBlocked(worldX,worldZ,worldY=2,radius=.48){let p=local(worldX,worldZ),x=p.x,z=p.z;
  // Remove only the doorway sections of shared side wall; leave rest as physics barrier.
  for(const b of blockers){
   if(b.tag==='gate'&&gateOpen)continue;
   if(worldY<b.minY-1||worldY>b.maxY+1)continue;
   if(x+radius>b.x1&&x-radius<b.x2&&z+radius>b.z1&&z-radius<b.z2)return true;
  }
  return false;
 }
 let interactionHeld=false;
 function update(dt=0,context={}){
  if(disposed)return;dt=Math.min(.075,Math.max(0,dt));elapsed+=dt;
  for(const it of dynamic){
   if(it.type==='float'){it.ob.position.y=it.baseY+Math.sin(elapsed*1.25+it.phase)*.25;it.ob.rotation.y+=dt*.17;}
   else if(it.type==='rotate')it.ob.rotation[it.axis||'y']+=dt*it.speed;
  }
  const targetY=flags.gate?-10:0;gate.position.y+=(targetY-gate.position.y+2)*Math.min(1,dt*1.9);
  if(context&&(context.interactionPressed===true||(context.interact===true&&!interactionHeld))){if(context.playerPosition)interact(context.playerPosition);}
  interactionHeld=Boolean(context&&context.interact);
 }
 function setQuality(mode){quality=mode==='low'?'low':'high';const high=quality==='high';for(let m of highOnly)m.visible=high;
  dust.visible=high;MAT.glow.emissiveIntensity=high?1.35:.85;MAT.glowGold.emissiveIntensity=high?1.1:.7;
  return quality;
 }
 function dispose(){if(disposed)return;disposed=true;for(let g of allGeo)g.dispose();for(let m of allMat)m.dispose();root.clear();blockers.length=0;interactables.length=0;dynamic.length=0;}
 const module={root,update,setQuality,dispose,interact,nearest,getFloorHeight,isBlocked,
  getSpawnPoint:()=>new THREE.Vector3(root.position.x,1.8+root.position.y,54+root.position.z),
  getState:()=>({...flags}),getInteractables:()=>interactables.map(o=>({id:o.id,label:o.label,position:o.position.clone().add(root.position),activated:flags[o.id]})),
  metadata:{id:'AF04',name:'ASTRAEUM / 星環神殿',version:'1.0.0',coordinateSystem:'Y-up,-Z-forward,meters',bounds:{min:[-49,-7,-97],max:[49,31,60]},qualityModes:['low','high']}
 };
 setQuality(options.quality||'high');return module;
}
global.createAetherModule=createAetherModule;
if(typeof module!=='undefined'&&module.exports)module.exports={createAetherModule};
})(typeof globalThis!=='undefined'?globalThis:this);
