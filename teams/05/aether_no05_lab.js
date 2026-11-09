/**
 * AETHER FRONTIER / Team No.05
 * ERIDIAN-05: THE NULL CHOIR | Underground research complex
 * Three.js r160 / Y-up / forward -Z / 1 unit ~= 1 meter
 * No scene, camera, renderer, input, or DOM UI ownership.
 * SPDX-License-Identifier: MIT
 */
export function createAetherModule(THREE, options = {}) {
  if (!THREE || !THREE.Group) throw new Error('A Three.js namespace is required');
  const root = new THREE.Group();
  root.name = 'AF_No05_ERIDIAN_Underground_Research';
  const details = new THREE.Group();
  const effects = new THREE.Group();
  root.add(details, effects);
  const mats = {};
  // One shared cube geometry + instancing keep memory and draw calls manageable.
  const unitCube = new THREE.BoxGeometry(1,1,1);
  const M = (name, color, metalness = 0.6, roughness = 0.55, emissive = 0, ei = 0) => {
    const m = new THREE.MeshStandardMaterial({color, metalness, roughness, emissive, emissiveIntensity: ei});
    mats[name] = m; return m;
  };
  const shell = M('shell', 0x111b2a, .7, .58);
  const slate = M('slate', 0x1b2b3a, .66, .5);
  const floorMat = M('floor', 0x1a2731, .54, .83);
  const black = M('black', 0x080f19, .45, .77);
  const steel = M('steel', 0x566878, .83, .33);
  const brass = M('brass', 0x7d6251, .79, .37);
  const cyan = M('cyan', 0x35d8ea, .15, .31, 0x16e9f6, 1.45);
  const cyanDim = M('cyanDim', 0x2d9fb5, .27, .44, 0x1b8194, .55);
  const amber = M('amber', 0xe4a66c, .22, .43, 0xff9335, 1.1);
  const danger = M('danger', 0xbd4d58, .3, .48, 0xb52e3c, .7);
  const purple = M('purple', 0x9067eb, .19, .35, 0x7a55ff, 1.15);
  const gold = M('gold', 0xb6aa79, .8, .28, 0xa57d23, .19);
  const holo = new THREE.MeshBasicMaterial({color: 0x49ddea, transparent: true, opacity: .18, depthWrite: false, side: THREE.DoubleSide});
  const beam = new THREE.MeshBasicMaterial({color: 0x5cdaed, transparent: true, opacity: .23, depthWrite: false, side: THREE.DoubleSide});
  const particleMat = new THREE.MeshBasicMaterial({color: 0x9be9ff, transparent: true, opacity: .85, depthWrite: false});
  const interactables = [];
  const wallColliders = [];
  const occluders = [];
  const obstacles = [{x:0,z:-37.5,r:3.2},{x:0,z:-144,r:5.8}];
  const animations = [];
  const qualityNodes = [];
  let quality = 'high', t = 0, disposed = false;
  const state = {valveA:false, valveB:false, cooling:false, tuning:0, archive:false, gateOpen:false, awakened:false, secret:false};
  const areas = [
    {id:'arrival', x1:-11,x2:11,z1:8,z2:25,h:7},
    {id:'access',x1:-6,x2:6,z1:-24,z2:8,h:6},
    {id:'hub',x1:-19,x2:19,z1:-50,z2:-24,h:12},
    {id:'westTunnel',x1:-53,x2:-19,z1:-39,z2:-32,h:6},
    {id:'westLab',x1:-74,x2:-53,z1:-52,z2:-19,h:9},
    {id:'eastTunnel',x1:19,x2:53,z1:-39,z2:-32,h:6},
    {id:'eastLab',x1:53,x2:74,z1:-52,z2:-19,h:9},
    {id:'archiveTunnel',x1:-6,x2:6,z1:-81,z2:-50,h:6},
    {id:'archive',x1:-21,x2:21,z1:-104,z2:-81,h:10},
    {id:'vaultTunnel',x1:-6,x2:6,z1:-124,z2:-104,h:7},
    {id:'vault',x1:-25,x2:25,z1:-163,z2:-124,h:17},
    {id:'service',x1:-35,x2:-19,z1:-50,z2:-42,h:6}
  ];
  function box(parent, x, y, z, sx, sy, sz, material, rot = 0) {
    const o = new THREE.Mesh(unitCube, material);
    o.position.set(x,y,z); o.rotation.y=rot; o.scale.set(sx,sy,sz); parent.add(o); return o;
  }
  function cylinder(parent,x,y,z,top,bottom,h,material,segments=12) {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(top,bottom,h,segments),material);
    o.position.set(x,y,z);parent.add(o);return o;
  }
  function sphere(parent,x,y,z,r,material,detail=0) {
    const o=new THREE.Mesh(new THREE.IcosahedronGeometry(r,detail),material);
    o.position.set(x,y,z);parent.add(o);return o;
  }
  function ring(parent,x,y,z,r,tube,material,rotX=0,rotY=0) {
    const o=new THREE.Mesh(new THREE.TorusGeometry(r,tube,5,44),material);
    o.position.set(x,y,z);o.rotation.set(rotX,rotY,0);parent.add(o);return o;
  }
  const seed = {v:785421};
  const rand=()=>((seed.v=(1664525*seed.v+1013904223)>>>0)/4294967296);
  function lineSegmentsFromEdges(x1,z1,x2,z2,axis,exclude) {
    let intervals = [[axis==='x'?z1:x1,axis==='x'?z2:x2]];
    const wallCoord = axis==='x'?x1:z1;
    for (const a of areas) {
      if(a.id===exclude)continue;
      let touching = axis==='x' ? (a.x1 < wallCoord+.03 && a.x2 > wallCoord-.03) : (a.z1 < wallCoord+.03 && a.z2 > wallCoord-.03);
      if (!touching) continue;
      const cutLo=axis==='x'?a.z1:a.x1, cutHi=axis==='x'?a.z2:a.x2;
      const next=[];
      for(const [lo,hi] of intervals) {
        if(cutHi<=lo+.01||cutLo>=hi-.01) next.push([lo,hi]);
        else {if(cutLo>lo+.02)next.push([lo,Math.min(cutLo,hi)]);if(cutHi<hi-.02)next.push([Math.max(cutHi,lo),hi]);}
      }
      intervals=next;
    }
    return intervals.filter(([a,b])=>b-a>.02);
  }
  function wallRect(x,z,sx,sz,h) {
    const wall = box(root,x,h/2,z,sx,h,sz,shell);
    occluders.push(wall);
    wallColliders.push({x1:x-sx/2,x2:x+sx/2,z1:z-sz/2,z2:z+sz/2});
    return wall;
  }
  for(const a of areas) {
    const cx=(a.x1+a.x2)/2,cz=(a.z1+a.z2)/2,w=a.x2-a.x1,d=a.z2-a.z1;
    box(root,cx,-.24,cz,w,.48,d,floorMat);
    box(root,cx,a.h+.25,cz,w,.5,d,black);
    // Each room owns only its perimeter. Shared openings are carved out automatically.
    for (const side of [a.x1,a.x2]) {
      const sections=lineSegmentsFromEdges(side,a.z1,side,a.z2,'x',a.id);
      for(const [lo,hi] of sections) {
        wallRect(side,(lo+hi)/2,.48,hi-lo,a.h);
        box(details,side+(side===a.x1?.3:-.3),.35,(lo+hi)/2,.24,.22,hi-lo,cyanDim);
      }
    }
    for(const side of [a.z1,a.z2]) {
      const sections=lineSegmentsFromEdges(a.x1,side,a.x2,side,'z',a.id);
      for(const [lo,hi] of sections) {
        wallRect((lo+hi)/2,side,hi-lo,.48,a.h);
        box(details,(lo+hi)/2,.35,side+(side===a.z1?.3:-.3),hi-lo,.22,.24,cyanDim);
      }
    }
    // Ribbed alloy flooring, ceiling conduits, and perimeter light channels.
    box(details,a.x1+.5,.05,cz,.13,.14,d,steel);
    box(details,a.x2-.5,.05,cz,.13,.14,d,steel);
    box(details,cx,.03,a.z1+.55,w,.09,.13,brass);
    box(details,cx,.03,a.z2-.55,w,.09,.13,brass);
    if(d>12) {
      const count=Math.min(14,Math.floor(d/4));
      for(let i=1;i<count;i++){
        const z=a.z1+(i/count)*d;
        box(details,cx,-.015,z,w-.8,.028,.08,steel);
      }
    }
    if(w>12){
      box(details,a.x1+.95,a.h-.28,cz,.13,.14,d,cyanDim);
      box(details,a.x2-.95,a.h-.28,cz,.13,.14,d,cyanDim);
    }
  }
  function arch(x,z,w,h,axis='z',material=steel){
    const p = new THREE.Group();p.position.set(x,0,z);root.add(p);
    if(axis==='z') {
      box(p,-w/2+.3,h/2,0,.45,h,.4,material);
      box(p,w/2-.3,h/2,0,.45,h,.4,material);
      box(p,0,h-.28,0,w,.55,.43,material);
      box(p,0,h-.57,-.24,w-.85,.09,.11,cyanDim);
    } else {
      box(p,0,h/2,-w/2+.3,.4,h,.45,material);
      box(p,0,h/2,w/2-.3,.4,h,.45,material);
      box(p,-.24,h-.28,0,.11,.55,w,material);
    }
  }
  for(const z of [5,-1,-8,-15,-22,-55,-62,-69,-76,-106,-119]) arch(0,z,11.4,5.7,'z');
  for(const x of [-23,-31,-39,-47,23,31,39,47]) arch(x,-35.5,6.6,5.5,'x');
  arch(0,-79,12,6.7);arch(0,-125,12,8);
  function plinth(x,z,w=2,d=2){
    box(root,x,.22,z,w,.44,d,slate);
    box(root,x,.48,z,w-.19,.12,d-.19,steel);
    box(details,x,.51,z,w-.6,.05,d-.6,cyanDim);
  }
  function terminal(id,title,x,z,material=cyan,run,extra={}) {
    const g=new THREE.Group();g.position.set(x,0,z);root.add(g);
    box(g,0,.85,0,1.2,1.7,.9,steel);
    box(g,0,1.85,-.17,1.7,.9,.35,black);
    const panel=box(g,0,1.85,-.39,1.4,.62,.05,material);
    panel.rotation.x=-.16;
    box(details,x,2.42,z-.25,1.75,.06,.17,brass);
    const item = {id,title,position:new THREE.Vector3(x,1.5,z),range:3.1,run,mesh:panel,...extra};
    interactables.push(item);
    return g;
  }
  function scannerColumn(x,z,height=4.5,material=cyan){
    const g=new THREE.Group();g.position.set(x,0,z);root.add(g);
    cylinder(g,0,.28,0,1.25,1.4,.56,steel,10);
    cylinder(g,0,height/2,0,.53,.57,height-.7,black,10);
    cylinder(g,0,height-.2,0,1.2,1.1,.42,steel,10);
    for(let i=0;i<4;i++){
      ring(g,0,.75+i*(height-1.3)/3,0,.55,.055,material,Math.PI/2);
    }
    return g;
  }
  function makeSign(text,subtitle,x,y,z,width=4.4,rotate=0){
    if(typeof document==='undefined')return;
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=160;
    const ctx=canvas.getContext('2d');if(!ctx)return;
    ctx.fillStyle='#091b2a';ctx.fillRect(0,0,512,160);
    ctx.fillStyle='#174956';ctx.fillRect(7,8,498,3);ctx.fillRect(7,148,498,3);
    ctx.fillStyle='#7eeef0';ctx.font='bold 43px monospace';ctx.textAlign='center';ctx.fillText(text,256,69);
    ctx.fillStyle='#c6d5da';ctx.font='21px sans-serif';ctx.fillText(subtitle,256,111);
    const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
    const mat=new THREE.MeshBasicMaterial({map:tex,transparent:false,side:THREE.DoubleSide});
    const board=new THREE.Mesh(new THREE.PlaneGeometry(width,width*160/512),mat);
    board.position.set(x,y,z);board.rotation.y=rotate;root.add(board);
  }
  makeSign('ERIDIAN-05','地下研究機構 / 第五観測層',0,4.1,14,6);
  makeSign('CENTRAL NEXUS','中央掘削ハブ',0,6,-28,6);
  makeSign('CRYO SECTOR','低温循環実験区',-61,5,-19.55,4);
  makeSign('HARMONICS','量子同調実験区',62,5,-19.55,4);
  makeSign('MNEMONIC ARCHIVE','記憶保存施設',0,6,-82,5.8);
  makeSign('THE NULL CHOIR','古代核・最深封鎖区',0,10,-128,6);
  // Arrival: pressure-door, light bars, containment shutters.
  for(const x of [-8,-5,5,8]) {
    box(root,x,3,22,.7,5.4,.9,slate);
    box(details,x,5.2,22,.16,.8,1.2,cyanDim);
  }
  cylinder(details,0,.1,17,2.3,2.3,.08,brass,24);
  for(let k=0;k<3;k++)ring(details,0,.16,17,2.4+k*.2,.044,cyanDim,Math.PI/2);
  // Central digging shaft: ancient angular monolith beneath rotating survey rings.
  cylinder(root,0,.35,-37.5,5.2,5.7,.7,brass,12);
  cylinder(root,0,.68,-37.5,4.2,4.7,.34,black,12);
  const monolith = new THREE.Group();monolith.position.set(0,2.85,-37.5);root.add(monolith);
  const stone=sphere(monolith,0,0,0,2.55,purple,1);
  stone.scale.set(.77,1.62,.77);
  const shard=sphere(monolith,0,0,0,2.85,gold,0);shard.scale.set(.48,1.6,.52);shard.rotation.z=.2;
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3;
    const r=ring(root,Math.cos(a)*4.2,2.5,-37.5+Math.sin(a)*4.2,.56,.09,cyanDim,.5,a);
    r.scale.set(.75,1.15,1);
  }
  const scanRing1=ring(root,0,5.1,-37.5,4.4,.11,amber,Math.PI/2);
  const scanRing2=ring(root,0,5.9,-37.5,3.8,.09,cyan,Math.PI/2);
  animations.push((dt,time)=>{
    monolith.rotation.y=time*.16;
    monolith.position.y=2.85+Math.sin(time*.8)*.22;
    scanRing1.rotation.z=time*.14;
    scanRing2.rotation.z=-time*.20;
  });
  for(const x of [-15,15])for(const z of [-44,-30])scannerColumn(x,z,7.8,amber);
  for(const [x,z] of [[-12,-37],[12,-37],[-8,-46],[8,-46]]){
    box(root,x,.8,z,2.4,1.6,1.5,slate);
    box(details,x,1.65,z,2.1,.12,1.22,cyanDim);
    box(details,x,1.85,z,.45,.25,.3,amber);
  }
  // West lab: observation cylinders, cryogenic specimens and paired coolant valves.
  for(let i=0;i<4;i++){
    const x=-68+(i%2)*7, z=-45+Math.floor(i/2)*18;
    plinth(x,z,3.4,3.4);
    const tube=new THREE.Group();tube.position.set(x,0,z);root.add(tube);
    cylinder(tube,0,3.15,0,1.13,1.13,5.1,new THREE.MeshStandardMaterial({color:0x55a1a9,metalness:.36,roughness:.17,transparent:true,opacity:.23,depthWrite:false}),16);
    cylinder(tube,0,5.75,0,1.42,1.38,.65,steel,12);
    cylinder(tube,0,.65,0,1.4,1.4,.55,steel,12);
    for(let k=0;k<5;k++)ring(tube,0,1.1+k*1.1,0,1.12,.05,cyanDim,Math.PI/2);
    const sample=sphere(tube,0,3.3,0,.8,i%2?purple:cyan,0);
    sample.scale.set(.55,1.55,.5);sample.rotation.z=.3+i*.4;
    animations.push((dt,time)=>{sample.rotation.y=time*.26+i;sample.position.y=3.3+Math.sin(time*.75+i)*.15;});
  }
  function valve(x,z,material) {
    plinth(x,z,2.6,2.6);
    cylinder(root,x,1.25,z,.54,.72,2.1,steel,10);
    ring(root,x,2.22,z,1.07,.14,material,0,0);
    for(let i=0;i<6;i++){const a=i*Math.PI/3;box(root,x+Math.cos(a)*1.02,2.22,z+Math.sin(a)*1.02,.25,.28,.25,brass);}
  }
  valve(-57,-47,amber);valve(-57,-24,cyan);
  function msg(text,type='message'){if(typeof options.onEvent==='function')options.onEvent({type,text,state:{...state}});}
  const updatePanel=(id,mat)=>{const v=interactables.find(v=>v.id===id);if(v)v.mesh.material=mat;};
  terminal('valveA','冷却弁 A を解放',-57,-46,amber,()=>{
    if(state.valveA){msg('冷却弁 A はすでに解放されている。');return;}
    state.valveA=true;updatePanel('valveA',cyan);msg('冷却弁 A：復旧。第二弁で循環を開始できる。');
  });
  terminal('valveB','冷却弁 B を起動',-57,-25,cyan,()=>{
    if(state.cooling){msg('冷却回路は正常に稼働している。');return;}
    if(!state.valveA){msg('循環圧力不足。先に冷却弁 A を解放する必要がある。','warning');return;}
    state.valveB=true;state.cooling=true;msg('第1封印解除：低温循環系が再起動した。','success');
  });
  // East lab: three-phase quantum resonance array, requiring a readable sequence.
  for(let i=0;i<3;i++){
    const z=-46+i*10;
    const x=66;
    plinth(x,z,4.5,4.5);
    scannerColumn(x,z,5.8,purple);
    const outer=ring(root,x,3.2,z,2.2,.12,purple,.2,i*.7);
    animations.push((dt,time)=>{outer.rotation.y=time*(i%2?-.28:.22)+i;outer.rotation.x=.25+Math.sin(time*.5+i)*.10;});
    terminal('tone'+(i+1),'同調器 '+(i+1)+' を設定',59,z,purple,()=>{
      if(state.tuning>=i+1){msg('同調器 '+(i+1)+'：同期済み。');return;}
      if(state.tuning!==i){msg('位相が不一致。制御盤の番号順に 1 → 2 → 3 で同期してほしい。','warning');return;}
      state.tuning=i+1;updatePanel('tone'+(i+1),cyan);
      msg(i===2?'第2封印解除：三重位相が揃った。':'位相 '+(i+1)+'/3 同期完了。',i===2?'success':'message');
    });
  }
  makeSign('SEQUENCE 1 > 2 > 3','位相同調は番号順に起動すること',66,6.65,-52.1,5.6);
  // Archive: stasis memory blades, transcriber dais, optional lore cassette.
  for(let i=0;i<8;i++){
    const x=(i%2?16:-16),z=-85-Math.floor(i/2)*4.3;
    box(root,x,2.5,z,3.0,4.7,1.9,steel);
    box(root,x,2.5,z+(i%2?-1.04:1.04),2.5,3.8,.12,black);
    box(details,x,2.5,z,1.1,2.95,2.04,purple);
    box(details,x,4.6,z,2.6,.17,1.94,cyanDim);
  }
  cylinder(root,0,.3,-93,4.8,5.2,.6,steel,16);
  cylinder(root,0,.66,-93,3.7,4.0,.17,black,16);
  const archiveHalo=ring(root,0,4.4,-93,3.45,.09,purple,Math.PI/2);
  animations.push((dt,time)=>{archiveHalo.rotation.z=time*.14;});
  const glyphs=[];
  for(let i=0;i<10;i++){
    const a=i*Math.PI*2/10;
    const s=box(effects,Math.cos(a)*3.15,3.5,-93+Math.sin(a)*3.15,.18,.44,.08,cyanDim);
    glyphs.push(s);
  }
  animations.push((dt,time)=>{for(let i=0;i<glyphs.length;i++)glyphs[i].position.y=3.5+Math.sin(time*1.4+i*.9)*.27;});
  terminal('archive','記憶アーカイブを復号',0,-99,purple,()=>{
    if(state.archive){msg('記憶結晶：記録を保持中。');return;}
    state.archive=true;updatePanel('archive',cyan);
    msg('第3封印解除：「研究対象」は遺物ではなく、眠る古代知性だった。','success');
  });
  // Hidden maintenance bay, only accessible through the west side of the hub.
  for(let i=0;i<4;i++){
    box(root,-32+i*3,.85,-47.6,1.7,1.4,1.7,black);
    box(details,-32+i*3,1.62,-47.6,1.5,.13,1.5,amber);
  }
  terminal('secret','封印された研究記録を再生',-29,-44.2,amber,()=>{
    if(state.secret){msg('記録 No.05：この施設は研究所ではなく、巨大な受信機でもあった。');return;}
    state.secret=true;msg('機密記録 05：観測者が遺物を見つめるとき、遺物も観測者を記録する。','secret');
  });
  // Actual vault barrier: fully animated physical shutter, with world collision.
  const gate=new THREE.Group();gate.position.set(0,0,-113);root.add(gate);
  const gateDoor=box(gate,0,3.45,0,11.6,6.9,.72,slate);
  for(let i=-4;i<=4;i++) box(gateDoor,i*.105,0,.52,.055,.85,.22,cyanDim); // inset strip attached to door (local scale)
  box(root,-5.65,4.2,-113,1.1,8.1,1.2,steel);
  box(root,5.65,4.2,-113,1.1,8.1,1.2,steel);
  box(root,0,8,-113,13,1.0,1.4,steel);
  const gateBarrier={x1:-6,x2:6,z1:-113.55,z2:-112.45};
  terminal('gate','最深部隔壁の解放',3.8,-108.2,amber,()=>{
    if(state.gateOpen){msg('隔壁はすでに開放されている。');return;}
    if(!state.cooling||state.tuning!==3||!state.archive){
      const done=Number(state.cooling)+Number(state.tuning===3)+Number(state.archive);
      msg('隔壁封印：'+done+'/3。低温循環・量子同調・記憶復号の3系統が必要。','warning');return;
    }
    state.gateOpen=true;msg('3系統の封印解除を確認。最深部「無音の合唱室」への隔壁が開いた。','success');
  });
  animations.push((dt,time)=>{
    const target=state.gateOpen?8.25:3.45;
    gateDoor.position.y+=(target-gateDoor.position.y)*Math.min(1,dt*2.5);
  });
  // Final chamber: cylindrical excavation ring, suspended seven-faceted core.
  cylinder(root,0,-.02,-144,9.2,9.7,.28,brass,24);
  for(let i=0;i<4;i++)ring(root,0,.05,-144,7.4+i*.48,.075,i%2?cyanDim:amber,Math.PI/2);
  for(let i=0;i<8;i++) {
    const a=i*Math.PI*2/8;
    const x=Math.cos(a)*18,z=-144+Math.sin(a)*12;
    scannerColumn(x,z,12,i%2?purple:amber);
    const s=sphere(details,x,10.2,z,1.0,cyanDim,0);
    s.scale.set(.55,1.7,.55);
  }
  const coreGroup=new THREE.Group();coreGroup.position.set(0,7,-144);root.add(coreGroup);
  const core=sphere(coreGroup,0,0,0,4.4,purple,1);
  core.scale.set(.78,1.45,.82);
  const coreCrack=sphere(coreGroup,0,0,0,4.65,cyanDim,0);
  coreCrack.scale.set(.58,1.24,.68);coreCrack.rotation.set(.3,.3,.1);
  const coreRings=[];
  for(let i=0;i<4;i++){
    const r=ring(coreGroup,0,0,0,5.8+i*.5,.09,i%2?cyan:gold,Math.PI/2+i*.4,i*.7);
    coreRings.push(r);
  }
  animations.push((dt,time)=>{
    coreGroup.rotation.y=time*.075;
    coreGroup.position.y=7+Math.sin(time*.65)*.35;
    for(let i=0;i<coreRings.length;i++){
      coreRings[i].rotation.y=time*(i%2?.19:-.15)+i*.9;
      coreRings[i].rotation.x=Math.PI/2+i*.4+Math.sin(time*.45+i)*.11;
    }
    if(state.awakened)coreGroup.scale.setScalar(1.08+Math.sin(time*1.5)*.07);
  });
  const rays=[];
  for(let i=0;i<8;i++){
    const angle=i*Math.PI/4;
    const p=box(effects,Math.cos(angle)*7.5,7.7,-144+Math.sin(angle)*7.5,.07,12,.07,cyanDim);
    rays.push(p);
  }
  terminal('core','古代中枢に接続する',0,-156.6,cyan,()=>{
    if(state.awakened){msg('中枢応答：接続は維持されている。');return;}
    if(!state.gateOpen){msg('接続に必要な封印解除が完了していない。','warning');return;}
    state.awakened=true;updatePanel('core',amber);
    msg('最深部到達。古代知性「NULL CHOIR」が目覚め、都市の真下で空を呼び始めた。','complete');
  });
  // Small suspended motes; available only in high quality.
  for(let i=0;i<30;i++){
    const chamber=i<12?'hub':i<22?'archive':'vault';
    const base=chamber==='hub'?{x:0,z:-37.5,rx:14,rz:9,h:9}:chamber==='archive'?{x:0,z:-93,rx:17,rz:8,h:7}:{x:0,z:-144,rx:19,rz:14,h:12};
    const x=base.x+(rand()*2-1)*base.rx,z=base.z+(rand()*2-1)*base.rz;
    const y=1.5+rand()*base.h;
    const p=sphere(effects,x,y,z,.09+rand()*.09,particleMat);
    const phase=rand()*7;
    animations.push((dt,time)=>{p.position.y=y+Math.sin(time*(.6+phase*.07)+phase)*.45;});
  }
  // Collapse stationary boxes into material-specific GPU instancing batches.
  // Dynamic machines, player interactions and raycast collision walls remain independent.
  function batchStaticBoxes(group){
    const bins=new Map();
    for(const mesh of [...group.children]){
      if(!mesh.isMesh||mesh.geometry!==unitCube||occluders.includes(mesh))continue;
      let items=bins.get(mesh.material);
      if(!items){items=[];bins.set(mesh.material,items);}
      mesh.updateMatrix();items.push({matrix:mesh.matrix.clone(),mesh});
    }
    for(const [material,items] of bins){
      if(items.length<2)continue;
      const instanced=new THREE.InstancedMesh(unitCube,material,items.length);
      instanced.name='Static batch / '+items.length+' elements';
      for(let i=0;i<items.length;i++){
        instanced.setMatrixAt(i,items[i].matrix);
        group.remove(items[i].mesh);
      }
      instanced.instanceMatrix.needsUpdate=true;
      instanced.computeBoundingSphere();
      group.add(instanced);
    }
  }
  batchStaticBoxes(root);batchStaticBoxes(details);
  // Quality policy changes only local geometry/FX, never renderer pixel ratios or scene settings.
  function setQuality(mode='high'){
    quality = mode==='low'?'low':'high';
    details.visible=quality==='high';
    effects.visible=quality==='high';
    root.traverse(o=>{if(o.isMesh){o.frustumCulled=true;}});
    return quality;
  }
  function isWalkable(x,z,radius=.40){
    if(disposed)return false;
    if(!areas.some(a=>x>=a.x1&&x<=a.x2&&z>=a.z1&&z<=a.z2))return false;
    for(const b of wallColliders){
      const px=Math.max(b.x1,Math.min(x,b.x2)),pz=Math.max(b.z1,Math.min(z,b.z2));
      if((x-px)**2+(z-pz)**2<radius*radius) return false;
    }
    if(!state.gateOpen){const b=gateBarrier;const px=Math.max(b.x1,Math.min(x,b.x2)),pz=Math.max(b.z1,Math.min(z,b.z2));if((x-px)**2+(z-pz)**2<radius*radius)return false;}
    for(const p of obstacles){if(Math.hypot(x-p.x,z-p.z)<p.r+radius)return false;}
    return true;
  }
  function getNearestInteractable(position,maxDistance=3.15){
    if(!position)return null;
    let found=null,dist=maxDistance;
    for(const a of interactables){
      const d=Math.hypot(a.position.x-position.x,a.position.z-position.z);
      if(d<Math.min(dist,a.range||maxDistance)){found=a;dist=d;}
    }
    return found?{id:found.id,title:found.title,distance:dist,position:found.position.clone()}:null;
  }
  function interact(position,maxDistance=3.15){
    const next=getNearestInteractable(position,maxDistance);
    if(!next)return {ok:false,reason:'操作可能な設備が近くにない'};
    const item=interactables.find(a=>a.id===next.id);
    item.run();
    return {ok:true,id:item.id,state:{...state}};
  }
  function getObjective(){
    if(state.awakened)return '探索完了：古代知性との接続に成功';
    if(state.gateOpen)return '最深部へ進み、古代中枢に接続する';
    if(state.cooling&&state.tuning===3&&state.archive)return 'アーカイブ奥の隔壁制御盤で最深部を解放する';
    return '3系統の封印を解除：西の冷却 / 東の同調 / 南の記憶';
  }
  function update(dt=0,context={}) {
    if(disposed)return;
    dt=Math.max(0,Math.min(.05,Number(dt)||0));t+=dt;
    for(const a of animations)a(dt,t,context);
  }
  function dispose(){
    if(disposed)return;disposed=true;
    const gs=new Set(),ms=new Set(),ts=new Set();
    root.traverse(obj=>{
      if(obj.geometry)gs.add(obj.geometry);
      const list=Array.isArray(obj.material)?obj.material:[obj.material];
      for(const m of list){if(!m)continue;ms.add(m);if(m.map)ts.add(m.map);}
    });
    gs.forEach(g=>g.dispose());ts.forEach(tx=>tx.dispose());ms.forEach(m=>m.dispose());
    root.clear();occluders.length=0;wallColliders.length=0;interactables.length=0;
  }
  const api={
    root, update, setQuality, dispose, isWalkable, interact, getNearestInteractable,
    getObjective, getState:()=>({...state}), getSpawnPoint:()=>new THREE.Vector3(0,1.72,19),
    getAreas:()=>areas.map(a=>({...a})), getOccluders:()=>occluders,
    getQuality:()=>quality,
    getNavigationMarkers:()=>[
      {label:'中央ハブ',x:0,z:-37},
      {label:'冷却研究区画',x:-62,z:-36},
      {label:'量子研究区画',x:63,z:-36},
      {label:'記憶アーカイブ',x:0,z:-93},
      {label:'最深部',x:0,z:-146}
    ]
  };
  setQuality(options.quality||'high');
  return api;
}
export default createAetherModule;
