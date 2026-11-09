/* AETHER FRONTIER No.17 / interactive integration showcase. Standalone demo logic. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const $error = $('error');
  function errorMessage(text) {
    $error.textContent = text;
    $error.hidden = false;
    $('loading').hidden = true;
  }

  if (!window.THREE || THREE.REVISION !== '160') {
    errorMessage('Three.js 0.160.0 を読み込めません。インターネット接続を確認して再読み込みしてください。');
    return;
  }
  if (typeof window.createAetherModule !== 'function') {
    errorMessage('最適化モジュールが見つかりません。');
    return;
  }

  try {
    start();
  } catch (err) {
    console.error(err);
    errorMessage('初期化に失敗しました: ' + err.message);
  }

  function start() {
    const canvas = $('world');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    // Demo sets this deliberately; the imported optimization module does not.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x080c1d);
    scene.fog = new THREE.FogExp2(0x080c1d, 0.0034);
    const camera = new THREE.PerspectiveCamera(56, 1, 0.15, 470);
    const world = new THREE.Group();
    scene.add(world);
    scene.add(new THREE.HemisphereLight(0xa8eaff, 0x1e2245, 2.05));
    const sun = new THREE.DirectionalLight(0xbddfff, 2.5);
    sun.position.set(-42, 76, 12);
    scene.add(sun);
    const warmSun = new THREE.DirectionalLight(0xffbd8d, 1.25);
    warmSun.position.set(60, 18, -40);
    scene.add(warmSun);

    const monitor = createAetherModule(THREE, {
      renderer, camera, scene,
      quality: 'lite', adaptive: true,
      managePixelRatio: true,
      lodRefreshFrames: 5,
      onError: console.warn
    });
    scene.add(monitor.root);

    let randomState = 17571;
    const rnd = () => ((randomState = (Math.imul(randomState, 1664525) + 1013904223) | 0) >>> 0) / 4294967296;
    const rand = (min, max) => min + rnd() * (max - min);
    const mat = (hex, metal = 0.5, rough = 0.35) => new THREE.MeshStandardMaterial({ color: hex, metalness: metal, roughness: rough });
    const luminous = (color, strength = 1.5) => new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: strength, metalness: 0.22, roughness: 0.32
    });
    const M = {
      body: mat(0x233650, 0.68, 0.3),
      dark: mat(0x0c162b, 0.75, 0.28),
      silver: mat(0x7a9dc1, 0.74, 0.24),
      gold: mat(0xdbaf6f, 0.7, 0.24),
      aqua: luminous(0x24d9de, 2.35),
      violet: luminous(0x7559ec, 1.55),
      amber: luminous(0xef9f51, 2.1),
      glass: new THREE.MeshStandardMaterial({color:0x5dcbf2,emissive:0x1398b2,emissiveIntensity:0.75,transparent:true,opacity:0.66,metalness:0.35,roughness:0.1,depthWrite:false})
    };

    function mesh(geo, material, parent, x=0, y=0, z=0) {
      const obj = new THREE.Mesh(geo, material);
      obj.position.set(x,y,z); parent.add(obj); return obj;
    }
    function ring(parent, radius, tube, color, y, rotX = Math.PI / 2) {
      const o = mesh(new THREE.TorusGeometry(radius,tube,5,96),color,parent,0,y,0);
      o.rotation.x = rotX;
      return o;
    }
    function spire(parent,x,y,z,height,material) {
      const body=mesh(new THREE.CylinderGeometry(0.16,0.8,height,5),material,parent,x,y + height/2,z);
      body.rotation.y=rand(0,6);
      mesh(new THREE.OctahedronGeometry(0.7,0),M.aqua,parent,x,y+height+0.4,z);
      return body;
    }

    // Central levitating atlas dais.
    const core = new THREE.Group();
    world.add(core);
    mesh(new THREE.CylinderGeometry(23.9,24.8,2.5,72),M.body,core,0,-1.2,0);
    mesh(new THREE.CylinderGeometry(23.5,21,0.55,72),M.silver,core,0,0.15,0);
    mesh(new THREE.ConeGeometry(17,18,64),M.dark,core,0,-10.8,0).rotation.x=Math.PI;
    ring(core,23.0,0.28,M.aqua,0.55);
    ring(core,20.9,0.12,M.gold,0.46);
    ring(core,16.6,0.13,M.violet,0.5);
    for (let i=0;i<36;i++) {
      const a=i*Math.PI*2/36;
      const x=Math.cos(a)*20.3,z=Math.sin(a)*20.3;
      mesh(new THREE.BoxGeometry(1.15,1.15,1.15),i%3===0?M.aqua:M.gold,core,x,0.8,z).rotation.y=-a;
    }
    for (let i=0;i<16;i++) {
      const a=i*Math.PI*2/16;
      const x=Math.cos(a)*13.7,z=Math.sin(a)*13.7;
      mesh(new THREE.CylinderGeometry(0.75,1.25,8.5,6),M.body,core,x,4.5,z);
      mesh(new THREE.CylinderGeometry(0.95,0.95,0.4,6),M.gold,core,x,8.95,z);
      mesh(new THREE.BoxGeometry(0.25,6.4,0.25),M.aqua,core,x,4.4,z);
    }
    const tower = new THREE.Group();
    core.add(tower);
    mesh(new THREE.CylinderGeometry(6.2,8.5,4,12),M.silver,tower,0,2,0);
    mesh(new THREE.CylinderGeometry(3.6,5.4,28,12),M.body,tower,0,17.5,0);
    mesh(new THREE.CylinderGeometry(4.8,4.8,1.3,12),M.gold,tower,0,8,0);
    mesh(new THREE.CylinderGeometry(4.8,4.8,1.2,12),M.gold,tower,0,27,0);
    mesh(new THREE.CylinderGeometry(1.6,3.7,13,8),M.silver,tower,0,38,0);
    mesh(new THREE.OctahedronGeometry(5.3,1),M.glass,tower,0,48,0);
    mesh(new THREE.OctahedronGeometry(2.8,0),M.aqua,tower,0,48,0);
    const towerRings = [];
    for (const [r, y, material] of [[6,14,M.aqua],[8,28,M.gold],[8.6,37,M.aqua],[12,47,M.violet]]) {
      towerRings.push(ring(tower,r,0.16,material,y,0));
    }
    const crown = new THREE.Group(); tower.add(crown); crown.position.y=48;
    for (let i=0;i<12;i++) {
      const a=i*Math.PI/6;
      const beam=mesh(new THREE.BoxGeometry(0.18,1.1,5.0),i%2?M.aqua:M.amber,crown,Math.sin(a)*8,Math.cos(a*3)*1.1,Math.cos(a)*8);
      beam.rotation.y=a;
    }

    const islands = [];
    const drift = [];
    for (let i=0;i<6;i++) {
      const a=i*Math.PI/3 + Math.PI/6;
      const R=57;
      const ix=Math.cos(a)*R, iz=Math.sin(a)*R;
      const island = new THREE.Group();
      island.position.set(ix,rand(-1.6,1.7),iz);
      world.add(island); islands.push(island);
      mesh(new THREE.CylinderGeometry(10.7,11.5,2,12),M.body,island,0,-1.4,0);
      mesh(new THREE.ConeGeometry(7.5,11,10),M.dark,island,0,-7.3,0).rotation.x=Math.PI;
      mesh(new THREE.CylinderGeometry(10.2,10.2,0.3,12),M.silver,island,0,-0.17,0);
      ring(island,9.7,0.18,M.aqua,0.04);
      const bridge=mesh(new THREE.BoxGeometry(33.3,0.58,3.3),M.body,world,
        Math.cos(a)*37,0,Math.sin(a)*37);
      bridge.rotation.y=-a;
      const signal=mesh(new THREE.BoxGeometry(32.7,0.08,0.32),M.aqua,world,
        Math.cos(a)*37,0.39,Math.sin(a)*37);
      signal.rotation.y=-a;
      const detailHigh=new THREE.Group(), detailMid=new THREE.Group(), detailLow=new THREE.Group();
      island.add(detailHigh,detailMid,detailLow);
      for (let j=0;j<18;j++) {
        const b=j/18*Math.PI*2;
        const d=(j%3===0)?8.5:6.4;
        const height=rand(2.5,8);
        const x=Math.cos(b)*d,z=Math.sin(b)*d;
        mesh(new THREE.BoxGeometry(0.6,height,0.7),j%4?M.silver:M.gold,detailHigh,x,height/2,z);
        mesh(new THREE.BoxGeometry(0.21,height*0.72,0.9),j%2?M.violet:M.aqua,detailHigh,x,height/2,z);
      }
      for (let j=0;j<7;j++) {
        const b=j/7*Math.PI*2;
        const d=6.5;
        mesh(new THREE.BoxGeometry(1.3,4.0,1.3),M.silver,detailMid,Math.cos(b)*d,2,Math.sin(b)*d);
      }
      mesh(new THREE.CylinderGeometry(2,3,5,6),M.body,detailLow,0,2.7,0);
      const base=mesh(new THREE.CylinderGeometry(2.4,3.2,6.7,8),M.silver,island,0,3.2,0);
      base.rotation.y=rand(0,2);
      mesh(new THREE.OctahedronGeometry(3.3,0),i%2?M.amber:M.aqua,island,0,8.3,0);
      const annulus=ring(island,5.0,0.12,M.gold,6.6,0.2);
      drift.push(annulus);
      monitor.registerLOD({
        id:'island-'+i, anchor:island, hysteresis:0.11,
        levels:[
          {object:detailHigh,maxDistance:57},
          {object:detailMid,maxDistance:112},
          {object:detailLow,maxDistance:Infinity}
        ]
      });
    }

    // Practical stress target: 0..900 individual draw calls, shared geometry/material.
    // Geometries are shared to isolate draw-call pressure instead of memory growth.
    const sharedFin=new THREE.TetrahedronGeometry(0.75,0);
    const stress=new THREE.Group(); world.add(stress);
    const shards=[];
    for (let i=0;i<900;i++) {
      const a=rand(0,Math.PI*2),radius=rand(23,76);
      const obj=mesh(sharedFin,i%4===0?M.aqua:(i%4===1?M.violet:M.silver),stress,
        Math.cos(a)*radius,rand(-5,24),Math.sin(a)*radius);
      obj.rotation.set(rand(0,3),rand(0,6),rand(0,3));
      const s=rand(0.3,1.5);obj.scale.set(s,s*rand(1,2.5),s);
      shards.push(obj);
    }
    let workLevel=0;
    let currentDetail=0.76;
    const workBounds=[115,370,900];
    const glowList=[...towerRings,...drift];
    const mainDetail=new THREE.Group(); core.add(mainDetail);
    for(let i=0;i<40;i++){
      const a=i/40*Math.PI*2;
      spire(mainDetail,Math.sin(a)*17.5,0,Math.cos(a)*17.5,rand(2,5),M.gold);
    }
    const compactGeom=new THREE.IcosahedronGeometry(1.1,1);
    const accents=[];
    for(let i=0;i<180;i++){
      const a=rand(0,Math.PI*2),r=rand(23,65);
      accents.push(mesh(compactGeom,i%2?M.violet:M.aqua,world,
        Math.sin(a)*r,rand(-12,35),Math.cos(a)*r));
    }

    function applyVisualDetail(detail) {
      currentDetail=detail;
      const max = workBounds[workLevel];
      const count = Math.min(900,Math.floor(max*(0.33+0.67*detail)));
      shards.forEach((o,i) => { o.visible = i<count; });
      accents.forEach((o,i) => { o.visible = i < Math.floor(180*(0.35+0.65*detail)); });
      mainDetail.visible = detail > 0.54;
      glowList.forEach((o,i) => { o.visible = detail >=0.57 || i%2===0; });
      $('visibleShards').textContent=String(count);
    }
    const unregisterDemo = monitor.registerClient('scene-demo', {
      setQuality: (mode) => { $('qualityReadout').textContent = mode === 'lite' ? 'LIGHT' : 'HIGH'; },
      setDetail: applyVisualDetail
    });

    // Orbit camera: pointer drag, wheel, and two-pointer pinch, no external controls.
    const focus = new THREE.Vector3(0,9,0);
    let orbitYaw=0.82, orbitPitch=0.38, distance=143;
    const activePointers=new Map();
    let previousPinch=null;
    let interactionSince=0;
    function cameraPosition() {
      const c=Math.cos(orbitPitch);
      camera.position.set(focus.x+Math.sin(orbitYaw)*c*distance,
        focus.y+Math.sin(orbitPitch)*distance,
        focus.z+Math.cos(orbitYaw)*c*distance);
      camera.lookAt(focus);
    }
    cameraPosition();
    function pointerDown(e) {
      if(e.target !== canvas) return;
      canvas.setPointerCapture(e.pointerId);
      activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      interactionSince=performance.now(); previousPinch=null;
    }
    function pointerMove(e) {
      if(!activePointers.has(e.pointerId)) return;
      const prev=activePointers.get(e.pointerId);
      if(activePointers.size===1){
        orbitYaw -= (e.clientX-prev.x)*0.005;
        orbitPitch=THREE.MathUtils.clamp(orbitPitch+(e.clientY-prev.y)*0.004,-0.2,1.35);
      }
      activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(activePointers.size>=2){
        const pts=[...activePointers.values()];
        const gap=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
        if(previousPinch) distance=THREE.MathUtils.clamp(distance*previousPinch/gap,43,225);
        previousPinch=gap;
      }
      interactionSince=performance.now();
      cameraPosition();
    }
    function pointerUp(e){ activePointers.delete(e.pointerId);previousPinch=null; }
    canvas.addEventListener('pointerdown',pointerDown);
    canvas.addEventListener('pointermove',pointerMove);
    canvas.addEventListener('pointerup',pointerUp);
    canvas.addEventListener('pointercancel',pointerUp);
    canvas.addEventListener('wheel',e=>{
      e.preventDefault(); distance=THREE.MathUtils.clamp(distance*Math.exp(e.deltaY*0.001),43,225);
      interactionSince=performance.now();cameraPosition();
    },{passive:false});

    function setMode(mode) {
      monitor.setQuality(mode);
      $('btnLite').setAttribute('aria-pressed',String(mode==='lite'));
      $('btnHigh').setAttribute('aria-pressed',String(mode==='high'));
    }
    $('btnLite').addEventListener('click',()=>setMode('lite'));
    $('btnHigh').addEventListener('click',()=>setMode('high'));
    $('adaptive').addEventListener('change',e=>monitor.setAdaptive(e.target.checked));
    const levelNames=['標準','高負荷','極限テスト'];
    function setWorkload(i){
      workLevel=i;
      $('workload').value=String(i);
      $('workLabel').textContent=levelNames[i];
      applyVisualDetail(currentDetail);
    }
    $('workload').addEventListener('input',e=>setWorkload(Number(e.target.value)));
    $('resetCamera').addEventListener('click',()=>{
      orbitYaw=.82;orbitPitch=.38;distance=143;cameraPosition();
    });
    $('btnLite').setAttribute('aria-pressed','true');
    $('btnHigh').setAttribute('aria-pressed','false');
    setWorkload(0);

    // Display frame times from sampled RAF deltas, not GPU timestamps.
    const graph=$('frameChart');
    const graphCtx=graph.getContext('2d');
    function renderChart(samples, target) {
      const w=graph.width,h=graph.height;
      graphCtx.clearRect(0,0,w,h);
      graphCtx.strokeStyle='rgba(165,201,230,0.24)'; graphCtx.lineWidth=1;
      const scale=42, y=(v)=>h-4-Math.min(v,scale)*((h-8)/scale);
      graphCtx.beginPath(); graphCtx.moveTo(0,y(target)); graphCtx.lineTo(w,y(target)); graphCtx.stroke();
      const arr=samples.slice(-80);
      if(arr.length<2)return;
      const barWidth=w/80;
      arr.forEach((v,i)=>{
        graphCtx.fillStyle=v<=target*1.08?'#40d8d6':(v<=target*1.5?'#ffd28a':'#ff7896');
        graphCtx.fillRect((80-arr.length+i)*barWidth,y(v),Math.max(1,barWidth-0.9),h-4-y(v));
      });
    }
    function setText(id,value){ $(id).textContent=value; }
    function display(m) {
      setText('fps',m.samples ? m.fps.toFixed(1) : '--');
      setText('frameAvg',m.samples ? m.avgMs.toFixed(1) : '--');
      setText('frameP95',m.samples ? m.p95Ms.toFixed(1) : '--');
      setText('renderCPU',m.renderCpuMs.toFixed(1));
      setText('draws',m.drawCalls.toLocaleString('ja-JP'));
      setText('tris',m.triangles.toLocaleString('ja-JP'));
      setText('dpr',m.dpr ? m.dpr.toFixed(2)+'x':'--');
      setText('detail',Math.round(m.detail*100)+'%');
      setText('target',m.targetFPS+'fps');
      setText('tuning',{
        'stable':'安定','decreased':'負荷を軽減','increased':'画質を復帰','at-minimum':'最小設定に到達'
      }[m.tuning]||m.tuning);
      setText('frameCount',m.samples+' samples');
      const cls=m.fps >= m.targetFPS-1?'good':(m.fps >= m.targetFPS-10?'warn':'bad');
      $('fps').className='metric-large '+(m.samples > 25 ? cls:'');
      renderChart(monitor.getHistory(),1000/m.targetFPS);
    }

    let lastRAF=performance.now(), lastUI=0, elapsed=0, running=true;
    function resize() {
      const w=Math.max(1,window.innerWidth), h=Math.max(1,window.innerHeight);
      renderer.setSize(w,h,false);
      camera.aspect=w/h; camera.updateProjectionMatrix();
    }
    window.addEventListener('resize',resize,{passive:true});
    resize();
    $('loading').hidden=true;

    function frame(now) {
      if (!running) return;
      requestAnimationFrame(frame);
      let dt=(now-lastRAF)/1000;
      lastRAF=now;
      if(!Number.isFinite(dt)||dt>0.25)dt=1/60;
      elapsed+=Math.min(dt,0.06);
      const t=elapsed;
      for(let i=0;i<towerRings.length;i++)towerRings[i].rotation.z=t*(i%2?-0.18:0.12);
      drift.forEach((o,i)=>{o.rotation.z=t*(i%2?0.13:-0.11)});
      crown.rotation.y=t*0.17;
      stress.rotation.y=t*0.014;
      if(now-interactionSince>6500){orbitYaw += Math.min(dt,0.05)*0.012;cameraPosition();}
      monitor.beginFrame();
      renderer.render(scene,camera);
      monitor.endFrame();
      monitor.update(dt,{camera,renderer,scene});
      if(now-lastUI>190){display(monitor.getMetrics());lastUI=now;}
    }
    requestAnimationFrame(frame);
    window.addEventListener('pagehide',()=>{
      // Do not permanently dispose on bfcache navigation; page may be resumed.
      running=false;
      unregisterDemo();
      monitor.dispose();
      renderer.dispose();
    },{once:true});
  }
})();
