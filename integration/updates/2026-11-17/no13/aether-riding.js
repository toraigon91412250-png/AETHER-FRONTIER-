/**
 * AETHER FRONTIER No.13 / VHALKOR Rider Flight Extension v1.1.0
 * Adapter for the ORIGINAL createAetherModule(THREE,{...}) dragon.
 * Does not create a renderer, camera, scene, DOM, listeners, or combat logic.
 * Three r160; +Y up, local -Z forward, 1 unit = 1 metre.
 */
export function createAetherRidingModule(THREE, dragon, options = {}) {
  if (!THREE?.Group || !THREE.Vector3 || !dragon?.root || !dragon?.anchors || !dragon?.update)
    throw new Error('createAetherRidingModule requires Three.js and an original VHALKOR module');
  if (dragon.metadata?.id !== 'AF13-VHALKOR') throw new Error('Wrong dragon model: expected AF13-VHALKOR');
  const clamp = (v,lo,hi)=>Math.max(lo,Math.min(hi,Number.isFinite(v)?v:0));
  const mix = (a,b,t)=>a+(b-a)*t;
  const smooth = x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
  const damping=(current,target,sharpness,dt)=>mix(current,target,1-Math.exp(-sharpness*dt));
  const groundHeight = typeof options.groundHeight === 'function' ? options.groundHeight : ()=>0;
  const groundAt = (x,z)=>{const g=groundHeight(x,z);return Number.isFinite(g)?g:0;};
  const maxHeight = Math.max(24,options.maxAltitude ?? 300);
  const baseSpeed = options.cruiseSpeed ?? 36;
  const boostSpeed = options.boostSpeed ?? 56;
  const initialYaw=Number.isFinite(options.initialYaw)?options.initialYaw:dragon.root.rotation.y;
  dragon.root.rotation.order='YXZ';dragon.root.rotation.y=initialYaw;

  // All saddle visual geometry is owned by this extension, never by the original dragon.
  const ownedGeo = new Set(), ownedMat = new Set();
  const mat=(c,metal=.72,rough=.34,glow=0,intensity=0,extra={})=>{
    const m=new THREE.MeshStandardMaterial({color:c,metalness:metal,roughness:rough,emissive:glow,emissiveIntensity:intensity,...extra});ownedMat.add(m);return m;
  };
  const MATERIAL={
    dark:mat(0x182436,.79,.39), alloy:mat(0x405873,.82,.28), silver:mat(0xb3d3dc,.76,.23),
    gold:mat(0xd4a66a,.8,.27), glow:mat(0x6cf0ff,.24,.23,0x21cfe6,1.5),
    pilot:mat(0x193b54,.57,.39), pilotPlate:mat(0x6f96a9,.78,.28),
    visor:mat(0x86edfc,.24,.18,0x12b9f1,2.1), fabric:mat(0x0e192c,.25,.85),
  };
  const sharedBox=new THREE.BoxGeometry(1,1,1),sharedSphere=new THREE.SphereGeometry(1,10,7),sharedOct=new THREE.OctahedronGeometry(1,0);
  [sharedBox,sharedSphere,sharedOct].forEach(g=>ownedGeo.add(g));
  function addMesh(parent,geo,m,p=[0,0,0],s=[1,1,1],name=''){
    ownedGeo.add(geo);const o=new THREE.Mesh(geo,m);o.position.set(...p);o.scale.set(...s);o.name=name;
    o.castShadow=false;o.receiveShadow=false;parent.add(o);return o;
  }
  function bar(parent,a,b,r,m,name='',sides=6){
    const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),delta=vb.clone().sub(va);
    const g=new THREE.CylinderGeometry(r*.75,r,delta.length(),sides,1);const ob=addMesh(parent,g,m);
    ob.name=name;ob.position.copy(va).add(vb).multiplyScalar(.5);ob.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return ob;
  }
  function ell(parent,p,s,m,name=''){return addMesh(parent,sharedSphere,m,p,s,name);}
  const mountSystem = new THREE.Group();mountSystem.name='AF13_RiderEquipment';dragon.root.add(mountSystem);
  mountSystem.visible=!!options.unlocked;
  const cradle=new THREE.Group();cradle.position.set(0,11.65,-.55);cradle.name='ArcaneFlightCradle';mountSystem.add(cradle);
  // The saddle floats just above the original dorsal fins, preserving the legacy silhouette.
  ell(cradle,[0,.02,0],[1.08,.24,1.25],MATERIAL.dark,'IntegratedSaddleShell');
  addMesh(cradle,sharedBox,MATERIAL.alloy,[0,.26,-.10],[.90,.32,1.56],'SeatArmoredDeck');
  addMesh(cradle,sharedBox,MATERIAL.fabric,[0,.49,-.05],[.77,.14,1.06],'Seat');
  addMesh(cradle,sharedBox,MATERIAL.silver,[0,.79,.51],[.88,.82,.21],'RearImpactFrame');
  for(const s of [-1,1]){
    bar(cradle,[s*.58,-.45,-1.10],[s*.98,.34,-.68],.12,MATERIAL.gold,'SaddleStructuralPylon');
    bar(cradle,[s*.97,.34,-.68],[s*1.21,.69,.27],.105,MATERIAL.alloy,'LateralHarness');
    bar(cradle,[s*.68,.58,-.58],[s*.80,.75,-1.35],.075,MATERIAL.silver,'FlightGrip');
    ell(cradle,[s*.90,.70,-1.30],[.17,.13,.18],MATERIAL.glow,'ManualControlRune');
    ell(cradle,[s*1.14,.48,.70],[.19,.18,.30],MATERIAL.gold,'HarnessJoint');
    bar(cradle,[s*.98,-.20,.65],[s*.70,-1.32,1.08],.08,MATERIAL.dark,'RidingFootBrace');
  }
  const crest=new THREE.Group();crest.position.set(0,.45,-1.55);cradle.add(crest);
  addMesh(crest,new THREE.TorusGeometry(.55,.05,6,32,Math.PI*1.2),MATERIAL.gold,[0,.34,0],[1,1,1],'ArcaneHarnessCrest').rotation.z=Math.PI*.9;
  addMesh(crest,sharedOct,MATERIAL.glow,[0,.62,0],[.19,.34,.13],'FlightSoulPrism');
  const mountAnchor=new THREE.Group();mountAnchor.name='AF13_MOUNT_ANCHOR';
  mountAnchor.position.set(0,12.25,-.74);dragon.root.add(mountAnchor);
  // Riding-only aerodynamic finlets articulate with wing sweep; original wing meshes remain untouched.
  const wingFins=[];
  for(const [side,wing] of [[-1,dragon.anchors.wingLeft],[1,dragon.anchors.wingRight]]){
    for(let i=0;i<2;i++){
      const fin=new THREE.Group();fin.name='ArcaneWingTrim_'+side+'_'+i;
      fin.position.set(side*(i?17.10:13.65),i?.30:-.55,i?-1.8:6.7);wing.add(fin);
      const verts=new Float32Array([0,0,0,side*2.05,.34,i?-.4:.5,side*1.12,-.36,2.03]);
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.computeVertexNormals();
      const bladeMat=mat(i?0x4e8eae:0x9aadb0,.55,.29,i?0x1ca0c7:0x093f5e,i?.6:.2,{side:THREE.DoubleSide});
      addMesh(fin,geo,bladeMat,[0,0,0],[1,1,1],'DynamicFlightFin');
      bar(fin,[0,0,0],[side*1.95,.26,.5],.06,MATERIAL.gold,'FinControlSpar');
      wingFins.push({group:fin,side,index:i});fin.visible=!!options.unlocked;
    }
  }

  // Mount and character motion are separate from the boss model and from player gameplay.
  const riderPose=new THREE.Group();riderPose.name='AF13_RIDER_POSE';dragon.root.add(riderPose);
  const dummyRider = new THREE.Group();dummyRider.name='StandaloneRiderPreview';riderPose.add(dummyRider);
  dummyRider.visible=options.showPreviewRider===true;
  const pelvis=new THREE.Group();dummyRider.add(pelvis);
  ell(pelvis,[0,.89,0],[.35,.28,.28],MATERIAL.pilotPlate,'PilotHipArmor');
  ell(pelvis,[0,1.31,-.01],[.42,.49,.25],MATERIAL.pilot,'PilotTorso');
  addMesh(pelvis,sharedBox,MATERIAL.pilotPlate,[0,1.44,-.24],[.73,.48,.13],'PilotChestPlate');
  ell(pelvis,[0,1.86,-.02],[.27,.27,.26],MATERIAL.silver,'PilotHelmet');
  ell(pelvis,[0,1.89,-.22],[.24,.13,.075],MATERIAL.visor,'PilotAetherVisor');
  const arms=[], knees=[];
  for(const s of [-1,1]){
    const arm=new THREE.Group();arm.position.set(s*.44,1.53,0);pelvis.add(arm);arms.push({g:arm,s});
    ell(arm,[s*.07,-.17,.04],[.17,.28,.16],MATERIAL.pilotPlate,'ShoulderActuator');
    bar(arm,[s*.08,-.22,.02],[s*.27,-.62,-.25],.105,MATERIAL.pilot,'Forearm');
    ell(arm,[s*.27,-.66,-.30],[.13,.15,.12],MATERIAL.silver,'Glove');
    const leg=new THREE.Group();leg.position.set(s*.23,.85,.05);pelvis.add(leg);knees.push({g:leg,s});
    bar(leg,[0,0,0],[s*.05,-.34,-.45],.16,MATERIAL.pilotPlate,'Thigh');
    bar(leg,[s*.05,-.33,-.43],[s*.07,-.71,-.28],.11,MATERIAL.pilot,'Shin');
    ell(leg,[s*.07,-.73,-.41],[.15,.10,.27],MATERIAL.silver,'Boot');
  }
  let unlocked=!!options.unlocked, state=unlocked?'grounded':'locked', phase='idle';
  let quality='high', speed=0, flightTime=0, elapsed=0, transitionTime=0, flutterTime=0;
  let targetYaw=dragon.root.rotation.y, altitude=dragon.root.position.y, lastGround=0;
  let input={forward:0,turn:0,climb:0,pitch:0,boost:false};
  let glideForced=false, listener=null, disposed=false;
  // Cache hierarchy refs once; avoid repeated O(mesh-count) searches every frame on iPhone.
  const flightParts={tail:dragon.root.getObjectByName('Tail_Base'),
    foreLeft:dragon.root.getObjectByName('ForeLeftLeg'),foreRight:dragon.root.getObjectByName('ForeRightLeg'),
    hindLeft:dragon.root.getObjectByName('HindLeftLeg'),hindRight:dragon.root.getObjectByName('HindRightLeg'),
    beam:dragon.root.getObjectByName('AetherBreathPurelyVisual')};
  const tmpV=new THREE.Vector3();
  const startPose=new THREE.Vector3(5.4,.10,-2.30);
  const seatedPose=mountAnchor.position.clone();
  const groundRideHeight=options.groundRideHeight??0;
  riderPose.position.copy(startPose);
  function emit(type){if(typeof listener==='function')listener({type,...getState()});}
  function onEvent(fn){listener=typeof fn==='function'?fn:null;return api;}
  function unlock(){if(disposed)return false;if(unlocked)return true;unlocked=true;mountSystem.visible=true;wingFins.forEach(f=>f.group.visible=quality==='high'||f.index===0);state='grounded';emit('unlocked');return true;}
  function lock(){if(disposed||!['grounded','locked'].includes(state))return false;unlocked=false;state='locked';mountSystem.visible=false;wingFins.forEach(f=>f.group.visible=false);emit('locked');return true;}
  function mount(){
    if(disposed||!unlocked||state!=='grounded')return false;
    state='mounting';transitionTime=0;riderPose.position.copy(startPose);dummyRider.visible=options.showPreviewRider===true;
    emit('mountStart');return true;
  }
  function dismount(){
    if(disposed||state!=='ready')return false;
    state='dismounting';transitionTime=0;emit('dismountStart');return true;
  }
  function takeoff(){
    if(disposed||state!=='ready')return false;
    lastGround=groundAt(dragon.root.position.x,dragon.root.position.z)+groundRideHeight;
    targetYaw=dragon.root.rotation.y;state='takeoff';transitionTime=0;speed=0;emit('takeoffStart');return true;
  }
  function land(){if(disposed||state!=='flying')return false;state='landing';transitionTime=0;emit('landingStart');return true;}
  function setInput(next={}){
    if(disposed)return;
    const n = next||{};
    // Zeroes missing axes each call. Caller feeds held joystick/keyboard axes every frame.
    input.forward=clamp(n.forward??n.throttle??0,-1,1);
    input.turn=clamp(n.turn??n.yaw??0,-1,1);
    input.climb=clamp(n.climb??n.vertical??0,-1,1);
    input.pitch=clamp(n.pitch??0,-1,1);
    input.boost=!!n.boost;
  }
  function setGlide(v){glideForced=!!v;return glideForced;}
  function setQuality(mode){quality=dragon.setQuality(mode);wingFins.forEach(f=>f.group.visible=unlocked&&(quality==='high'||f.index===0));return quality;}
  function setCombatPhase(name){
    if(state==='locked'||state==='grounded'||state==='dismounting'){
      dragon.setPhase(name);phase=dragon.phase;return true;
    }
    return false; // flight never stomps on live boss battle or vice versa
  }
  function getMountWorldPosition(target=new THREE.Vector3()){return mountAnchor.getWorldPosition(target);}
  function getRiderWorldPose(targetPos=new THREE.Vector3(),targetQuat=new THREE.Quaternion()){
    riderPose.getWorldPosition(targetPos);riderPose.getWorldQuaternion(targetQuat);
    return {position:targetPos,quaternion:targetQuat,state,attached:state!=='locked'&&state!=='grounded'};
  }
  function getState(){
    const ground=groundAt(dragon.root.position.x,dragon.root.position.z)+groundRideHeight;
    return {state,unlocked,attached:!['locked','grounded','dismounting'].includes(state),
      airborne:state==='takeoff'||state==='flying'||state==='landing',
      flightMode:phase,speed,altitude:Math.max(0,dragon.root.position.y-ground),
      quality,glide:glideForced};
  }
  function update(dt,context={}){
    if(disposed)return;
    dt=clamp(dt,0,.06);elapsed+=dt;transitionTime+=dt;
    const root=dragon.root;
    // Keep original boss animation intact when not flying, except rider pose animation.
    const flightActive=['takeoff','flying','landing'].includes(state);
    const originalPhase=flightActive?'flight':(context.bossPhase||((state==='ready'||state==='mounting'||state==='dismounting')?'land':dragon.phase));
    dragon.update(dt,{phase:originalPhase});
    phase=flightActive?'hover':originalPhase;
    if(state==='locked'||state==='grounded')return;
    if(state==='mounting'){
      const p=smooth(transitionTime/1.65);
      // Two-stage assisted climb: step onto the wing-root spur, then settle at the reins.
      if(p<.56){
        const s=smooth(p/.56);riderPose.position.set(mix(startPose.x,2.1,s),mix(.10,9.75,s)+Math.sin(Math.PI*s)*.40,mix(startPose.z,-.40,s));
      }else{
        const s=smooth((p-.56)/.44);riderPose.position.set(mix(2.1,seatedPose.x,s),mix(9.75,seatedPose.y,s)+Math.sin(Math.PI*s)*.25,mix(-.40,seatedPose.z,s));
      }
      pelvis.rotation.x=damping(pelvis.rotation.x,p>.56?.04:-.22,9,dt);
      if(p>=1){state='ready';riderPose.position.copy(seatedPose);emit('mountComplete');}
    }else if(state==='dismounting'){
      const p=smooth(transitionTime/1.5);
      if(p<.44){const s=smooth(p/.44);riderPose.position.set(mix(seatedPose.x,2.1,s),mix(seatedPose.y,9.75,s)+Math.sin(Math.PI*s)*.25,mix(seatedPose.z,-.4,s));}
      else{const s=smooth((p-.44)/.56);riderPose.position.set(mix(2.1,startPose.x,s),mix(9.75,.10,s)+Math.sin(Math.PI*s)*.35,mix(-.4,startPose.z,s));}
      if(p>=1){state='grounded';riderPose.position.copy(startPose);emit('dismountComplete');}
    }else{
      riderPose.position.copy(seatedPose);
      if(state==='takeoff'){
        const ground=groundAt(root.position.x,root.position.z)+groundRideHeight;
        const p=smooth(transitionTime/2.45);
        root.position.y=mix(ground,ground+15,p);
        root.rotation.x=damping(root.rotation.x,.12*Math.sin(Math.PI*p),3.5,dt);
        speed=damping(speed,12*p,1.5,dt);phase='takeoff';
        if(p>=1){state='flying';emit('takeoffComplete');}
      }else if(state==='flying'){
        flightTime+=dt;
        const maxSp=input.boost?boostSpeed:baseSpeed;
        const wanted=input.forward>0?9+input.forward*(maxSp-9):input.forward<0?0:(glideForced?Math.max(speed,16):0);
        speed=damping(speed,wanted,input.boost?1.45:1.8,dt);
        targetYaw-=input.turn*dt*(.48+Math.min(speed,boostSpeed)/boostSpeed*.44);
        root.rotation.y=damping(root.rotation.y,targetYaw,9.0,dt);
        const pitchTarget=clamp(input.pitch*.25+input.climb*.13,-.34,.34);
        root.rotation.x=damping(root.rotation.x,pitchTarget,2.2,dt);
        root.rotation.z=damping(root.rotation.z,-input.turn*.27,2.7,dt);
        const horiz=speed*dt, direction=tmpV.set(0,0,-1).applyEuler(root.rotation);
        root.position.x+=direction.x*horiz;
        root.position.z+=direction.z*horiz;
        root.position.y+=direction.y*horiz+input.climb*dt*15.5;
        const g=groundAt(root.position.x,root.position.z)+groundRideHeight;
        root.position.y=clamp(root.position.y,g+4,maxHeight);
        const modeBase=glideForced?'glide':input.boost?'flap':speed<4?'hover':input.climb>.15?'ascend':input.climb<-.15?'descend':Math.abs(input.turn)>.25?'bank':speed>19?'glide':'flap';
        phase=modeBase;
      }else if(state==='landing'){
        const ground=groundAt(root.position.x,root.position.z)+groundRideHeight;
        speed=damping(speed,3,1.2,dt);
        root.position.y=Math.max(ground,root.position.y-(11+Math.min(speed,25)*.20)*dt);
        root.position.x-=Math.sin(root.rotation.y)*speed*dt;
        root.position.z-=Math.cos(root.rotation.y)*speed*dt;
        root.rotation.x=damping(root.rotation.x,0,2,dt);
        root.rotation.z=damping(root.rotation.z,0,2,dt);
        phase='landing';
        if(root.position.y<=ground+.015){root.position.y=ground;state='ready';speed=0;emit('landingComplete');}
      }else if(state==='ready'){
        speed=0;root.rotation.x=damping(root.rotation.x,0,4,dt);root.rotation.z=damping(root.rotation.z,0,4,dt);
        phase='ready';
      }
    }
    // Pilot's weight shift and split-leg seated pose. Player system may use getRiderWorldPose().
    pelvis.rotation.x=damping(pelvis.rotation.x,flightActive?.16+.06*input.climb:0,4,dt);
    pelvis.rotation.z=damping(pelvis.rotation.z,flightActive?input.turn*.10:0,4,dt);
    arms.forEach(({g,s})=>{g.rotation.x=damping(g.rotation.x,flightActive?-.18:-.07,4,dt);g.rotation.z=damping(g.rotation.z,s*.06,4,dt);});
    knees.forEach(({g,s})=>{g.rotation.x=damping(g.rotation.x,flightActive?-.29:-.48,4,dt);});
    if(flightActive){
      const wingL=dragon.anchors.wingLeft, wingR=dragon.anchors.wingRight;
      const forwardRatio=clamp(speed/boostSpeed,0,1);
      const pulseRate=phase==='takeoff'?3.4:phase==='landing'?2.1:input.boost?4.2:phase==='glide'?1.45:2.95;
      flutterTime+=dt*pulseRate*Math.PI*2;
      const amplitude=phase==='glide'?.09:phase==='landing'?.17:phase==='takeoff'?.44:input.boost?.36:.27;
      const baseline=phase==='glide'?.085:phase==='landing'?.16:.19;
      const wave=Math.sin(flutterTime);
      for(const [wing,s] of [[wingL,-1],[wingR,1]]){
        const asym=input.turn*s*.13;
        wing.rotation.z=s*(baseline+amplitude*wave+asym);
        wing.rotation.x=.10+Math.sin(flutterTime-.65)*amplitude*.22+forwardRatio*.06;
        wing.rotation.y=s*(.015+Math.sin(flutterTime-.48)*amplitude*.12);
      }
      for(const f of wingFins){f.group.rotation.x=damping(f.group.rotation.x,Math.sin(flutterTime-.6+f.index*.45)*amplitude*.52+input.turn*f.side*.11,5,dt);f.group.rotation.y=damping(f.group.rotation.y,input.climb*.08,3,dt);}
      dragon.anchors.body.rotation.x=damping(dragon.anchors.body.rotation.x,
        phase==='takeoff'?-.07:phase==='landing'?.06:-input.climb*.055,3,dt);
      const tail=flightParts.tail;
      if(tail){tail.rotation.y=damping(tail.rotation.y,input.turn*.16,3.0,dt);
        tail.rotation.x=damping(tail.rotation.x,input.climb*-.06,2.5,dt);}
      dragon.anchors.head.rotation.y=Math.sin(elapsed*1.3)*.017-input.turn*.065;
      const {foreLeft,foreRight,hindLeft,hindRight}=flightParts;
      const tuck=phase==='landing'?.12:.27+forwardRatio*.12;
      for(const leg of [foreLeft,foreRight])if(leg)leg.rotation.x=-tuck+Math.sin(flutterTime)*.035;
      for(const leg of [hindLeft,hindRight])if(leg)leg.rotation.x=tuck*.65+Math.sin(flutterTime+.8)*.024;
      // Never activate damage or boss-beam effects while riding.
      if(flightParts.beam)flightParts.beam.visible=false;
    }else{
      dragon.anchors.body.rotation.x=damping(dragon.anchors.body.rotation.x,0,3,dt);
      dragon.anchors.head.rotation.y=damping(dragon.anchors.head.rotation.y,0,3,dt);
      for(const wing of [dragon.anchors.wingLeft,dragon.anchors.wingRight])wing.rotation.y=damping(wing.rotation.y,0,3,dt);
      for(const f of wingFins){f.group.rotation.x=damping(f.group.rotation.x,0,3,dt);f.group.rotation.y=damping(f.group.rotation.y,0,3,dt);}
      const tail=flightParts.tail;if(tail){tail.rotation.x=damping(tail.rotation.x,0,3,dt);tail.rotation.y=damping(tail.rotation.y,0,3,dt);}
    }
  }
  function dispose(){
    if(disposed)return;disposed=true;
    // Remove rider-only pose offsets so the untouched boss module can resume independently.
    dragon.anchors.body.rotation.x=0;dragon.anchors.head.rotation.y=0;
    for(const wing of [dragon.anchors.wingLeft,dragon.anchors.wingRight])wing.rotation.y=0;
    if(flightParts.tail){flightParts.tail.rotation.x=0;flightParts.tail.rotation.y=0;}
    mountSystem.removeFromParent();riderPose.removeFromParent();mountAnchor.removeFromParent();wingFins.forEach(f=>f.group.removeFromParent());
    for(const g of ownedGeo)g.dispose();for(const m of ownedMat)m.dispose();
    listener=null;
    // Intentionally does NOT dispose original VHALKOR: caller owns dragon lifespan.
  }
  const api={root:dragon.root,mountAnchor,riderPose,update,setQuality,setInput,setGlide,unlock,lock,mount,dismount,takeoff,land,
    setCombatPhase,getMountWorldPosition,getRiderWorldPose,getState,onEvent,dispose,
    metadata:Object.freeze({id:'AF13-VHALKOR-RIDER',version:'1.1.0',requires:'AF13-VHALKOR',forward:'-Z',up:'+Y',units:'metres'})};
  setQuality(options.quality||dragon.quality||'low');
  return api;
}
