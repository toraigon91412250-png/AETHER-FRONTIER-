/**
 * AETHER FRONTIER / TEAM No.16
 * Enemy: AEGIS-IX, the Runebound Sentinel
 * Three.js 0.160.0 / Y up / forward -Z / 1 unit ~= 1 meter
 * This module NEVER creates a camera, scene, renderer, input handler, or global listener.
 */
export function createAetherModule(THREE, options = {}) {
  const root = new THREE.Group();
  root.name = 'AF16_AEGIS_IX_ROOT';
  const visual = new THREE.Group();
  root.add(visual);
  const maximumHP = Math.max(1, Number(options.maxHP) || 480);
  const random = typeof options.random === 'function' ? options.random : Math.random;
  const speedScale = Number(options.speedScale) || 1;
  let hp = maximumHP;
  let poise = 0;
  let phase = 1;
  let quality = 'high';
  let state = 'seek';
  let time = 0;
  let stateTime = 0;
  let combatCooldown = 1.1;
  let attack = null;
  let attackLocked = false;
  let facing = Math.PI;
  let nextStrafe = 1;
  let strafeDir = 1;
  let flash = 0;
  let hitRecoil = 0;
  let attackingPulse = 0;
  let phaseTimer = 0;
  let enabled = true;
  let behavior = 'aggressive';
  let manualTarget = null;
  let isDisposed = false;
  const playerPoint = new THREE.Vector3();
  const emit = (type, detail = {}) => {
    const event = { type, time, ...detail };
    if (typeof options.onEvent === 'function') options.onEvent(event);
    return event;
  };
  const armor = new THREE.MeshStandardMaterial({color:0x1a2836,metalness:0.84,roughness:0.31,flatShading:true});
  const dark = new THREE.MeshStandardMaterial({color:0x08111e,metalness:0.66,roughness:0.35});
  const plates = new THREE.MeshStandardMaterial({color:0x35485a,metalness:0.86,roughness:0.24,flatShading:true});
  const gold = new THREE.MeshStandardMaterial({color:0xbd9870,metalness:0.86,roughness:0.28});
  const coreMat = new THREE.MeshStandardMaterial({color:0x67f4ff,emissive:0x00a9ff,emissiveIntensity:2.8,metalness:0.25,roughness:0.12});
  const sigilMat = new THREE.MeshBasicMaterial({color:0x47f0ff,transparent:true,opacity:0.92,depthWrite:false,side:THREE.DoubleSide});
  const phaseMat = new THREE.MeshBasicMaterial({color:0xff5f74,transparent:true,opacity:0.78,depthWrite:false,side:THREE.DoubleSide});
  const warningMat = new THREE.MeshBasicMaterial({color:0xff405c,transparent:true,opacity:0.25,depthWrite:false,side:THREE.DoubleSide});
  const warningEdgeMat = new THREE.MeshBasicMaterial({color:0xff9a71,transparent:true,opacity:0.84,depthWrite:false,side:THREE.DoubleSide});
  const reusableMats = [armor,dark,plates,gold,coreMat,sigilMat,phaseMat,warningMat,warningEdgeMat];
  const obj = (parent, geo, mat, position = [0,0,0], rotation = [0,0,0], scale = [1,1,1]) => {
    const mesh = new THREE.Mesh(geo,mat);
    mesh.position.set(...position); mesh.rotation.set(...rotation); mesh.scale.set(...scale);
    mesh.castShadow = false; mesh.receiveShadow = false;
    parent.add(mesh); return mesh;
  };
  const box = (p, w,h,d,m,x,y,z,rx=0,ry=0,rz=0) => obj(p,new THREE.BoxGeometry(w,h,d),m,[x,y,z],[rx,ry,rz]);
  const sphere=(p,r,m,x,y,z,sw=12,sh=8) => obj(p,new THREE.SphereGeometry(r,sw,sh),m,[x,y,z]);
  const cyl=(p,rt,rb,h,m,x,y,z,seg=12,rx=0,ry=0,rz=0) => obj(p,new THREE.CylinderGeometry(rt,rb,h,seg),m,[x,y,z],[rx,ry,rz]);
  const torus=(p,r,t,m,x,y,z,rx=0,ry=0,rz=0,seg=32) => obj(p,new THREE.TorusGeometry(r,t,5,seg),m,[x,y,z],[rx,ry,rz]);
  const pivotBody = new THREE.Group(); visual.add(pivotBody);
  const torso = new THREE.Group(); torso.position.y=2.65; pivotBody.add(torso);
  // Intricate, faceted upper shell; forward is the negative Z axis.
  box(torso,1.33,1.12,.88,armor,0,.16,0);
  box(torso,1.54,.25,1.06,plates,0,.58,0);
  box(torso,1.09,.53,.94,plates,0,-.34,-.01);
  obj(torso,new THREE.OctahedronGeometry(.58,0),dark,[0,.1,-.47],[0,Math.PI/4,0],[.95,1.1,.50]);
  torus(torso,.39,.055,gold,0,.1,-.87,0,0,0,32);
  sphere(torso,.32,coreMat,0,.1,-.82,20,14);
  torus(torso,.19,.034,sigilMat,0,.1,-1.13,0,0,0,24);
  for (let i=-1;i<=1;i+=2) {
    box(torso,.18,.64,.12,gold,i*.66,.05,-.52,0,0,i*.22);
    box(torso,.17,.13,.16,coreMat,i*.68,-.18,-.55);
  }
  const waist = new THREE.Group(); waist.position.y=1.94; pivotBody.add(waist);
  cyl(waist,.54,.41,.42,dark,0,0,0,10);
  torus(waist,.44,.057,gold,0,-.08,0,Math.PI/2);
  box(waist,.83,.27,.65,armor,0,-.26,0);
  // Crown, face, antenna, geometric cheek guards.
  const head = new THREE.Group(); head.position.set(0,3.54,-.08); pivotBody.add(head);
  obj(head,new THREE.OctahedronGeometry(.49,0),armor,[0,0,-.06],[0,Math.PI/4,0],[.92,1.18,.8]);
  box(head,.75,.15,.29,plates,0,.32,-.18);
  box(head,.55,.13,.15,coreMat,0,.03,-.45);
  box(head,.37,.28,.13,dark,0,-.21,-.40);
  for(const sign of [-1,1]) {
    obj(head,new THREE.ConeGeometry(.17,.77,4),gold,[sign*.37,.63,-.02],[0,0,sign*.27]);
    obj(head,new THREE.ConeGeometry(.12,.48,4),plates,[sign*.52,-.15,-.06],[Math.PI,0,sign*.15]);
  }
  // Leg pivots for readable gait.
  const legs = [];
  for (const sign of [-1,1]) {
    const leg = new THREE.Group(); leg.position.set(sign*.46,1.69,0); pivotBody.add(leg); legs.push(leg);
    sphere(leg,.27,gold,0,0,0);
    box(leg,.48,.78,.54,armor,0,-.48,-.06,sign*.06);
    box(leg,.55,.35,.65,plates,0,-.96,-.15);
    sphere(leg,.18,coreMat,0,-1,-.43,10,6);
    box(leg,.37,.65,.37,dark,0,-1.31,.07);
    box(leg,.53,.26,.86,plates,0,-1.67,-.25);
    box(leg,.31,.10,.37,gold,0,-1.78,-.58);
  }
  // Articulated shoulders and primary blade/guard apparatus.
  const arms = [];
  for(const sign of [-1,1]) {
    const arm = new THREE.Group(); arm.position.set(sign*.91,3.04,0); pivotBody.add(arm); arms.push(arm);
    sphere(arm,.32,dark,0,0,0);
    obj(arm,new THREE.OctahedronGeometry(.50,0),armor,[sign*.14,-.09,0],[0,0,Math.PI/4],[1.1,.7,1.15]);
    box(arm,.49,.83,.51,plates,sign*.12,-.61,-.04,0,0,-sign*.12);
    cyl(arm,.19,.23,.28,gold,sign*.11,-1.02,0,10);
    box(arm,.46,.78,.51,armor,sign*.11,-1.40,-.12);
    box(arm,.5,.18,.69,gold,sign*.11,-1.76,-.29);
    for(let i=0;i<3;i++) box(arm,.045,.15,.22,coreMat,sign*.11+(i-1)*.13,-1.39,-.41);
  }
  const rightArm=arms[1], leftArm=arms[0];
  const bladePivot = new THREE.Group(); bladePivot.position.set(.16,-1.76,-.32); rightArm.add(bladePivot);
  box(bladePivot,.24,.43,.36,gold,0,-.16,0);
  obj(bladePivot,new THREE.ConeGeometry(.19,1.85,4),coreMat,[0,-1.03,-.18],[0,Math.PI/4,Math.PI]);
  torus(bladePivot,.23,.045,gold,0,-.30,-.16,Math.PI/2);
  const shieldPivot=new THREE.Group(); shieldPivot.position.set(-.18,-1.10,-.22); leftArm.add(shieldPivot);
  obj(shieldPivot,new THREE.OctahedronGeometry(.66,0),plates,[0,-.35,-.38],[Math.PI/2,0,Math.PI/4],[.85,1.28,.37]);
  torus(shieldPivot,.48,.035,sigilMat,0,-.35,-.72,0,0,0,24);
  sphere(shieldPivot,.12,coreMat,0,-.35,-.75);
  // Spinning broken halo segments and hovering shoulder vanes.
  const halo = new THREE.Group(); halo.position.set(0,3.30,.72); pivotBody.add(halo);
  const ringPieces=[];
  for(let j=0;j<8;j++) {
    const a=j*Math.PI/4;
    const seg=obj(halo,new THREE.TorusGeometry(1.27,.048,4,7,.62),j%2===0?gold:sigilMat,[0,0,0],[0,0,a]);
    ringPieces.push(seg);
    obj(halo,new THREE.OctahedronGeometry(.13),coreMat,[Math.sin(a)*1.27,Math.cos(a)*1.27,0],[0,a,0],[.9,1.35,.55]);
  }
  const flares=[];
  for(const s of [-1,1]) {
    const wing=new THREE.Group(); wing.position.set(s*1.26,3.38,.38); pivotBody.add(wing);
    obj(wing,new THREE.OctahedronGeometry(.75,0),armor,[s*.14,0,.10],[0,0,s*.26],[.37,1.16,.36]);
    box(wing,.075,.82,.12,coreMat,s*.18,0,-.17,0,0,-s*.28);
    flares.push(wing);
  }
  // Floor warnings. These appear ahead of damage and are updated only on active attacks.
  const warnings=new THREE.Group(); root.add(warnings);
  function fanGeometry(radius, halfAngle, steps=40) {
    const pts=[0,0,0]; const idx=[];
    for(let i=0;i<=steps;i++){const a=-halfAngle+(2*halfAngle*i/steps);pts.push(Math.sin(a)*radius,0,-Math.cos(a)*radius);if(i>0)idx.push(0,i,i+1);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));g.setIndex(idx);g.computeVertexNormals();return g;
  }
  const wedge=obj(warnings,fanGeometry(4.5,.64),warningMat,[0,.065,0]);
  function sectorEdgeGeometry(radius,halfAngle,width=.095,steps=40) {
    const verts=[],faces=[];
    for(let i=0;i<=steps;i++) {
      const a=-halfAngle+2*halfAngle*i/steps;
      for(const rad of [radius-width,radius])verts.push(Math.sin(a)*rad,0,-Math.cos(a)*rad);
      if(i){const n=i*2;faces.push(n-2,n-1,n,n-1,n+1,n);}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(faces);g.computeVertexNormals();return g;
  }
  const wedgeEdge=obj(warnings,sectorEdgeGeometry(4.5,.64),warningEdgeMat,[0,.075,0]);
  const pulseFill=obj(warnings,new THREE.CircleGeometry(3.35,64),warningMat,[0,.069,0],[-Math.PI/2,0,0]);
  const pulseRim=obj(warnings,new THREE.RingGeometry(3.25,3.38,64),warningEdgeMat,[0,.075,0],[-Math.PI/2,0,0]);
  const rayFill=obj(warnings,new THREE.PlaneGeometry(1.35,13),warningMat,[0,.065,0],[-Math.PI/2,0,0]);
  const rayEdgeA=obj(warnings,new THREE.PlaneGeometry(.09,13),warningEdgeMat,[0,.07,0],[-Math.PI/2,0,0]);
  const rayEdgeB=obj(warnings,new THREE.PlaneGeometry(.09,13),warningEdgeMat,[0,.07,0],[-Math.PI/2,0,0]);
  const impactRing=obj(warnings,new THREE.RingGeometry(.88,1.05,48),sigilMat,[0,.11,0],[-Math.PI/2,0,0]);
  const rayBeam=obj(warnings,new THREE.CylinderGeometry(.18,.24,12,10),phaseMat,[0,1.35,-6],[Math.PI/2,0,0]);
  const rayBeamCore=obj(warnings,new THREE.CylinderGeometry(.065,.085,12,8),coreMat,[0,1.35,-6],[Math.PI/2,0,0]);
  const cleaveArc=obj(warnings,new THREE.TorusGeometry(3.2,.14,6,36,1.28),phaseMat,[0,1.65,-.3],[0,0,0]);
  const emissionSphere=sphere(warnings,.28,coreMat,0,2.6,0,16,10);
  const secondaryParts = [...ringPieces,...flares];
  const coarseDetails=[];
  for(const side of [-1,1]) {
    for(let j=0;j<4;j++) {
      coarseDetails.push(box(torso,.14,.07,.18, gold,side*.49, .42-j*.25,-.48));
    }
  }
  function hideWarnings(){wedge.visible=wedgeEdge.visible=pulseFill.visible=pulseRim.visible=rayFill.visible=rayEdgeA.visible=rayEdgeB.visible=impactRing.visible=emissionSphere.visible=rayBeam.visible=rayBeamCore.visible=cleaveArc.visible=false;}
  hideWarnings();
  root.position.set(options.position?.x||0,options.position?.y||0,options.position?.z||0);
  function setQuality(mode='high') {
    quality = mode === 'low' ? 'low' : 'high';
    for (const part of secondaryParts) part.visible=quality==='high';
    for (const item of coarseDetails) item.visible=quality==='high';
    coreMat.emissiveIntensity = quality==='high' ? 2.8 : 1.7;
    return quality;
  }
  setQuality(options.quality || 'high');
  function snapshot(){return {hp,maxHP:maximumHP,hpRatio:hp/maximumHP,poise,maxPoise:100,phase,state,attack:attack?.name||null,attackProgress:attack?Math.min(1,stateTime/attack.windup):0,recovery:state==='recover'||state==='stagger',position:{x:root.position.x,y:root.position.y,z:root.position.z},alive:state!=='dead'};}
  function distanceTo(p){return Math.hypot(p.x-root.position.x,p.z-root.position.z);}
  function stateTo(next){state=next;stateTime=0;}
  function beginAttack(name) {
    const spec={
      cleave:{name:'cleave',label:'斬撃',windup:phase===2?.82:1.05,active:.20,recovery:phase===2?.62:.82,damage:24},
      pulse:{name:'pulse',label:'衝撃波',windup:phase===2?1.05:1.26,active:.28,recovery:.88,damage:19},
      ray:{name:'ray',label:'直線レーザー',windup:phase===2?1.05:1.34,active:.30,recovery:.93,damage:28}
    }[name];
    if(!spec) return;
    attack=spec;attackLocked=false;attackingPulse=0;stateTo('telegraph');
    emit('telegraph',{attack:name,label:spec.label,duration:spec.windup});
  }
  function setFacingToward(p,speed,dt) {
    const desired=Math.atan2(-(p.x-root.position.x),-(p.z-root.position.z));
    const dif=Math.atan2(Math.sin(desired-facing),Math.cos(desired-facing));
    facing+=THREE.MathUtils.clamp(dif,-speed*dt,speed*dt);
  }
  function attackHits(target) {
    const dx=target.x-root.position.x; const dz=target.z-root.position.z;
    const d=Math.hypot(dx,dz),theta=Math.atan2(-dx,-dz);
    const diff=Math.abs(Math.atan2(Math.sin(theta-facing),Math.cos(theta-facing)));
    if(attack.name==='cleave')return d<=4.5+(.0)+(target.radius||.45) && diff<.64;
    if(attack.name==='pulse')return d<=3.34+(target.radius||.45) && (target.height||0)<.65;
    if(attack.name==='ray')return d<=11.7 && Math.abs(dx*Math.cos(facing)-dz*Math.sin(facing))<=.68+(target.radius||.45) && (dx*-Math.sin(facing)+dz*-Math.cos(facing))>-.5;
    return false;
  }
  function impact(context) {
    attackingPulse=1;
    const p=context.player;
    const hit=!!(p&&Number.isFinite(p.position?.x)&&attackHits({...p.position,radius:p.radius,height:p.height}));
    const invulnerable=!!p?.invulnerable;
    emit('attackImpact',{attack:attack.name,damage:attack.damage,hit,blocked:hit&&invulnerable,position:{x:root.position.x,y:root.position.y,z:root.position.z},direction:facing});
    if(hit&&!invulnerable){emit('playerHit',{attack:attack.name,damage:attack.damage,knockback:attack.name==='pulse'?2.2:1.15,direction:{x:p.position.x-root.position.x,z:p.position.z-root.position.z}});}
  }
  function selectAttack(dist){
    const r=random();
    if(dist<3.1) return r<.37?'pulse':r<.78?'cleave':'ray';
    if(dist<4.6)return r<.57?'cleave':r<.77?'pulse':'ray';
    return 'ray';
  }
  function reset(opts={}) {
    hp=maximumHP;poise=0;phase=1;state='seek';time=0;stateTime=0;combatCooldown=.95;attack=null;attackLocked=false;
    flash=0;hitRecoil=0;phaseTimer=0;enabled=true;attackingPulse=0;
    root.position.set(opts.position?.x??options.position?.x??0,opts.position?.y??options.position?.y??0,opts.position?.z??options.position?.z??0);
    facing=opts.facing??Math.PI;
    hideWarnings();coreMat.color.setHex(0x67f4ff);coreMat.emissive.setHex(0x00a9ff);
    emit('reset',{});return snapshot();
  }
  function receiveHit({damage=0,stagger=0,position=null}={}) {
    if(isDisposed||!enabled||state==='dead'||state==='phaseShift')return {accepted:false,...snapshot()};
    const weakness = state==='recover'||state==='stagger';
    const actual=Math.max(0,damage)*(weakness?1.55:1);
    hp=Math.max(0,hp-actual);
    poise=Math.min(100,poise+Math.max(0,stagger)*(weakness?1.3:1));
    flash=.20;hitRecoil=.24;
    emit('enemyDamaged',{damage:actual,hp,weakness});
    if(hp<=0){attack=null;stateTo('dead');hideWarnings();emit('enemyDefeated',{});}
    else if(phase===1&&hp/maximumHP<=.5) {
      phase=2;attack=null;poise=0;stateTo('phaseShift');phaseTimer=1.8;
      emit('phaseChanged',{phase:2});
    }else if(poise>=100){poise=0;attack=null;stateTo('stagger');emit('enemyStaggered',{duration:1.9});}
    return {accepted:true,damage:actual,weakness,...snapshot()};
  }
  function update(dt, context={}) {
    if(isDisposed) return snapshot();
    dt=Math.min(Math.max(dt||0,0),.05);time+=dt;if(enabled)stateTime+=dt;
    flash=Math.max(0,flash-dt);hitRecoil=Math.max(0,hitRecoil-dt);
    attackingPulse=Math.max(0,attackingPulse-dt*2.5);
    const pt=context.player?.position || context.target?.position || context.target || manualTarget || options.target;
    let hasTarget=pt&&Number.isFinite(pt.x)&&Number.isFinite(pt.z);
    if(hasTarget)playerPoint.set(pt.x,pt.y||0,pt.z);
    const dist=hasTarget?distanceTo(playerPoint):Infinity;
    const elapsed=time*(phase===2?1.24:1);
    const walking=state==='seek'&&hasTarget&&dist>3.6;
    const step = Math.sin(elapsed*6.3)* (walking?.33:.055);
    legs[0].rotation.x=step;legs[1].rotation.x=-step;
    arms[0].rotation.x=-step*.25+.04;arms[1].rotation.x=step*.26-.08;
    torso.rotation.z=Math.sin(elapsed*1.6)*.026;
    torso.rotation.x=-hitRecoil*.62;
    head.rotation.y=Math.sin(elapsed*1.2)*.035;
    waist.rotation.y=Math.sin(elapsed*1.4)*.035;
    pivotBody.position.y=(state==='dead'?-Math.min(2.25,stateTime*1.4):0)+Math.sin(elapsed*2)*.05;
    pivotBody.rotation.z=state==='dead'?Math.min(.95,stateTime*.52):Math.sin(elapsed*1.4)*.018;
    halo.rotation.z=elapsed*.35;halo.rotation.y=Math.sin(elapsed*.45)*.24;
    coreMat.emissiveIntensity=(quality==='high'?2.8:1.7)+(flash?5.5:0)+(.3*Math.sin(elapsed*3));
    flares.forEach((v,i)=>{v.rotation.z=(i?1:-1)*((phase===2?.3:.04)+Math.sin(elapsed*2)*.08)});
    rightArm.rotation.x=state==='telegraph'?-.65-Math.sin(Math.min(1,stateTime/(attack?.windup||1))*Math.PI/2)*.8:state==='active'?-1.8:state==='recover'?-1.05:0;
    shieldPivot.rotation.y=Math.sin(elapsed*2.6)*.12;
    if(state==='dead'){hideWarnings();return snapshot();}
    if(state==='phaseShift'){
      hideWarnings();halo.scale.setScalar(1.3+Math.sin(time*8)*.13);
      if(stateTime>=phaseTimer){coreMat.color.setHex(0xff8e9b);coreMat.emissive.setHex(0xfa2457);halo.scale.setScalar(1);combatCooldown=.6;stateTo('seek');}
      return snapshot();
    }
    if(state==='stagger'){
      hideWarnings();torso.rotation.z=Math.sin(stateTime*21)*.12;
      if(stateTime>=1.9){combatCooldown=.58;stateTo('seek');}
      return snapshot();
    }
    if(!enabled) {hideWarnings();return snapshot();}
    if(state==='seek') {
      hideWarnings();combatCooldown=Math.max(0,combatCooldown-dt);
      if(hasTarget){
        setFacingToward(playerPoint,4.0,dt);
        if(nextStrafe<=0){nextStrafe=2+random()*1.8;strafeDir=random()<.5?-1:1;}
        nextStrafe-=dt;
        const speed=(phase===2?2.95:2.42)*speedScale;
        if(dist>3.6) {
          const amount=Math.min(dt*speed,Math.max(0,dist-3.10));
          root.position.x+=(playerPoint.x-root.position.x)/dist*amount;
          root.position.z+=(playerPoint.z-root.position.z)/dist*amount;
        }else if(dist<2.2) {
          const amount=dt*speed*.62;
          root.position.x-=(playerPoint.x-root.position.x)/Math.max(dist,.1)*amount;
          root.position.z-=(playerPoint.z-root.position.z)/Math.max(dist,.1)*amount;
        }else {
          const amount=dt*speed*.37*strafeDir;
          root.position.x+=(playerPoint.z-root.position.z)/dist*amount;
          root.position.z-=(playerPoint.x-root.position.x)/dist*amount;
        }
        if(behavior==='aggressive'&&dist<11.2&&combatCooldown<=0)beginAttack(selectAttack(dist));
      }
      return snapshot();
    }
    if(state==='telegraph') {
      // The warning tracks briefly, then freezes: a committed attack the player can dodge.
      const progress=Math.min(1,stateTime/attack.windup);
      if(hasTarget&&!attackLocked){setFacingToward(playerPoint,6,dt);if(progress>=.50)attackLocked=true;}
      warningMat.opacity=.16+.30*progress+.06*Math.sin(time*16);
      warningEdgeMat.opacity=.58+.37*progress;
      warnings.position.set(0,0,0);
      warnings.rotation.y=facing;
      wedge.visible=wedgeEdge.visible=attack.name==='cleave';
      pulseFill.visible=pulseRim.visible=attack.name==='pulse';
      rayFill.visible=rayEdgeA.visible=rayEdgeB.visible=attack.name==='ray';
      emissionSphere.visible=true;
      emissionSphere.material=coreMat;
      emissionSphere.position.set(0,2.6,0);
      emissionSphere.scale.setScalar(.7+progress*.9);
      if(attack.name==='ray'){
        rayFill.position.set(0,.063,-6.5);rayEdgeA.position.set(-.7,.07,-6.5);rayEdgeB.position.set(.7,.07,-6.5);
      }
      if(stateTime>=attack.windup) {stateTo('active');impact(context);}
      return snapshot();
    }
    if(state==='active') {
      hideWarnings();warnings.position.set(0,0,0);warnings.rotation.y=facing;
      impactRing.visible=true;impactRing.scale.setScalar(attack.name==='pulse'?1+(stateTime/attack.active)*3:1+(stateTime/attack.active)*1.5);
      impactRing.material=attack.name==='pulse'?phaseMat:sigilMat;
      const pulse = attack.name==='pulse'?3.45:1.2;
      emissionSphere.visible=true;emissionSphere.position.set(0,2.6,0);
      emissionSphere.scale.setScalar(pulse*(.6+stateTime/attack.active));
      if(attack.name==='cleave'){
        rightArm.rotation.z=-1.5+2.9*(stateTime/attack.active);
        cleaveArc.visible=true;
        cleaveArc.position.set(0,1.7,-2.2);
        cleaveArc.rotation.z=-1.1+2.1*stateTime/attack.active;
        cleaveArc.scale.setScalar(.92+stateTime/attack.active*.17);
      }
      if(attack.name==='ray'){
        rightArm.rotation.x=-2.65;
        rayBeam.visible=rayBeamCore.visible=true;
        const intensity=0.75+Math.sin(stateTime/attack.active*Math.PI)*.3;
        rayBeam.scale.set(intensity,1,intensity);
        rayBeamCore.scale.set(intensity,1,intensity);
      }
      if(stateTime>=attack.active){stateTo('recover');hideWarnings();}
      return snapshot();
    }
    if(state==='recover'){
      hideWarnings();rightArm.rotation.z=0;
      if(stateTime>=attack.recovery){attack=null;combatCooldown=phase===2?.18:.40;stateTo('seek');}
    }
    visual.rotation.y=facing;
    return snapshot();
  }
  // Stable facing for all states including early returns.
  const actualUpdate=update;
  function updateWithFacing(dt,context){
    const result=actualUpdate(dt,context);
    visual.rotation.y=facing;
    if(flash>0){coreMat.color.setHex(0xffffff);}else{coreMat.color.setHex(phase===2?0xff8e9b:0x67f4ff);}
    return result;
  }
  function setEnabled(value){enabled=!!value;return enabled;}
  function setTarget(value){manualTarget=value;return manualTarget;}
  function setBehavior(value){behavior=value==='passive'?'passive':'aggressive';return behavior;}
  function forceAttack(name){
    if(isDisposed||!enabled||state!=='seek'||!['cleave','pulse','ray'].includes(name))return false;
    beginAttack(name);return true;
  }
  function setFacing(yaw){if(Number.isFinite(yaw))facing=yaw;visual.rotation.y=facing;}
  function setPosition(x,y,z){if(typeof x==='object')root.position.copy(x);else root.position.set(x,y,z);}
  function dispose(){
    if(isDisposed)return;
    isDisposed=true;
    const geoSet=new Set();const materialSet=new Set();
    root.traverse(o=>{if(o.geometry)geoSet.add(o.geometry);if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materialSet.add(m));}});
    geoSet.forEach(g=>g.dispose());materialSet.forEach(m=>m.dispose());
    root.removeFromParent();
  }
  return {
    root,
    update:updateWithFacing,
    setQuality,
    dispose,
    receiveHit,
    reset,
    snapshot,
    setEnabled,
    setTarget,
    setBehavior,
    forceAttack,
    setFacing,
    setPosition,
    get isAlive(){return state!=='dead';},
    get colliders(){return [{kind:'capsule',radius:.85,height:3.65,position:root.position.clone()}];},
    get weakPoint(){return {position:new THREE.Vector3(root.position.x-Math.sin(facing)*.85,root.position.y+2.75,root.position.z-Math.cos(facing)*.85),active:state==='recover'||state==='stagger'};}
  };
}
