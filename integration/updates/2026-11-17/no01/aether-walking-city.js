/**
 * AETHER FRONTIER / Team No.01 - Pedestrian City Expansion v1.1
 * Additive module to original city. Three.js 0.160.0. Y-up, forward -Z, meters.
 * The original tower, roads, spawn, sigils and ship berth are NOT modified.
 */

export const NO01_WALKING_VERSION = '1.1.0';

export const NO01_ROUTES = Object.freeze([
  { id:'terrace', name:'暁光の段丘', color:0xffcc8a, width:6.6,
    path:[[30,.68,27],[43,1.75,27],[49,3.05,35],[60,4.55,35],[65,6.05,28],[77,7.35,28],[83,8.55,37]],
    deck:{x:85,y:8.55,z:38,w:18,d:18}, interaction:{id:'no01-terrace',x:85,y:8.55,z:38,label:'暁光の段丘・星図を調べる'} },
  { id:'skybridge', name:'鏡界の空中橋', color:0x80edfa, width:5.8,
    path:[[-35,.68,22],[-47,1.65,22],[-58,2.95,22],[-66,4.45,25],[-90,4.45,42]],
    deck:{x:-96,y:4.45,z:46,w:16,d:16}, interaction:{id:'no01-skybridge',x:-96,y:4.45,z:46,label:'鏡界の橋・都市監視記録を調べる'} },
  { id:'backlane', name:'封印された裏道', color:0xd3adf7, width:5.2,
    path:[[-37,.68,-49],[-47,.68,-58],[-48,.68,-78],[-64,.68,-88],[-73,1.50,-88],[-85,2.45,-88]],
    deck:{x:-90,y:2.45,z:-88,w:10,d:10}, interaction:{id:'no01-backlane',x:-90,y:2.45,z:-88,label:'封印の裏道・古い巡回記録を調べる'} }
]);

// Standalone independent module, so No.00 can add it to an existing team-01 city.
export function createAetherModule(THREE, options={}) {
  if(!THREE?.Group || !THREE?.InstancedMesh || !THREE?.BoxGeometry)
    throw new Error('No.01 Walking City requires a Three.js 0.160.0 namespace.');

  const root=new THREE.Group(); root.name='AF01_WALKABLE_CITY_EXPANSION';
  const lite=new THREE.Group();lite.name='walking_lite';root.add(lite);
  const high=new THREE.Group();high.name='walking_high';root.add(high);
  const anim=new THREE.Group();anim.name='walking_animated';root.add(anim);
  const mats={
    dark:new THREE.MeshStandardMaterial({color:0x142d3b,roughness:.76,metalness:.33}),
    stone:new THREE.MeshStandardMaterial({color:0x365768,roughness:.69,metalness:.37}),
    stoneLight:new THREE.MeshStandardMaterial({color:0x698896,roughness:.58,metalness:.48}),
    bronze:new THREE.MeshStandardMaterial({color:0xbd9764,roughness:.38,metalness:.72}),
    cyan:new THREE.MeshBasicMaterial({color:0x62f5ee,toneMapped:false}),
    gold:new THREE.MeshBasicMaterial({color:0xffca86,toneMapped:false}),
    amethyst:new THREE.MeshBasicMaterial({color:0xcda9ff,toneMapped:false}),
    glass:new THREE.MeshStandardMaterial({color:0x2b6379,metalness:.6,roughness:.25,transparent:true,opacity:.8,depthWrite:false}),
  };
  const geos=new Set(), disposables=new Set(), floaters=[], movingRings=[],solidBoxes=[], segmentSurfaces=[], deckSurfaces=[];
  const batch=new Map();
  const boxUnit=new THREE.BoxGeometry(1,1,1),cylUnit=new THREE.CylinderGeometry(1,1,1,8);
  geos.add(boxUnit);geos.add(cylUnit);
  const PI=Math.PI,TAU=PI*2;
  let elapsed=0,quality='lite',disposed=false,lodFar=false;
  const discovered=new Set();
  const use=(geometry)=>{geos.add(geometry);return geometry;};
  const put=(holder,name,geometry,material,x=0,y=0,z=0)=>{
    const obj=new THREE.Mesh(geometry,material);obj.name=name;obj.position.set(x,y,z);holder.add(obj);return obj;
  };
  const collect=(group,material,geometry,center,scale,quaternion)=>{
    const key=(group===lite?'L':'H')+'|'+Object.entries(mats).find(([k,v])=>v===material)?.[0]+'|'+(geometry===boxUnit?'box':'cyl');
    if(!batch.has(key))batch.set(key,{group,material,geometry,items:[]});
    batch.get(key).items.push({center,scale,quaternion});
  };
  const eulerQuat=(rx=0,ry=0,rz=0)=>new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz,'YXZ'));
  const cube=(group,material,x,y,z,w,h,d,ry=0,rx=0,rz=0)=>{
    collect(group,material,boxUnit,[x,y,z],[w,h,d],eulerQuat(rx,ry,rz));
  };
  const rod=(group,material,a,b,r=.18)=>{
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),dir=end.clone().sub(start);
    if(dir.length()<.001)return;
    collect(group,material,cylUnit,start.add(end).multiplyScalar(.5).toArray(),[r,dir.length(),r],
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize()));
  };
  const standingColliders=(x,z,w,d,yMin,yMax,ry=0)=>solidBoxes.push({x,z,w,d,yMin,yMax,ry});
  const shortBox=(route,a,b,width)=>{
    const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2];
    const flat=Math.hypot(dx,dz),len=Math.hypot(flat,dy),yaw=Math.atan2(dx,dz);
    const tilt=-Math.atan2(dy,flat);
    const midX=(a[0]+b[0])/2,midZ=(a[2]+b[2])/2,midY=(a[1]+b[1])/2;
    // Slab's upper surface follows the mathematical walking surface closely.
    cube(lite,mats.stone,midX,midY-.23,midZ,width,.46,len,yaw,tilt);
    cube(high,mats.bronze,midX,midY+.032,midZ,.10,.035,len-.35,yaw,tilt);
    const nx=dz/flat,nz=-dx/flat;
    for(const s of [-1,1]) {
      const sideX=nx*s*(width*.5-.18),sideZ=nz*s*(width*.5-.18);
      cube(lite,mats.bronze,midX+sideX,midY+.13,midZ+sideZ,.20,.36,len-.20,yaw,tilt);
      // Rail top follows the slope; posts never obstruct the central walkway.
      rod(lite,mats.stoneLight,[a[0]+sideX,a[1]+1.22,a[2]+sideZ],
        [b[0]+sideX,b[1]+1.22,b[2]+sideZ],.085);
      for(let t of [.06,.36,.66,.94]){
        const x=a[0]+dx*t+sideX,z=a[2]+dz*t+sideZ,y=a[1]+dy*t;
        cube(high,mats.gold,x,y+.67,z,.16,1.18,.16);
      }
    }
    segmentSurfaces.push({id:route.id,a:[a[0],a[2]],b:[b[0],b[2]],ay:a[1],by:b[1],width});
    // Thickening and ribs under elevated walkways are silhouette details.
    if(midY>1.2){
      cube(lite,mats.dark,midX,midY-.60,midZ,width*.73,.30,len-.1,yaw,tilt);
      rod(high,mats.bronze,[a[0]+nx*width*.35,a[1]-.45,a[2]+nz*width*.35],
        [b[0]+nx*width*.35,b[1]-.45,b[2]+nz*width*.35],.13);
    }
  };
  const deck=(route)=>{
    const d=route.deck;
    cube(lite,mats.dark,d.x,d.y-.58,d.z,d.w+1,1.15,d.d+1);
    cube(lite,mats.stone,d.x,d.y-.115,d.z,d.w,.23,d.d);
    cube(high,mats.bronze,d.x,d.y+.025,d.z,d.w-.5,.035,d.d-.5);
    deckSurfaces.push({...d,id:route.id});
    const isBack=route.id==='backlane';
    // Rails on three exposed sides; the route arrival side intentionally stays open.
    const edges= route.id==='terrace' ? ['E','N','S'] : route.id==='skybridge'?['W','N','S']:['W','N','S'];
    for(const edge of edges){
      if(edge==='E'||edge==='W') {
        const px=d.x+(edge==='E'?d.w/2-.18:-d.w/2+.18);
        rod(lite,mats.bronze,[px,d.y+1.30,d.z-d.d/2],[px,d.y+1.30,d.z+d.d/2],.10);
        for(let i=0;i<5;i++)cube(high,mats.stoneLight,px,d.y+.65,d.z-d.d/2+i*d.d/4,.23,1.25,.23);
      } else {
        const pz=d.z+(edge==='S'?d.d/2-.18:-d.d/2+.18);
        rod(lite,mats.bronze,[d.x-d.w/2,d.y+1.30,pz],[d.x+d.w/2,d.y+1.30,pz],.10);
        for(let i=0;i<5;i++)cube(high,mats.stoneLight,d.x-d.w/2+i*d.w/4,d.y+.65,pz,.23,1.25,.23);
      }
    }
    // Free space on deck center for readable interaction and 360 degree look-around.
    const floorMark=put(lite,'deck_glowing_wayfinder_'+route.id,
      use(new THREE.TorusGeometry(isBack?2.1:3.2,.075,5,48)),route.id==='terrace'?mats.gold:route.id==='skybridge'?mats.cyan:mats.amethyst,
      d.x,d.y+.07,d.z);
    floorMark.rotation.x=PI/2;
    cube(high,mats.dark,d.x,d.y-.7,d.z,d.w*.78,.17,d.d*.77);
  };

  for(const route of NO01_ROUTES){
    for(let i=0;i<route.path.length-1;i++) shortBox(route,route.path[i],route.path[i+1],route.width);
    deck(route);
  }
  // TERRACE: stepped sky garden with layered sail fins, reachable by switchback.
  for(let i=0;i<7;i++){
    const x=97.4+(i%2)*1.4,z=22+i*4.6,h=11+(i%3)*4;
    cube(lite,mats.dark,x,h*.5,z,1.85,h,2.8,.21);
    cube(lite,mats.gold,x,h,z,1.5,.65,2.1,.21);
    rod(high,mats.cyan,[x,h+1,z],[x,h+7+(i%2)*3,z],.11);
    standingColliders(x,z,2.25,3.5,0,h+.8,.21);
  }
  const terraceWing=put(lite,'terrace_asymmetric_aether_sail',use(new THREE.ConeGeometry(6.5,19,4)),mats.stoneLight,98,19,37);
  terraceWing.rotation.y=PI/4;
  const terraceFrame=put(lite,'terrace_aurora_halo',use(new THREE.TorusGeometry(9,.46,8,64)),mats.gold,98,22,37);
  terraceFrame.rotation.y=.35;
  movingRings.push({mesh:terraceFrame,speed:.07});
  // BRIDGE: paired landmark pillars, suspended strands, open underpass.
  for(const [x,z,h] of [[-64,24,20],[-100,45,24]]){
    const side=z<30?-5:9;
    cube(lite,mats.dark,x,h*.5,z+side,3.4,h,3.4);
    cube(lite,mats.stoneLight,x,h,z+side,4.6,1.4,4.6);
    cube(high,mats.cyan,x,h+1.05,z+side,2.4,.20,2.4);
    standingColliders(x,z+side,4.3,4.3,0,h+1);
  }
  rod(lite,mats.gold,[-66,20,18],[-93,25,50],.16);
  rod(lite,mats.cyan,[-67,15,18],[-93,18,50],.09);
  const bridgeHalo=put(lite,'mirror_bridge_floating_aperture',use(new THREE.TorusGeometry(5.2,.31,7,48)),mats.cyan,-96,16,46);
  bridgeHalo.rotation.y=PI*.14;
  movingRings.push({mesh:bridgeHalo,speed:-.12});
  // BACKLANE: narrow corner alley walls with real openings at every bend.
  const lane=NO01_ROUTES[2];
  for(let i=0;i<lane.path.length-1;i++){
    const a=lane.path[i],b=lane.path[i+1],dx=b[0]-a[0],dz=b[2]-a[2],len=Math.hypot(dx,dz),
          nx=dz/len,nz=-dx/len,yaw=Math.atan2(dx,dz),t=.50;
    // Short wall units deliberately leave open junctions at each corner.
    for(const sign of [-1,1]){
      const x=(a[0]+b[0])/2+nx*sign*4.6,z=(a[2]+b[2])/2+nz*sign*4.6;
      const ht=5.5+(i%3)*1.5;
      cube(lite,mats.dark,x,ht*.5,z,1.35,ht,len*.65,yaw);
      cube(high,mats.stoneLight,x,ht,z,1.5,.45,len*.65,yaw);
      for(let j=0;j<3;j++)cube(high,mats.amethyst,x,1.5+j*1.18,z,.055,.11,Math.max(2,len*.45),yaw);
      standingColliders(x,z,1.4,len*.65,0,ht,yaw);
    }
  }
  // Portal placed beyond the last landing, not inside the alley or walkable deck.
  for(const x of [-98,-83]){
    cube(lite,mats.stone,x,8,-96,2.6,16,2.6);
    cube(high,mats.amethyst,x,15.8,-96,.3,.3,2.7);
    standingColliders(x,-96,2.6,2.6,0,16);
  }
  rod(lite,mats.bronze,[-98,15.5,-96],[-83,15.5,-96],.46);
  const portal=put(lite,'sealed_alley_suspended_core',use(new THREE.OctahedronGeometry(2.6)),mats.amethyst,-90.5,11.2,-96);
  floaters.push({mesh:portal,y:11.2,phase:2.4,amp:.45});

  // Low-poly road lamps and high quality mosaic details, all instanced.
  const ornaments=[
    [36,23],[58,40],[83,25],[-40,18],[-74,30],[-90,54],[-35,-55],[-59,-94],[-91,-76]
  ];
  for(const [x,z] of ornaments){
    cube(lite,mats.bronze,x,3,z,.24,6,.24);
    cube(lite,mats.cyan,x,6.15,z,.85,.45,.85);
    cube(high,mats.gold,x,6.55,z,1.35,.12,1.35);
  }
  for(const route of NO01_ROUTES){
    const d=route.deck;
    const N=route.id==='terrace'?38:22;
    for(let i=0;i<N;i++){
      const a=TAU*i/N,r=Math.min(d.w,d.d)*.31;
      cube(high,i%3?mats.gold:mats.cyan,d.x+Math.sin(a)*r,d.y+.06,d.z+Math.cos(a)*r,.18,.03,.62,a);
    }
  }
  // Instancing: sharing box/cylinder geometry, grouped by both material and LOD.
  const temp=new THREE.Object3D();
  for(const [key,group] of batch){
    const n=group.items.length;
    if(!n)continue;
    const obj=new THREE.InstancedMesh(group.geometry,group.material,n);
    obj.name='instanced_'+key;
    group.items.forEach((item,i)=>{
      temp.position.set(...item.center);temp.scale.set(...item.scale);temp.quaternion.copy(item.quaternion);
      temp.updateMatrix();obj.setMatrixAt(i,temp.matrix);
    });
    obj.instanceMatrix.needsUpdate=true;
    obj.computeBoundingSphere();obj.frustumCulled=true;
    group.group.add(obj);
  }

  // Navigation surfaces are mathematically identical to the visual ramps/decks.
  function atSurface(x,z,currentY=0.42,allowHigh=false){
    if(!Number.isFinite(x)||!Number.isFinite(z))return null;
    const stepY=Number.isFinite(currentY)?currentY:.42;
    let best=null;
    for(const seg of segmentSurfaces){
      const dx=seg.b[0]-seg.a[0],dz=seg.b[1]-seg.a[1],lenSq=dx*dx+dz*dz;
      const t=Math.max(0,Math.min(1,((x-seg.a[0])*dx+(z-seg.a[1])*dz)/lenSq));
      const cx=seg.a[0]+dx*t,cz=seg.a[1]+dz*t,dist=Math.hypot(x-cx,z-cz);
      if(dist>seg.width*.5-.13)continue;
      const floorY=seg.ay+(seg.by-seg.ay)*t;
      if(!allowHigh && floorY>stepY+1.12)continue;
      if(!best || floorY>best.height)best={id:seg.id,height:floorY,kind:'ramp',distance:dist};
    }
    for(const d of deckSurfaces){
      if(Math.abs(x-d.x)>d.w*.5-.15||Math.abs(z-d.z)>d.d*.5-.15)continue;
      if(!allowHigh && d.y>stepY+1.12)continue;
      if(!best || d.y>best.height)best={id:d.id,height:d.y,kind:'deck',distance:0};
    }
    return best;
  }
  function getFloorHeight(x,z,currentY=.42){return atSurface(x,z,currentY)?.height??-Infinity;}
  function blocked(x,z,currentY=.42,radius=.52){
    for(const b of solidBoxes){
      if(currentY>b.yMax+.2||currentY+1.6<b.yMin)continue;
      const co=Math.cos(b.ry),si=Math.sin(b.ry),dx=x-b.x,dz=z-b.z;
      // Inverse of yaw rotation for x/z local coordinates.
      const lx=co*dx-si*dz,lz=si*dx+co*dz;
      if(Math.abs(lx)<b.w*.5+radius && Math.abs(lz)<b.d*.5+radius)return true;
    }
    return false;
  }
  function resolveHorizontal(x,z,previousX=x,previousZ=z,currentY=.42){
    if(!Number.isFinite(x)||!Number.isFinite(z))return {x:previousX,z:previousZ};
    if(blocked(x,z,currentY))return {x:previousX,z:previousZ};
    const before=atSurface(previousX,previousZ,currentY);
    const after=atSurface(x,z,currentY);
    // A raised walkway has edge rails. A legitimate adjacent deck/route remains open.
    if(before && before.height>1.5 && Math.abs(before.height-currentY)<2.4 && !after)
      return {x:previousX,z:previousZ};
    return {x,z};
  }
  const items=NO01_ROUTES.map(route=>({...route.interaction,type:'lore',state:'ready'}));
  function getNearbyInteraction(position,range=5.6){
    if(!position)return null;
    let selected=null,best=Infinity;
    for(const a of items){
      const dx=a.x-position.x,dz=a.z-position.z,dy=Math.abs(a.y-position.y),dist=Math.hypot(dx,dz);
      if(dist<range && dist<best && dy<3.2){selected=a;best=dist;}
    }
    return selected?{...selected,position:{x:selected.x,y:selected.y,z:selected.z},distance:best}:null;
  }
  const lore={
    'no01-terrace':'暁光の段丘：かつて整備士たちはこの空中庭園から、朝日を受ける塔冠の共振を観測した。',
    'no01-skybridge':'鏡界の空中橋：橋の下を抜ける通路は、旧文明の点検路。上からは都市の4つの方角が見渡せる。',
    'no01-backlane':'封印された裏道：巡回記録を発見。都市の裏側には、塔の地下に続く古い保守通路が眠るという。'
  };
  function interact(id){
    if(!Object.hasOwn(lore,id))return {ok:false,message:'不明な徒歩探索イベント'};
    const first=!discovered.has(id);discovered.add(id);
    return {ok:true,changed:first,type:'lore',id,message:lore[id],discovered:discovered.size};
  }
  function getPointsOfInterest(){
    return items.map(o=>({id:o.id,name:o.label,x:o.x,y:o.y,z:o.z,type:'walking-spot'}));
  }
  function getNavigationData(){
    return {version:NO01_WALKING_VERSION,
      ramps:segmentSurfaces.map(s=>({id:s.id,a:[...s.a],b:[...s.b],ay:s.ay,by:s.by,width:s.width})),
      decks:deckSurfaces.map(d=>({...d})),
      solidBoxes:solidBoxes.map(b=>({...b})),
      reservedCorridors:[{axis:'z',halfWidth:12,zMin:-134,zMax:134},{axis:'x',halfWidth:12,xMin:-134,xMax:134}],
    };
  }
  function getState(){return {quality,lod:lodFar?'far':'near',area:'AETHER CROWN - Pedestrian Expansion',discovered:[...discovered],spotsTotal:3};}
  function setQuality(mode){
    if(disposed)return quality;
    quality=mode==='high'?'high':'lite';high.visible=quality==='high'&&!lodFar;return quality;
  }
  function update(dt,context={}){
    if(disposed)return;
    const d=Math.max(0,Math.min(Number.isFinite(dt)?dt:0,.06)); elapsed+=d;
    const viewer=context.cameraPosition||context.playerPosition;
    if(viewer && Number.isFinite(viewer.x) && Number.isFinite(viewer.y) && Number.isFinite(viewer.z)){
      const distance=Math.hypot(viewer.x,viewer.z,Math.max(0,viewer.y-50));
      if(distance>230)lodFar=true;else if(distance<190)lodFar=false;
      high.visible=quality==='high'&&!lodFar;
    }
    for(const ring of movingRings)ring.mesh.rotation.y+=ring.speed*d;
    for(const f of floaters){f.mesh.position.y=f.y+Math.sin(elapsed*1.2+f.phase)*f.amp;f.mesh.rotation.y+=d*.2;}
    if(context && context.progress?.no01Walking && Array.isArray(context.progress.no01Walking)){
      for(const id of context.progress.no01Walking)if(Object.hasOwn(lore,id))discovered.add(id);
    }
  }
  function setProgress(progress){
    discovered.clear();
    if(Array.isArray(progress))for(const id of progress)if(Object.hasOwn(lore,id))discovered.add(id);
    return getState();
  }
  function dispose(){
    if(disposed)return;disposed=true;
    for(const g of geos)g.dispose();
    for(const m of Object.values(mats))m.dispose();
    for(const o of [terraceWing,terraceFrame,bridgeHalo,portal])if(o.geometry)disposables.add(o.geometry);
    for(const t of disposables)t.dispose?.();
    root.parent?.remove(root);root.clear();
  }
  setQuality(options.quality||'lite');
  root.userData.moduleId='AETHER_FRONTIER_TEAM_01_WALKING_V1_1';
  root.userData.coordinateSystem='Y_UP_FORWARD_NEGATIVE_Z_METERS';
  return {root,update,setQuality,dispose,getFloorHeight,resolveHorizontal,
    getNearbyInteraction,interact,getState,getPointsOfInterest,getNavigationData,setProgress};
}

// Wrap an *existing* city without altering its original source. Works with the
// city facade used by playtest/work20, provided world.ground/resolve use it.
export function enhanceCity(THREE, core, options={}){
  if(!core?.root || typeof core.getFloorHeight!=='function' || typeof core.resolveHorizontal!=='function')
    throw new Error('enhanceCity requires the original Team 01 city module.');
  const walking=createAetherModule(THREE,options);
  core.root.add(walking.root);
  const facade={...core,root:core.root,walking};
  facade.update=(dt,context={})=>{core.update(dt,context);walking.update(dt,context);};
  facade.setQuality=(mode)=>{const q=core.setQuality(mode);walking.setQuality(q);return q;};
  facade.getFloorHeight=(x,z,currentY=.42)=>Math.max(core.getFloorHeight(x,z,currentY),walking.getFloorHeight(x,z,currentY));
  facade.resolveHorizontal=(x,z,px=x,pz=z,y=.42)=>{
    const original=core.resolveHorizontal(x,z,px,pz,y);
    return walking.resolveHorizontal(original.x,original.z,px,pz,y);
  };
  facade.getNearbyInteraction=(p,r=5)=>{
    const a=core.getNearbyInteraction(p,r),b=walking.getNearbyInteraction(p,r);
    if(!a)return b;if(!b)return a;
    return b.distance<a.distance?b:a;
  };
  facade.interact=(id)=> id.startsWith('no01-') ? walking.interact(id) : core.interact(id);
  facade.getState=()=>({...core.getState(),walking:walking.getState()});
  facade.getPointsOfInterest=()=>[...core.getPointsOfInterest(),...walking.getPointsOfInterest()];
  facade.dispose=()=>{walking.dispose();core.dispose();};
  facade.getWalkingNavigation=walking.getNavigationData;
  return facade;
}
