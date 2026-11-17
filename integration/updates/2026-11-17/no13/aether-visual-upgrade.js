/**
 * AETHER FRONTIER No.13 / VHALKOR RIFT-CROWN VISUAL UPGRADE v1.2.0
 * Reversible decorative shell over the ORIGINAL VHALKOR. Does not mutate legacy
 * geometry/materials, combat, locomotion, cameras, renderer or world lighting.
 * Three.js 0.160.0 / +Y up / forward -Z / 1 unit ~= 1m.
 */
export function createVhalkorVisualUpgrade(THREE, dragon, options = {}) {
  if (!THREE?.Group || !THREE?.Mesh || !dragon?.root || dragon.metadata?.id!=='AF13-VHALKOR')
    throw new Error('Rift-Crown requires the original AF13-VHALKOR dragon');
  const anchors=dragon.anchors;
  if (!anchors?.head || !anchors?.wingLeft || !anchors?.wingRight || !anchors?.body)
    throw new Error('Rift-Crown: missing original model anchors');
  const geos=new Set(), mats=new Set(), ownedRoots=[];
  const clamp=(n,a,b)=>Math.min(b,Math.max(a,Number.isFinite(n)?n:0));
  const damp=(a,b,k,dt)=>a+(b-a)*(1-Math.exp(-k*dt));
  let high=true, disposed=false, time=0;
  const makeMat=(color,metalness=.78,roughness=.3,emissive=0,emissiveIntensity=0,extra={})=>{
    const m=new THREE.MeshStandardMaterial({color,metalness,roughness,emissive,emissiveIntensity,...extra});mats.add(m);return m;
  };
  const C={
    black:makeMat(0x111a29,.83,.29),
    navy:makeMat(0x26354b,.83,.29),
    steel:makeMat(0x50677f,.85,.24),
    silver:makeMat(0x9abcca,.76,.23),
    champagne:makeMat(0xcfaf7f,.82,.25),
    darkGold:makeMat(0x826748,.82,.30),
    cyan:makeMat(0x41bdca,.45,.23,0x08c6e5,1.85),
    bright:makeMat(0x9fefff,.32,.2,0x36e9ff,2.6),
    amethyst:makeMat(0x998cff,.35,.22,0x5b4fff,1.2),
    jet:makeMat(0x0c2d47,.38,.34,0x14b7e8,.9,{transparent:true,opacity:.5,depthWrite:false,side:THREE.DoubleSide}),
  };
  function sub(parent,name){const g=new THREE.Group();g.name=name;parent.add(g);ownedRoots.push(g);return g;}
  function detail(parent,name){const g=sub(parent,name);g.userData.riftHigh=true;return g;}
  function mesh(parent,geometry,material,name){geos.add(geometry);const o=new THREE.Mesh(geometry,material);o.name=name;o.castShadow=false;o.receiveShadow=false;parent.add(o);return o;}
  const boxGeom=new THREE.BoxGeometry(1,1,1),sphereGeom=new THREE.SphereGeometry(1,12,8),octGeom=new THREE.OctahedronGeometry(1,0);
  [boxGeom,sphereGeom,octGeom].forEach(g=>geos.add(g));
  const box=(p,pos,scale,m,name)=>{const o=mesh(p,boxGeom,m,name);o.position.set(...pos);o.scale.set(...scale);return o;};
  const ell=(p,pos,scale,m,name)=>{const o=mesh(p,sphereGeom,m,name);o.position.set(...pos);o.scale.set(...scale);return o;};
  const gem=(p,pos,scale,m,name)=>{const o=mesh(p,octGeom,m,name);o.position.set(...pos);o.scale.set(...scale);return o;};
  function tube(p,a,b,r1,r2,m,name,n=6){
    const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A);
    const g=new THREE.CylinderGeometry(r2,r1,d.length(),n,1);
    const o=mesh(p,g,m,name);o.position.copy(A).add(B).multiplyScalar(.5);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o;
  }
  // Convex, solid wedge with faceted front and physically thick bevel sides.
  function armor(p,a,b,c,thickness,m,name){
    const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
    const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    const mag=Math.hypot(...n)||1,off=n.map(x=>x/mag*thickness);
    const p3=[a,b,c,a.map((x,i)=>x-off[i]),b.map((x,i)=>x-off[i]),c.map((x,i)=>x-off[i])];
    const pos=p3.flat();const ids=[0,1,2,3,5,4,0,3,4,0,4,1,1,4,5,1,5,2,2,5,3,2,3,0];
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(ids);g.computeVertexNormals();
    return mesh(p,g,m,name);
  }
  function ring(p,pos,r,t,m,rotation,name){const g=new THREE.TorusGeometry(r,t,6,36);const o=mesh(p,g,m,name);o.position.set(...pos);o.rotation.set(...rotation);return o;}
  // HEAD: the original skull/eyes/jaw continue to articulate independently.
  const face=sub(anchors.head,'RIFT_CROWN_HEAD');
  const crownHi=detail(face,'RC_HeadMicroplates_HIGH');
  for(const s of [-1,1]){
    armor(face,[s*.66,.86,-1.76],[s*1.71,1.05,-1.02],[s*1.32,.12,-2.75],.20,C.black,'AngularBrowHelmet');
    armor(face,[s*1.38,.50,-1.45],[s*2.46,.41,-.40],[s*1.54,-.59,-2.66],.25,C.steel,'HammerheadCheekGuard');
    armor(face,[s*1.25,-.36,-2.25],[s*2.17,-.60,-2.91],[s*.79,-.64,-3.67],.17,C.navy,'SaberMandibleVane');
    armor(face,[s*.48,1.22,-.70],[s*1.76,2.14,.21],[s*1.36,.88,-1.91],.18,C.darkGold,'CrownBasiliskHornPlating');
    tube(face,[s*1.49,1.20,-.02],[s*2.24,2.43,1.13],.27,.16,C.champagne,'CrownAntlerBase');
    tube(face,[s*2.24,2.43,1.13],[s*2.55,3.13,2.36],.16,.012,C.silver,'CrownAntlerNeedle');
    // Thick orbital socket + defined orange-blue slit: reads as a glowing predator eye.
    ell(face,[s*1.50,.35,-1.56],[.125,.24,.46],C.black,'RecessedPredatorEyeSocket');
    ell(face,[s*1.62,.40,-1.64],[.105,.13,.29],C.bright,'RiftBlueIris');
    ell(face,[s*1.71,.41,-1.77],[.045,.078,.11],C.amethyst,'PupilCore');
    for(let j=0;j<3;j++){
      const z=-.47+j*.46;
      armor(crownHi,[s*1.40,.24,z],[s*1.66,.37,z+.20],[s*1.44,.01,z+.43],.07,C.cyan,'IlluminatedJawGill');
    }
    armor(crownHi,[s*.69,.69,-3.15],[s*1.00,.34,-3.74],[s*.48,.41,-4.04],.055,C.silver,'NoseCuttingEdge');
    gem(crownHi,[s*.61,.53,-3.68],[.11,.11,.28],C.bright,'JetNostril');
  }
  armor(face,[0,1.50,-.21],[-.47,.95,-1.76],[0,.66,-3.30],.13,C.champagne,'CentralForeheadKeelL');
  armor(face,[0,1.50,-.21],[0,.66,-3.30],[.47,.95,-1.76],.13,C.champagne,'CentralForeheadKeelR');
  gem(face,[0,1.31,-1.34],[.22,.30,.38],C.amethyst,'CrownOracleSigil');
  // Lower-jaw attachments move with the *original* jaw pivot.
  const oldJaw=anchors.head.getObjectByName('MotorJaw');
  if(oldJaw){const jawSub=sub(oldJaw,'RC_FangedMandible');
    for(const s of [-1,1]){
      armor(jawSub,[s*.58,-.18,-1.11],[s*1.13,-.35,-2.21],[s*.50,-.24,-3.44],.12,C.steel,'MandibleSharkBlade');
      armor(jawSub,[s*.73,-.10,-2.92],[s*.98,.06,-3.58],[s*.50,-.33,-3.77],.08,C.champagne,'LowerJawTuskGuard');
    }
  }
  // CHEST: armor mounted on movable torso, with no occlusion of riding saddle.
  const torso=sub(anchors.body,'RIFT_CROWN_TORSO');
  const torsoHi=detail(torso,'RC_TorsoOrnaments_HIGH');
  for(const s of [-1,1]){
    armor(torso,[s*2.24,9.27,-2.85],[s*4.81,10.83,-2.07],[s*2.91,7.74,-3.52],.30,C.navy,'SiegeShoulderPauldron');
    armor(torso,[s*2.55,9.57,-2.98],[s*4.51,10.73,-2.11],[s*2.72,8.42,-3.31],.13,C.steel,'SiegeShoulderCap');
    armor(torso,[s*1.28,8.63,-3.79],[s*2.76,7.38,-3.18],[s*.75,6.50,-4.22],.16,C.black,'HeartCageVPlate');
    tube(torso,[s*2.42,8.96,-3.17],[s*3.78,10.08,-2.44],.09,.04,C.champagne,'PauldronSculptedRim');
    gem(torsoHi,[s*3.36,9.84,-2.65],[.17,.10,.28],C.amethyst,'ArcaneShoulderLock');
    for(let i=0;i<3;i++){
      const z=.86+i*1.30;
      armor(torsoHi,[s*2.35,8.85,z],[s*3.18,9.91,z+.27],[s*2.57,8.20,z+.82],.12,i%2?C.black:C.steel,'LayeredRibScythe');
      tube(torsoHi,[s*2.60,9.31,z+.05],[s*3.10,9.82,z+.23],.05,.018,C.cyan,'RibGlyphTrace');
    }
  }
  const heartGuard=sub(anchors.core.parent,'RC_HeartOptics'); // Parent is furnace Group, not the rotating scaled crystal
  const heartRing=ring(heartGuard,[0,0,-.85],1.41,.045,C.champagne,[0,0,.18],'HeartConcentricLock');
  const heartRune=ring(heartGuard,[0,0,-.93],1.23,.028,C.bright,[0,0,-.21],'HeartCorona');
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3;
    gem(heartGuard,[Math.cos(a)*1.31,Math.sin(a)*1.31,-.97],[.10,.17,.10],C.amethyst,'SixSealsOverlay');
  }
  // Large articulated wing claws + new circuitry. All coordinates are LOCAL to legacy wing roots.
  const tips=[];const wingHighGroups=[];
  for(const [s,anchor] of [[-1,anchors.wingLeft],[1,anchors.wingRight]]){
    const w=sub(anchor,s<0?'RIFT_CROWN_PORT_WING':'RIFT_CROWN_STARBOARD_WING');
    const wh=detail(w,'RC_WingIlluminatedRibbing_HIGH');wingHighGroups.push(wh);
    // Use few large blades at LITE to preserve the recognizable silhouette.
    armor(w,[s*4.1,.36,-1.0],[s*8.6,2.05,-2.52],[s*7.25,.28,-.62],.16,C.black,'LeadingScytheArmor');
    armor(w,[s*7.28,1.12,-1.58],[s*12.25,2.13,-1.16],[s*9.4,.50,-.28],.17,C.steel,'LeadingScytheArmor2');
    armor(w,[s*15.53,1.09,-6.30],[s*18.60,1.82,-8.75],[s*17.84,.36,-5.27],.20,C.silver,'WingtipSerratedBladeA');
    armor(w,[s*18.28,.39,-2.42],[s*21.08,.92,-3.80],[s*19.26,-.05,-1.32],.22,C.navy,'WingtipSerratedBladeB');
    armor(w,[s*19.14,-.38,3.10],[s*21.10,-.23,3.43],[s*18.50,-.71,5.08],.16,C.steel,'WingtipSerratedBladeC');
    armor(w,[s*15.84,-1.04,9.62],[s*17.32,-.71,11.03],[s*14.25,-1.25,10.73],.14,C.navy,'WingtipSerratedBladeD');
    // Dynamic hinged feather mounted away from the main wing: changes silhouette during turns.
    const tip=sub(w,'RC_IndependentAileron_'+s);tip.position.set(s*15.7,.94,-6.48);tips.push({g:tip,s});
    armor(tip,[0,0,0],[s*1.91,1.20,-2.0],[s*2.18,-.25,1.22],.19,C.champagne,'WingBladeServo');
    gem(tip,[s*.58,.40,-.46],[.18,.16,.30],C.bright,'AileronRiftSpark');
    for(let j=0;j<5;j++){
      const f=j/4,x=s*(6.8+f*6.1),z=-1.34+f*.55,y=.75+f*.46;
      armor(wh,[x,y,z],[x+s*.78,y+.39,z-.37],[x+s*.42,y+.20,z+1.29],.06,j%2?C.navy:C.darkGold,'SteppedWingLamella');
      tube(wh,[x,y+.11,z+.1],[x+s*.43,y+.14,z+1.34],.060,.008,C.cyan,'WingRunicPath');
    }
    for(let j=0;j<5;j++){
      const pts=[
        [[11.45,1.55,.35],[16.18,1.12,-6.62]],
        [[11.45,1.55,.35],[18.90,.52,-2.52]],
        [[11.45,1.55,.35],[19.60,-.32,3.12]],
        [[10.1,.76,2.20],[16.25,-1.00,9.91]],
        [[7.60,.35,3.83],[10.24,-1.10,12.38]]
      ];
      const [a,b]=pts[j];
      tube(wh,[s*a[0],a[1]+.10,a[2]],[s*b[0],b[1]+.10,b[2]],.055,.012,j%2?C.cyan:C.champagne,'WingVeinLight',5);
    }
    for(let j=0;j<6;j++){
      const x=s*(6.1+j*1.12),z=-1.15+j*.21;
      gem(wh,[x,.65+j*.10,z],[.08,.16,.24],j%3===0?C.amethyst:C.bright,'GlowingFilamentNode');
    }
  }
  // Unobtrusive engines aft of shoulders. Energy grows with flight speed/boost.
  const wake=sub(dragon.root,'RIFT_CROWN_FLIGHT_WAKE');
  const wakeHi=detail(wake,'RC_HighEnergyWake');
  const wakeCones=[];
  for(const s of [-1,1]){
    const socket=ell(wake,[s*2.18,7.72,3.59],[.55,.61,.69],C.black,'AfterburnerSocket');
    ring(wake,[s*2.18,7.72,4.28],.52,.07,C.champagne,[0,0,0],'AfterburnerAnnulus');
    gem(wake,[s*2.18,7.72,4.34],[.34,.36,.38],C.bright,'ArcaneExhaustCore');
    const jet=tube(wake,[s*2.18,7.72,4.38],[s*2.18,7.72,8.95],.28,.012,C.jet,'AetherJetTail',9);
    jet.visible=false;wakeCones.push(jet);
    for(let j=0;j<3;j++){
      const o=tube(wakeHi,[s*(2.18+j*.14),7.72+j*.09,4.4],[s*(2.18+j*.45),7.72+j*.34,7.3+j*.55],.056,.006,j===1?C.amethyst:C.bright,'ExhaustElectricArc',5);
      o.visible=false;wakeCones.push(o);
    }
  }
  const tailDetails=[];
  for(let i=0;i<9;i++){
    const joint=dragon.root.getObjectByName('CaudalServo_'+(i+1));if(!joint)continue;
    const t= i%3===0?sub(joint,'RC_TailSpine_'+i):detail(joint,'RC_TailCircuit_HIGH_'+i);
    const r=Math.max(.23,.91-i*.085);
    armor(t,[-r*.45,r*.63,.40],[0,r*(1.22+(i<4?.28:0)),1.07],[r*.45,r*.63,.40],.11,C.steel,'SawtoothTailCrown');
    gem(t,[0,r*.92,.74],[.08,.15,.24],i%2?C.amethyst:C.bright,'CaudalCrystalSpine');
    tailDetails.push(t);
  }
  // None of these components alter original battle controls or hitboxes.
  function setQuality(mode){
    high=!['low','lite','light'].includes(mode);
    for(const g of ownedRoots){if(g.userData.riftHigh)g.visible=high;}
    return high?'high':'low';
  }
  function update(dt,context={}){
    if(disposed)return;
    dt=clamp(dt,0,.06);time+=dt;
    const s=context.riderState||context.state||{};
    const mode=s.flightMode||'idle';
    const airborne=!!s.airborne, speed=clamp(s.speed||0,0,65),boost=!!(context.boost||context.input?.boost);
    const pace=clamp(speed/56,0,1);
    heartRing.rotation.z+=dt*(.25+pace*.8);
    heartRune.rotation.z-=dt*(.38+pace*1.3);
    C.cyan.emissiveIntensity=1.7+Math.sin(time*3.2)*.17+pace*.65;
    C.bright.emissiveIntensity=2.4+Math.sin(time*4.1)*.25+pace*1.5+(boost&&airborne?.65:0);
    C.amethyst.emissiveIntensity=1.15+Math.sin(time*2.0)*.12+pace*.32;
    for(const {g,s:side} of tips){
      const target=airborne?Math.sin(time*(boost?5.2:3.0)+side*.35)*.10+side*(s.flightMode==='bank'?.09:0):0;
      g.rotation.x=damp(g.rotation.x,target,5,dt);
      g.rotation.z=damp(g.rotation.z,airborne?side*(-.10-pace*.07):0,4,dt);
    }
    for(let j=0;j<wakeCones.length;j++){
      const o=wakeCones[j],active=airborne&&speed>12&&(j%4===0||high);
      o.visible=active;
      if(active){o.scale.y=damp(o.scale.y,.55+pace*(boost?1.75:1.0),6,dt);o.scale.x=.88+Math.sin(time*22+j)*.09;o.scale.z=o.scale.x;}
    }
    C.jet.opacity=high?.48:.70;
  }
  function dispose(){
    if(disposed)return;disposed=true;
    for(const r of ownedRoots.slice().reverse())r.removeFromParent();
    geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());
  }
  setQuality(options.quality||'high');
  return {root:dragon.root,update,setQuality,dispose,
    metadata:Object.freeze({id:'AF13-RIFT-CROWN',version:'1.2.0',baseModel:'AF13-VHALKOR',forward:'-Z',up:'+Y',visualOnly:true})};
}
