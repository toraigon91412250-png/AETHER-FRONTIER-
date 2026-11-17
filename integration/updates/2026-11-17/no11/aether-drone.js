/**
 * SERAPH-11 v2.0 / compatibility-preserving role + visual feedback extension.
 * Original 1.0.0 model/animations are kept byte-for-byte in aether-drone-core.js.
 * The existing main game still calls the identical four primary methods.
 */
import {createAetherModule as createLegacyModule, AETHER_DRONE_INFO as ORIGINAL} from './aether-drone-core.js';
import {createSeraphMotionController} from './seraph-motion.js';

export const AETHER_DRONE_INFO = Object.freeze({
  ...ORIGINAL, version:'2.0.0',
  features:['follow-optional','scan-feedback','host-confirmed-discovery','warning-telegraph','optional-evade','visual-signal']
});

export function createAetherModule(THREE, options = {}) {
  const base = createLegacyModule(THREE, options);
  const root = base.root;
  const motion = createSeraphMotionController(THREE,{root,
    mode:options.motionMode||'external',offset:options.followOffset,
    maxSpeed:options.maxSpeed,resolveMovement:options.resolveMovement});
  root.userData.aetherModule.version='2.0.0';
  const mathClamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const validNum=(v,d)=>Number.isFinite(v)?v:d;
  const feedback = new THREE.Group(); feedback.name='AF11_OptionalFeedback'; root.add(feedback);
  const hi = new THREE.Group();hi.name='AF11_ExtraFeedback_HighOnly'; feedback.add(hi);
  const warnMaterial = new THREE.MeshBasicMaterial({color:0xff687e,side:THREE.DoubleSide,transparent:true,opacity:.85,depthWrite:false,blending:THREE.AdditiveBlending});
  const discoverMat = new THREE.MeshBasicMaterial({color:0x55ffe5,transparent:true,opacity:.90,depthWrite:false,side:THREE.DoubleSide});
  const trailMat = new THREE.MeshBasicMaterial({color:0xff536f,transparent:true,opacity:.25,depthWrite:false,blending:THREE.AdditiveBlending});
  const warning = new THREE.Group();warning.name='Hostile_Telegraph_NonDamage';warning.position.z=-.68;feedback.add(warning);
  const arcA=new THREE.Mesh(new THREE.TorusGeometry(.53,.028,5,40,Math.PI*1.30),warnMaterial);arcA.rotation.z=-Math.PI*.16;warning.add(arcA);
  const arcB=new THREE.Mesh(new THREE.TorusGeometry(.70,.012,4,48,Math.PI*1.30),warnMaterial);arcB.rotation.z=Math.PI*.73;warning.add(arcB);
  const hazard = new THREE.Mesh(new THREE.ConeGeometry(.125,.23,3),warnMaterial);hazard.position.set(0,.87,0);hazard.rotation.z=Math.PI; warning.add(hazard);
  const fineArc = new THREE.Mesh(new THREE.TorusGeometry(.87,.009,4,56),warnMaterial);hi.add(fineArc);fineArc.position.z=-.69;
  warning.visible=false;fineArc.visible=false;
  const evadeGlow = new THREE.Group();evadeGlow.name='Evade_Trail_VisualOnly';feedback.add(evadeGlow);
  const dashLeft = new THREE.Mesh(new THREE.TorusGeometry(.5,.02,4,28,Math.PI*.82),trailMat);dashLeft.position.set(-.65,0,.1);dashLeft.rotation.z=Math.PI*.55;evadeGlow.add(dashLeft);
  const dashRight = new THREE.Mesh(new THREE.TorusGeometry(.5,.02,4,28,Math.PI*.82),trailMat);dashRight.position.set(.65,0,.1);dashRight.rotation.z=-Math.PI*.38;evadeGlow.add(dashRight);
  evadeGlow.visible=false;
  const discovery = new THREE.Group();discovery.name='Discovered_Target_Marker_WorldAnchored';feedback.add(discovery);
  const markerRing = new THREE.Mesh(new THREE.TorusGeometry(.46,.026,6,40),discoverMat);discovery.add(markerRing);
  const markCore = new THREE.Mesh(new THREE.OctahedronGeometry(.14,0),discoverMat);discovery.add(markCore);
  const markerDetail = new THREE.Mesh(new THREE.TorusGeometry(.65,.009,4,36),discoverMat);hi.add(markerDetail);
  discovery.visible=false;markerDetail.visible=false;
  const worldMarker = new THREE.Vector3(), localMarker = new THREE.Vector3();
  const scanInk = new THREE.Mesh(new THREE.TorusGeometry(.57,.012,4,48),discoverMat);
  scanInk.name='High_Only_Active_Scan_Optic';hi.add(scanInk);scanInk.position.z=-.61;scanInk.visible=false;
  const events=[];
  let disposed=false, quality=base.getState().quality, mode=base.getState().mode;
  let signal='normal', elapsed=0, scanLeft=0, warningLeft=0, warningTotal=1, evadeLeft=0, evadeTotal=.38, markLeft=0;
  let markId=null, scanContextLast=false, discoveryCounter=0;
  let evadeSign=1;
  const emitter=typeof options.onEvent==='function'?options.onEvent:null;
  function emit(type, details={}){
    const e={type,teamId:'11',source:'SERAPH-11',mode,time:elapsed,...details};
    if(events.length>=32)events.shift();events.push(e);
    // Host listeners are optional. Callback exceptions should not destabilize the game loop.
    if(emitter){try{emitter(e);}catch(err){if(options.onCallbackError)options.onCallbackError(err,e);}}
  }
  function setMode(next) {
    if(disposed||!['friendly','neutral','hostile'].includes(next))return false;
    if(mode===next)return true;
    mode=next;base.setMode(next);
    if(next!=='hostile'&&warningLeft>0)stopWarning(true);
    emit('modeChanged',{value:next});return true;
  }
  function setQuality(next) {
    if(disposed)return;
    base.setQuality(next);
    quality=base.getState().quality;
    hi.visible=quality==='high';
    markerDetail.visible=hi.visible && discovery.visible;
    fineArc.visible=hi.visible && warning.visible;
  }
  function setSignal(next) {
    if(disposed||!['normal','tracking','caution','disabled'].includes(next))return false;
    if(next===signal)return true;
    signal=next;emit('signalChanged',{value:next});return true;
  }
  function triggerScan(meta={}) {
    if(disposed)return false;
    base.triggerScan();
    scanLeft=1.55;
    emit('scanStarted',{requestId:meta?.requestId??null});
    return true;
  }
  function setTarget(worldPosition) {
    if(disposed)return false;
    if(!worldPosition||![worldPosition.x,worldPosition.y,worldPosition.z].every(Number.isFinite))return false;
    worldMarker.set(worldPosition.x,worldPosition.y,worldPosition.z);
    return true;
  }
  function reportDiscovery({id=null,position=null,duration=4.5,label=null}={}) {
    if(disposed)return false;
    if(position && !setTarget(position)) return false;
    if(!position && !discovery.visible) {
      root.updateWorldMatrix?.(true,false);
      localMarker.set(0,.15,-2.3);
      root.localToWorld?.(localMarker);
      worldMarker.copy(localMarker);
    }
    markId=id===null?`target-${++discoveryCounter}`:String(id).slice(0,80);
    markLeft=mathClamp(validNum(duration,4.5),.4,15);
    discovery.visible=true;markerDetail.visible=quality==='high';
    emit('targetDiscovered',{targetId:markId,label:label===null?null:String(label).slice(0,80),position:{x:worldMarker.x,y:worldMarker.y,z:worldMarker.z}});
    return true;
  }
  function clearDiscovery() {markLeft=0;discovery.visible=false;markerDetail.visible=false;markId=null;}
  function stopWarning(cancelled=false) {
    if(warningLeft<=0)return;
    warningLeft=0;warning.visible=false;fineArc.visible=false;
    emit(cancelled?'warningCancelled':'warningComplete');
  }
  function triggerWarning({duration=1.2}={}) {
    if(disposed || mode!=='hostile'||signal==='disabled')return false;
    warningTotal=mathClamp(validNum(duration,1.2),.4,3.0);
    warningLeft=warningTotal;warning.visible=true;fineArc.visible=quality==='high';
    emit('warningStart',{duration:warningTotal});return true;
  }
  function triggerEvade({direction={x:1,y:0,z:0},duration=.38,distance=1.6}={}) {
    if(disposed || signal==='disabled')return false;
    if(!direction||![direction.x,direction.y??0,direction.z].every(Number.isFinite))return false;
    evadeTotal=mathClamp(validNum(duration,.38),.18,.75);
    evadeLeft=evadeTotal;
    evadeSign=(direction.x||1)>=0?1:-1;
    evadeGlow.visible=true;
    const moved=motion.requestEvade({direction,duration:evadeTotal,distance});
    emit('evadeStart',{movementApplied:moved,visualOnly:!moved,duration:evadeTotal});
    return true;
  }
  function setMotionMode(next) {
    if(disposed)return false;
    const was=motion.mode;
    if(!motion.setMode(next))return false;
    if(next!==was)emit('motionModeChanged',{value:next});
    return true;
  }
  function setFollowTarget(position,yaw=0){return !disposed && motion.setFollowTarget(position,yaw);}
  function dispatchScanEvent(event) {
    if(disposed||!event)return false;
    if(event.type==='start')return triggerScan(event);
    if(event.type==='found')return reportDiscovery(event);
    if(event.type==='clear'){clearDiscovery();return true;}
    if(event.type==='complete'){scanLeft=0;emit('scanAcknowledged',{requestId:event.requestId??null});return true;}
    return false;
  }
  function getState(){return {...base.getState(),mode,quality,signal,motionMode:motion.mode,
    hasFollowTarget:motion.hasTarget,warningActive:warningLeft>0,evading:evadeLeft>0,
    scanFeedbackActive:scanLeft>0,discoveryActive:markLeft>0,discoveredId:markId,disposed};}
  function drainEvents(){return events.splice(0);}
  function update(dt, context={}) {
    if(disposed)return;
    context=context||{};
    dt=mathClamp(validNum(Number(dt),0),0,.1);
    if(typeof context.mode==='string')setMode(context.mode);
    if(typeof context.quality==='string') {
      const q=(context.quality==='high'||context.quality==='quality')?'high':'low';
      if(q!==quality)setQuality(q);
    }
    if(typeof context.signal==='string')setSignal(context.signal);
    if(typeof context.motionMode==='string')setMotionMode(context.motionMode);
    if(context.followTarget)setFollowTarget(context.followTarget,context.playerYaw);
    if(context.scanEvent)dispatchScanEvent(context.scanEvent);
    if(context.scan===true && !scanContextLast)triggerScan();
    scanContextLast=context.scan===true;
    // Only an explicit opt-in makes this module move the public root.
    const move=motion.update(dt);
    // Avoid allocating a new per-frame context in the original host-owned path.
    const needVelocity = motion.mode !== 'external' && context.velocity === undefined;
    let cleanContext = context;
    if (context.scan === true || needVelocity) {
      cleanContext={...context};
      if (context.scan === true) cleanContext.scan=false;
      if (needVelocity) cleanContext.velocity=move.velocity;
    }
    base.update(dt,cleanContext);
    if(dt<=0)return;
    const speed=mathClamp(validNum(context.timeScale,1),.05,3);
    const step=dt*speed;
    elapsed+=step;
    if(scanLeft>0){scanLeft=Math.max(0,scanLeft-step);if(scanLeft===0)emit('scanVisualComplete');}
    scanInk.visible=quality==='high'&&scanLeft>0;
    if(scanInk.visible){scanInk.rotation.z+=step*.65;scanInk.scale.setScalar(.90+.16*Math.sin(elapsed*6));}
    if(warningLeft>0){
      warningLeft=Math.max(0,warningLeft-step);
      const k=1-warningLeft/warningTotal;
      warning.scale.setScalar(1+.25*Math.sin(k*Math.PI*6));
      arcA.rotation.z=-.52+k*Math.PI*.9;
      arcB.rotation.z=2.25-k*Math.PI*.8;
      warnMaterial.opacity=.45+.52*Math.abs(Math.sin(k*Math.PI*5));
      if(warningLeft===0){warning.visible=false;fineArc.visible=false;emit('warningComplete');}
    }
    if(evadeLeft>0){
      evadeLeft=Math.max(0,evadeLeft-step);
      const k=1-evadeLeft/evadeTotal;
      const rig=root.getObjectByName?.('BodyRig_InternalHoverOnly');
      if(rig){rig.position.x+=Math.sin(Math.PI*k)*.20*evadeSign;rig.rotation.z-=Math.sin(Math.PI*k)*.30*evadeSign;}
      trailMat.opacity=.28*(1-k);evadeGlow.scale.x=1+.45*k;
      if(evadeLeft===0){evadeGlow.visible=false;emit('evadeComplete');}
    }
    if(markLeft>0){
      markLeft=Math.max(0,markLeft-step);
      root.updateWorldMatrix?.(true,false);
      localMarker.copy(worldMarker);
      root.worldToLocal?.(localMarker);
      discovery.position.copy(localMarker);
      const k=1-markLeft/4.5;
      discovery.rotation.y=elapsed*.55;
      markerRing.rotation.z=elapsed*.33;
      markCore.rotation.y=elapsed*1.5;
      discoverMat.opacity=.6+.32*Math.sin(elapsed*5)**2;
      markerDetail.position.copy(localMarker);
      markerDetail.rotation.y=elapsed*.4;
      if(markLeft===0){clearDiscovery();emit('discoveryVisualComplete');}
    }
    if(signal==='disabled'){
      const crystal=root.getObjectByName?.('EightFacet_Aether_Crystal');
      if(crystal)crystal.material.emissiveIntensity=.045;
      warning.visible=false;scanInk.visible=false;
    }
  }
  function dispose() {
    if(disposed)return;
    disposed=true;motion.dispose();events.length=0;
    // base.dispose() traverses the entire root, including new geometries/materials.
    base.dispose();
  }
  setQuality(options.quality||'low');
  if(options.signal)setSignal(options.signal);
  return {...base,root,update,setQuality,setMode,setSignal,triggerScan,reportDiscovery,clearDiscovery,
    dispatchScanEvent,setTarget,triggerWarning,triggerEvade,setMotionMode,setFollowTarget,
    getState,drainEvents,dispose};
}
