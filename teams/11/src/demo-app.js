// Structured-source demo entrypoint for Cloudflare Pages (no build tools).
// This same app code is embedded in each self-contained demo HTML (except for Three.js runtime).

async function startDemo() {
  const bootEl = document.getElementById('boot');
  const errorEl = document.getElementById('error');
  let THREE;
  try {
    THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
  } catch (firstError) {
    try {
      THREE = await import('https://unpkg.com/three@0.160.0/build/three.module.js');
    } catch (secondError) {
      bootEl.classList.add('hidden');
      errorEl.style.display = 'block';
      errorEl.textContent = 'Three.js 0.160.0 の読み込みに失敗しました。インターネット接続を確認してページを再読み込みしてください。外部ライブラリはjsDelivr / unpkgの順で読み込みます。';
      console.error('Three.js imports failed:', firstError, secondError);
      return;
    }
  }

  const $ = id => document.getElementById(id);
  const viewport = $('viewport');
  const isTouch = matchMedia('(pointer: coarse)').matches;
  const isMobile = window.innerWidth <= 720 || isTouch;
  const preset = document.documentElement.dataset.preset || 'auto';
  let quality = preset === 'high' ? 'high' : preset === 'low' ? 'low' : isMobile ? 'low' : 'high';
  let mode = 'friendly';
  let paused = false;
  let time = 0;
  let counter = 0;
  let fpsAccumulator = 0;
  let measuredFPS = 0;
  let deploymentOverride = null;
  let noticeTimeout = 0;
  let previousScan = 0;

  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', alpha: false });
  renderer.setClearColor(0x06121e, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.14;
  renderer.shadowMap.enabled = false;
  renderer.domElement.setAttribute('aria-label', 'SERAPH-11の3D飛行・変形デモ。ドラッグして視点変更。');
  viewport.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x06131f);
  scene.fog = new THREE.FogExp2(0x06131f, .023);
  const camera = new THREE.PerspectiveCamera(49, 1, .05, 125);
  scene.add(new THREE.HemisphereLight(0xb0ddef, 0x10202d, 1.55));
  const key = new THREE.DirectionalLight(0xe2f5f6, 2.20);
  key.position.set(-4, 8, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x4fd6df, 1.25);
  rim.position.set(5, 2, -5);
  scene.add(rim);
  const warm = new THREE.PointLight(0xd18a57, 36, 14, 2);
  warm.position.set(-5, .9, -5);
  scene.add(warm);

  const stage = new THREE.Group();
  stage.name = 'DemoOnly_Background_SeparateFrom_ExportedDrone';
  scene.add(stage);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x101e2a, roughness: .92, metalness: .20 });
  const ground = new THREE.Mesh(new THREE.CircleGeometry(20, 92), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -.045;
  stage.add(ground);
  const grid = new THREE.GridHelper(34, 34, 0x315565, 0x17313e);
  grid.position.y = .004;
  grid.material.transparent = true;
  grid.material.opacity = .26;
  stage.add(grid);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x4da6a6, transparent: true, opacity: .40, depthWrite: false });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0x927a58, metalness: .73, roughness: .39 });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x4ed9dc, transparent: true, opacity: .54, depthWrite: false, blending: THREE.AdditiveBlending });
  const floorGroup = new THREE.Group();
  floorGroup.position.y = .045;
  stage.add(floorGroup);
  for (const [rad, width, mat] of [[.80,.018,glowMat],[1.3,.031,goldMat],[1.43,.006,ringMat],[2.28,.010,ringMat],[3.6,.013,ringMat]]) {
    const g = new THREE.Mesh(new THREE.TorusGeometry(rad,width,6,96),mat);
    g.rotation.x = -Math.PI / 2;
    floorGroup.add(g);
  }
  const dais = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.32, .20, 32),
    new THREE.MeshStandardMaterial({ color: 0x142837, metalness: .62, roughness: .50 }));
  dais.position.y = -.14;
  stage.add(dais);
  const daisTop = new THREE.Mesh(new THREE.CylinderGeometry(1.13, 1.13, .016, 32),
    new THREE.MeshStandardMaterial({ color: 0x213949, metalness: .47, roughness: .68 }));
  daisTop.position.y = -.025;
  stage.add(daisTop);

  // Restrained background pylons suggest the ancient lab without depending on other teams.
  const pylons = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * 2 * Math.PI;
    const x = Math.cos(a) * 7.5, z = Math.sin(a) * 7.5;
    const h = 2.0 + (i % 3) * .85;
    const column = new THREE.Mesh(new THREE.CylinderGeometry(.25, .45, h, 5),
      new THREE.MeshStandardMaterial({ color: 0x172935, roughness: .6, metalness: .52, flatShading: true }));
    column.position.set(x, h / 2 - .2, z);
    column.rotation.y = a;
    pylons.add(column);
    const trim = new THREE.Mesh(new THREE.CylinderGeometry(.275, .275, .042, 5), goldMat);
    trim.position.set(x, h - .28, z);
    pylons.add(trim);
    const lamp = new THREE.Mesh(new THREE.OctahedronGeometry(.13, 0), glowMat);
    lamp.position.set(x, h + .02, z);
    pylons.add(lamp);
  }
  stage.add(pylons);
  const starCount = 620;
  const starPos = new Float32Array(starCount * 3);
  let seed = 918711;
  const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < starCount; i++) {
    const a = rand() * Math.PI * 2, r = 12 + rand() * 55;
    starPos[3 * i] = Math.cos(a) * r;
    starPos[3 * i + 1] = 2 + rand() * 31;
    starPos[3 * i + 2] = Math.sin(a) * r;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x8bc6df, size: .07, transparent: true, opacity: .70, depthWrite: false }));
  stage.add(stars);
  const orbitLines = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const belt = new THREE.Mesh(new THREE.TorusGeometry(4.2 + i * 1.1, .007, 5, 96), ringMat);
    belt.rotation.x = -.45 - i * .25;
    belt.rotation.z = i * .26;
    belt.position.y = 3.4;
    orbitLines.add(belt);
  }
  stage.add(orbitLines);

  const drone = createAetherModule(THREE, { mode, quality });
  const pilot = createDronePilot(THREE, { root: drone.root, center: [0, 2.00, 0], autopilot: true });
  scene.add(drone.root);
  const controls = { theta: -.28, phi: .17, distance: isMobile ? 8.2 : 5.3 };
  const cameraFocus = new THREE.Vector3(0, 2.0, 0);
  const desiredFocus = new THREE.Vector3(0, 2.0, 0);

  const modeInfo = {
    friendly: { tag: 'FRIENDLY', role: '友好・共生', title: '星環の機竜', lead: '失われた文明の魔法回路と、自己進化型の機械骨格が融合した自律飛行生命体。', color: '#7df3e1' },
    neutral: { tag: 'NEUTRAL', role: '中立・観測', title: '静観する観測者', lead: '外界との干渉を抑え、結晶核の光を琥珀色へ。装甲翼をたたみ、静かに周囲を観測する。', color: '#eac28b' },
    hostile: { tag: 'HOSTILE', role: '敵対・警戒', title: '紅蓮の守護機構', lead: '脅威を検知すると装甲翼を最大展開。結晶核の色を変え、警戒態勢へ移行する。', color: '#ff7487' }
  };

  function setMode(next) {
    if (!modeInfo[next]) return;
    mode = next;
    drone.setMode(next);
    const data = modeInfo[next];
    $('heroTitle').textContent = data.title;
    $('heroLead').textContent = data.lead;
    $('modeText').textContent = data.tag;
    $('roleReadout').textContent = data.role;
    document.documentElement.style.setProperty('--cyan', data.color);
    document.querySelectorAll('[data-mode]').forEach(el => {
      el.classList.toggle('active', el.dataset.mode === next);
      el.setAttribute('aria-pressed', String(el.dataset.mode === next));
    });
    notify(`${data.role} モードへ移行`);
  }
  function setQuality(next) {
    quality = next === 'high' ? 'high' : 'low';
    drone.setQuality(quality);
    const mobile = window.innerWidth <= 720 || isTouch;
    const pixelCap = quality === 'high' ? (mobile ? 1.75 : 2) : (mobile ? 1.18 : 1.45);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelCap));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.toneMappingExposure = quality === 'high' ? 1.18 : 1.08;
    orbitLines.visible = quality === 'high';
    pylons.visible = true;
    starGeo.setDrawRange(0, quality === 'high' ? 620 : 220);
    ringMat.opacity = quality === 'high' ? .40 : .21;
    $('qualityText').textContent = quality === 'high' ? 'HIGH' : 'LITE';
    document.querySelectorAll('[data-quality]').forEach(el => {
      el.classList.toggle('active', el.dataset.quality === quality);
      el.setAttribute('aria-pressed', String(el.dataset.quality === quality));
    });
    notify(quality === 'high' ? '高品質モード' : '軽量モード');
  }
  function notify(message) {
    const node = $('notice');
    node.textContent = message;
    node.classList.add('visible');
    if (noticeTimeout) clearTimeout(noticeTimeout);
    noticeTimeout = setTimeout(() => node.classList.remove('visible'), 1400);
  }
  function triggerScan() {
    drone.triggerScan();
    previousScan = time;
    notify('魔力探査パルスを放射');
  }
  function cycleDeployment() {
    deploymentOverride = deploymentOverride === null ? 1 : deploymentOverride === 1 ? 0 : null;
    drone.setDeployment(deploymentOverride);
    $('deployButton').textContent = deploymentOverride === 1 ? '翼を収納' : deploymentOverride === 0 ? '自動変形' : '翼を展開';
    notify(deploymentOverride === null ? '変形：自動' : deploymentOverride === 1 ? '翼：最大展開' : '翼：収納');
  }
  function setAutopilot(on) {
    pilot.setAutopilot(on);
    $('pilotButton').textContent = on ? '自律飛行 ON' : '手動操縦 ON';
    $('pilotButton').classList.toggle('active', !on);
    $('pilotText').textContent = on ? 'AUTO' : 'MANUAL';
    notify(on ? '自律巡航を開始' : '手動操縦を開始');
  }
  document.querySelectorAll('[data-mode]').forEach(el => el.addEventListener('click', () => setMode(el.dataset.mode)));
  document.querySelectorAll('[data-quality]').forEach(el => el.addEventListener('click', () => setQuality(el.dataset.quality)));
  $('scanButton').addEventListener('click', triggerScan);
  $('deployButton').addEventListener('click', cycleDeployment);
  $('pilotButton').addEventListener('click', () => setAutopilot(!pilot.autopilot));
  $('pauseButton').addEventListener('click', () => {
    paused = !paused;
    $('pauseButton').textContent = paused ? '再生' : '停止';
    $('pauseButton').classList.toggle('active', paused);
    notify(paused ? 'アニメーション停止' : 'アニメーション再開');
  });

  const pressed = new Set();
  const driveHeld = new Set();
  const mapping = { w: 'forward', arrowup: 'forward', s: 'back', arrowdown: 'back', a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right', e: 'up', q: 'down' };
  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (mapping[k] || [' ', 'shift'].includes(k)) e.preventDefault();
    if (mapping[k] && !pressed.has(k)) {
      pressed.add(k);
      if (pilot.autopilot) setAutopilot(false);
    }
    if (k === 'shift') pressed.add(k);
    if (k === ' ' && !e.repeat) triggerScan();
    if (k === 'r' && !e.repeat) { pilot.reset(); notify('機体の位置をリセット'); }
  });
  window.addEventListener('keyup', e => pressed.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => { pressed.clear(); driveHeld.clear(); });
  document.querySelectorAll('[data-drive]').forEach(el => {
    const dir = el.dataset.drive;
    el.addEventListener('pointerdown', e => {
      e.preventDefault();
      el.setPointerCapture?.(e.pointerId);
      driveHeld.add(dir);
      if (pilot.autopilot) setAutopilot(false);
    });
    const release = e => { e.preventDefault(); driveHeld.delete(dir); };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('lostpointercapture', () => driveHeld.delete(dir));
  });
  const pointers = new Map();
  let pinchDistance = 0;
  const canvas = renderer.domElement;
  function pointerDistance() {
    const p = [...pointers.values()];
    return p.length >= 2 ? Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) : 0;
  }
  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    pinchDistance = pointerDistance();
  });
  canvas.addEventListener('pointermove', e => {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size > 1) {
      const next = pointerDistance();
      if (pinchDistance > 0) controls.distance *= pinchDistance / Math.max(next, 1);
      pinchDistance = next;
    } else {
      controls.theta -= (e.clientX - prev.x) * .005;
      controls.phi = Math.max(-.22, Math.min(.95, controls.phi + (e.clientY - prev.y) * .004));
    }
    controls.distance = Math.max(3.4, Math.min(14, controls.distance));
  });
  const releasePointer = e => { pointers.delete(e.pointerId); pinchDistance = pointerDistance(); };
  canvas.addEventListener('pointerup', releasePointer);
  canvas.addEventListener('pointercancel', releasePointer);
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    controls.distance = Math.min(14, Math.max(3.4, controls.distance + e.deltaY * .006));
  }, { passive: false });

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / Math.max(1,h);
    camera.fov = w <= 720 ? 54 : 49;
    camera.updateProjectionMatrix();
    const pixelCap = quality === 'high' ? (w <= 720 || isTouch ? 1.75 : 2) : (w <= 720 || isTouch ? 1.18 : 1.45);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, pixelCap));
    renderer.setSize(w, h, false);
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();
  setQuality(quality);
  setMode(mode);
  bootEl.classList.add('hidden');

  const clock = new THREE.Clock();
  let rafId = 0;
  let lastHUD = 0;
  let lastScanAt = -10;
  let lostContext = false;
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    lostContext = true;
    errorEl.style.display = 'block';
    errorEl.textContent = '描画コンテキストが失われました。ページを再読み込みすると復帰します。';
  });
  canvas.addEventListener('webglcontextrestored', () => { window.location.reload(); });

  function loop() {
    rafId = window.requestAnimationFrame(loop);
    if (lostContext) return;
    const dt = Math.min(clock.getDelta(), .065);
    fpsAccumulator += dt;
    counter++;
    if (fpsAccumulator > .65) {
      measuredFPS = Math.round(counter / fpsAccumulator);
      fpsAccumulator = 0;
      counter = 0;
    }
    if (!paused) {
      time += dt;
      const active = key => pressed.has(key) || driveHeld.has(key);
      const input = {
        x: Number(active('d') || active('arrowright') || active('right')) - Number(active('a') || active('arrowleft') || active('left')),
        y: Number(active('e') || active('up')) - Number(active('q') || active('down')),
        z: Number(active('s') || active('arrowdown') || active('back')) - Number(active('w') || active('arrowup') || active('forward')),
        boost: pressed.has('shift'),
        cameraYaw: 0
      };
      const state = pilot.update(dt, input);
      drone.update(dt, { velocity: state.velocity, flying: true,
        targetLocal: { x: Math.cos(time * .7) * .18, y: Math.sin(time * .53) * .11 } });
      orbitLines.rotation.y = time * .016;
      floorGroup.rotation.y = time * .012;
      // Occasional ambient passive scan, deliberately disabled in hostile mode.
      if (mode === 'friendly' && pilot.autopilot && time - lastScanAt > 11.5 && time - previousScan > 5) {
        drone.triggerScan();
        lastScanAt = time;
      }
    }
    desiredFocus.copy(drone.root.position);
    cameraFocus.lerp(desiredFocus, 1 - Math.exp(-4.8 * Math.max(dt, .005)));
    const h = Math.cos(controls.phi) * controls.distance;
    camera.position.set(cameraFocus.x + Math.sin(controls.theta) * h,
      cameraFocus.y + Math.sin(controls.phi) * controls.distance,
      cameraFocus.z + Math.cos(controls.theta) * h);
    camera.lookAt(cameraFocus);
    renderer.render(scene, camera);
    if (time - lastHUD > .16) {
      lastHUD = time;
      $('speedReadout').textContent = `${pilot.speed.toFixed(2)} m/s`;
      $('altReadout').textContent = `${drone.root.position.y.toFixed(2)} m`;
      $('fpsReadout').textContent = measuredFPS ? String(measuredFPS) : '--';
      $('powerReadout').textContent = `${Math.round(91 + 6 * Math.sin(time / 19))}%`;
      $('deployReadout').textContent = `${Math.round(drone.getState().deployment * 100)}%`;
    }
  }
  loop();
  window.addEventListener('beforeunload', () => {
    cancelAnimationFrame(rafId);
    drone.dispose();
    pilot.dispose();
    renderer.dispose();
  }, { once: true });
}
startDemo();
