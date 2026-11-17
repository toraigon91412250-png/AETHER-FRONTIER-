/**
 * AETHER FRONTIER / Team No.11
 * SERAPH-11  |  Symbiotic Ether Reconnaissance & Adaptive Protector
 * Three.js r160 / coordinate convention: Y up, local forward -Z, 1 unit ~ 1 meter.
 * No renderer, camera, DOM or global Three.js dependency is created here.
 *
 * API: createAetherModule(THREE, options) ->
 * {root, update(dt, context), setQuality(mode), setMode(mode),
 *  setDeployment(valueOrNull), triggerScan(), getState(), dispose()}
 */

export const AETHER_DRONE_INFO = Object.freeze({
  id: 'AF-11-SERAPH',
  name: 'SERAPH-11 / 星環の機竜',
  version: '1.0.0',
  threeVersion: '0.160.0',
  coordinateSystem: 'Y-up; local forward -Z; meter-scale',
  roles: ['friendly', 'neutral', 'hostile'],
  estimatedBoundsMeters: { width: 4.4, height: 1.85, depth: 1.65 }
});

export function createAetherModule(THREE, options = {}) {
  if (!THREE || typeof THREE.Group !== 'function') throw new Error('A THREE namespace from Three.js r160 is required.');

  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const damp = (a, b, smoothing, dt) => a + (b - a) * (1 - Math.exp(-smoothing * dt));
  const root = new THREE.Group();
  root.name = 'AF11_SERAPH11_ROOT';
  root.userData.aetherModule = { id: AETHER_DRONE_INFO.id, team: 11, localForward: '-Z' };

  let disposed = false;
  let elapsed = 0;
  let scanAge = 100;
  let scanActive = false;
  let scanWantedLast = false;
  let mode = ['friendly', 'neutral', 'hostile'].includes(options.mode) ? options.mode : 'friendly';
  let quality = 'low';
  let deploymentOverride = null;
  let deployment = 0.35;
  let pupilX = 0, pupilY = 0;

  const palette = {
    friendly: { core: 0x74fbe4, accent: 0x80e6ff, light: 0x51ead4 },
    neutral:  { core: 0xffd694, accent: 0xffc36f, light: 0xf5bd72 },
    hostile:  { core: 0xff607a, accent: 0xff8a6e, light: 0xff4e7c }
  };
  const materials = [];
  const keepMaterial = m => (materials.push(m), m);

  const ceramic = keepMaterial(new THREE.MeshStandardMaterial({ color: 0x162a3e, roughness: .39, metalness: .67, flatShading: true }));
  const obsidian = keepMaterial(new THREE.MeshStandardMaterial({ color: 0x0b1523, roughness: .24, metalness: .81 }));
  const titanium = keepMaterial(new THREE.MeshStandardMaterial({ color: 0x455970, roughness: .33, metalness: .79 }));
  const gold = keepMaterial(new THREE.MeshStandardMaterial({ color: 0xcaa979, roughness: .33, metalness: .79 }));
  const recess = keepMaterial(new THREE.MeshStandardMaterial({ color: 0x080f1a, roughness: .8, metalness: .22 }));
  const coreMat = keepMaterial(new THREE.MeshStandardMaterial({ color: 0x99fff3, emissive: 0x4ce9d1, emissiveIntensity: 1.7, metalness: .08, roughness: .18, flatShading: true }));
  const coreInnerMat = keepMaterial(new THREE.MeshBasicMaterial({ color: 0x9dfbff }));
  const emissiveMat = keepMaterial(new THREE.MeshStandardMaterial({ color: 0x5effe2, emissive: 0x38d9ce, emissiveIntensity: 1.65, roughness: .27, metalness: .25 }));
  const energyMat = keepMaterial(new THREE.MeshBasicMaterial({ color: 0x70e9ff, transparent: true, opacity: .78, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  const glassMat = keepMaterial(new THREE.MeshStandardMaterial({ color: 0x7fd4e9, metalness: .18, roughness: .09, transparent: true, opacity: .32, depthWrite: false, side: THREE.DoubleSide }));
  const runeMat = keepMaterial(new THREE.LineBasicMaterial({ color: 0x72f0dd, transparent: true, opacity: .78, depthWrite: false }));
  const scanMat = keepMaterial(new THREE.MeshBasicMaterial({ color: 0x66f9e6, transparent: true, opacity: .0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));

  const bodyRig = new THREE.Group();
  bodyRig.name = 'BodyRig_InternalHoverOnly';
  root.add(bodyRig);
  const shellGroup = new THREE.Group();
  shellGroup.name = 'ArmorCore';
  bodyRig.add(shellGroup);
  const highDetail = new THREE.Group();
  highDetail.name = 'HighDetail_Optional';
  bodyRig.add(highDetail);

  const add = (parent, geometry, material, name, p, rot, scale) => {
    const m = new THREE.Mesh(geometry, material);
    m.name = name;
    if (p) m.position.set(...p);
    if (rot) m.rotation.set(...rot);
    if (scale) m.scale.set(...scale);
    parent.add(m);
    return m;
  };
  const addLine = (parent, positions, material, name) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const line = new THREE.LineSegments(g, material);
    line.name = name;
    parent.add(line);
    return line;
  };

  // Eight-sided floating central chassis with layered armored facets.
  const mainHull = add(shellGroup, new THREE.CylinderGeometry(.435, .39, .61, 8, 1), ceramic,
    'Octagonal_Engine_Chassis', [0, 0, .075], [Math.PI / 2, 0, Math.PI / 8]);
  add(shellGroup, new THREE.SphereGeometry(.41, 16, 10), obsidian,
    'Deep_Recessed_Rear_Shell', [0, 0, .225], null, [1.01, .76, 1.08]);
  add(shellGroup, new THREE.CylinderGeometry(.355, .355, .02, 8), titanium,
    'Forward_Armor_Backing', [0, 0, -.248], [Math.PI / 2, 0, Math.PI / 8]);
  add(shellGroup, new THREE.CylinderGeometry(.325, .325, .023, 8), recess,
    'Iris_Gap', [0, 0, -.263], [Math.PI / 2, 0, Math.PI / 8]);
  add(shellGroup, new THREE.TorusGeometry(.39, .027, 6, 8), gold,
    'Octagonal_Rim', [0, 0, -.298], [0, 0, Math.PI / 8]);
  add(shellGroup, new THREE.TorusGeometry(.292, .016, 6, 48), emissiveMat,
    'Iris_Energy_Track', [0, 0, -.304]);

  // Six precision-petals create an iris with a genuine visible interior.
  const petalGeometry = new THREE.Shape();
  petalGeometry.moveTo(-.10, .255);
  petalGeometry.lineTo(-.035, .345);
  petalGeometry.lineTo(.045, .343);
  petalGeometry.lineTo(.105, .25);
  petalGeometry.lineTo(.034, .174);
  petalGeometry.lineTo(-.031, .174);
  petalGeometry.closePath();
  const petalExtrusion = new THREE.ExtrudeGeometry(petalGeometry, {
    depth: .035, bevelEnabled: true, bevelThickness: .01, bevelSize: .009, bevelSegments: 1, steps: 1, curveSegments: 1
  });
  for (let i = 0; i < 6; i++) {
    const pivot = new THREE.Group();
    pivot.name = `Iris_Petal_Pivot_${i + 1}`;
    pivot.rotation.z = i * Math.PI / 3;
    shellGroup.add(pivot);
    add(pivot, petalExtrusion, ceramic, `Optic_Armor_Petal_${i + 1}`, [0, 0, -.359]);
    add(pivot, new THREE.BoxGeometry(.014, .10, .011), gold, `Petal_Gold_Edge_${i + 1}`,
      [.0, .296, -.32]);
  }

  // Inner crystallized aether seed plus socket and pupil.
  const iris = new THREE.Group();
  iris.name = 'Sentient_Ether_Iris';
  iris.position.z = -.37;
  shellGroup.add(iris);
  add(iris, new THREE.TorusGeometry(.205, .019, 7, 42), gold, 'Inner_Lens_Annulus', [0, 0, -.035]);
  const crystal = add(iris, new THREE.OctahedronGeometry(.205, 1), coreMat, 'EightFacet_Aether_Crystal', [0, 0, -.072], [0, 0, Math.PI / 4]);
  add(iris, new THREE.IcosahedronGeometry(.085, 1), coreInnerMat, 'Compressed_Sentient_Light', [0, 0, -.161]);
  const pupil = add(iris, new THREE.SphereGeometry(.044, 12, 8), coreInnerMat, 'Tracking_Pupil', [0, 0, -.238]);
  add(iris, new THREE.SphereGeometry(.226, 16, 12), glassMat, 'Crystal_Protection_Dome', [0, 0, -.087], null, [1, 1, .55]);

  const neck = add(shellGroup, new THREE.DodecahedronGeometry(.20, 0), titanium,
    'Upper_Neural_Crown', [0, .305, .045], null, [.70, .70, 1.15]);
  add(shellGroup, new THREE.ConeGeometry(.135, .26, 5), gold,
    'Crown_Keel', [0, .452, -.052], [0, 0, Math.PI]);
  add(shellGroup, new THREE.BoxGeometry(.028, .27, .05), emissiveMat,
    'Dorsal_Nervous_Spine', [0, .37, -.23]);

  for (const side of [-1, 1]) {
    // Side housings + split float sensors.
    add(shellGroup, new THREE.BoxGeometry(.23, .255, .53), titanium,
      `Shoulder_Nacelle_${side}`, [side * .40, -.025, .115], [0, side * .19, side * -.1]);
    add(shellGroup, new THREE.BoxGeometry(.093, .065, .48), ceramic,
      `Nacelle_Spine_${side}`, [side * .465, .102, .10], [0, 0, side * .13]);
    add(shellGroup, new THREE.SphereGeometry(.085, 12, 8), emissiveMat,
      `Front_Side_Eye_${side}`, [side * .41, -.05, -.245], null, [.80, .8, 1]);
    add(highDetail, new THREE.TorusGeometry(.085, .012, 5, 24), gold,
      `Side_Eye_Trim_${side}`, [side * .41, -.05, -.299]);
    add(shellGroup, new THREE.ConeGeometry(.12, .49, 5), ceramic,
      `Lower_Keel_${side}`, [side * .205, -.44, .145], [0, 0, side * .17]);
    add(highDetail, new THREE.BoxGeometry(.022, .30, .032), emissiveMat,
      `Keel_Inlay_${side}`, [side * .203, -.44, -.006], [0, 0, side * .17]);
  }
  add(shellGroup, new THREE.ConeGeometry(.11, .58, 5), titanium,
    'Central_Stabilization_Talon', [0, -.56, .22], [Math.PI, 0, 0]);

  // Four floating armor-wings. For each side, the longer forward blade
  // and the smaller rear stabilizer fold independently via pivot groups.
  const wingMainShape = new THREE.Shape();
  wingMainShape.moveTo(-.06, -.09);
  wingMainShape.lineTo(.20, .12);
  wingMainShape.lineTo(.56, .19);
  wingMainShape.lineTo(1.03, .15);
  wingMainShape.lineTo(1.56, -.04);
  wingMainShape.lineTo(1.72, -.17);
  wingMainShape.lineTo(1.16, -.19);
  wingMainShape.lineTo(.68, -.155);
  wingMainShape.lineTo(.22, -.24);
  wingMainShape.closePath();
  const wingSmallShape = new THREE.Shape();
  wingSmallShape.moveTo(-.015, .04);
  wingSmallShape.lineTo(.29, .15);
  wingSmallShape.lineTo(.89, .09);
  wingSmallShape.lineTo(1.23, -.14);
  wingSmallShape.lineTo(.67, -.16);
  wingSmallShape.lineTo(.25, -.23);
  wingSmallShape.closePath();
  const wingGeom = new THREE.ExtrudeGeometry(wingMainShape, {
    depth: .075, bevelEnabled: true, bevelThickness: .02, bevelSize: .018, bevelSegments: 1, curveSegments: 1
  });
  const wingSmallGeom = new THREE.ExtrudeGeometry(wingSmallShape, {
    depth: .06, bevelEnabled: true, bevelThickness: .012, bevelSize: .013, bevelSegments: 1, curveSegments: 1
  });
  const mainEdgeGeom = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(.19, .105, .07), new THREE.Vector3(.6, .165, .07),
    new THREE.Vector3(1.03, .125, .07), new THREE.Vector3(1.55, -.05, .07)
  ]), 22, .014, 5, false);
  const smallEdgeGeom = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(.22, .108, .058), new THREE.Vector3(.79, .075, .058),
    new THREE.Vector3(1.10, -.105, .058)
  ]), 14, .010, 5, false);
  const wingPivots = [];
  const thrusterMat = keepMaterial(new THREE.MeshBasicMaterial({ color: 0x6cfdea, transparent: true, opacity: .80, blending: THREE.AdditiveBlending, depthWrite: false }));
  for (const side of [-1, 1]) {
    for (let row = 0; row < 2; row++) {
      const pivot = new THREE.Group();
      pivot.name = `${side < 0 ? 'Left' : 'Right'}_${row ? 'Rear' : 'Primary'}_WingPivot`;
      pivot.position.set(side * (row ? .35 : .39), row ? -.14 : .095, row ? .34 : -.005);
      shellGroup.add(pivot);
      const mirror = new THREE.Group();
      mirror.scale.x = side;
      pivot.add(mirror);
      const z = row ? -.03 : -.035;
      add(mirror, row ? wingSmallGeom : wingGeom, row ? titanium : ceramic,
        `Aerodynamic_Shell_${side}_${row}`, [0, 0, z]);
      add(mirror, row ? smallEdgeGeom : mainEdgeGeom, emissiveMat,
        `Wing_Ether_Vein_${side}_${row}`, [0, 0, z]);
      add(mirror, new THREE.SphereGeometry(row ? .06 : .077, 10, 8), gold,
        `Root_Bearing_${side}_${row}`, [0, 0, 0]);
      add(highDetail, new THREE.BoxGeometry(.36, .019, .024), gold,
        `Bronze_Pinstripe_${side}_${row}`, [side * (row ? .69 : .87), row ? -.105 : -.123, row ? .37 : .0],
        [0, 0, side * (row ? -.13 : -.03)]);
      const accent = add(mirror, new THREE.SphereGeometry(.060, 10, 8), thrusterMat,
        `Wingtip_Navigational_Emitter_${side}_${row}`, [row ? 1.11 : 1.55, row ? -.125 : -.09, .024]);
      wingPivots.push({ pivot, mirror, side, row, accent });
    }
  }

  // Three-axis clockwork aether halos: motion derives from internal stabilizer,
  // not from movement of the public `root` transform.
  const gimbal = new THREE.Group();
  gimbal.name = 'Gimballed_Aether_Halo';
  bodyRig.add(gimbal);
  const ring1 = add(gimbal, new THREE.TorusGeometry(.70, .017, 6, 64), gold,
    'Outer_Bronze_Sigil_Ring', [0, 0, .14], [0, .52, 0]);
  const ring2 = add(gimbal, new THREE.TorusGeometry(.58, .010, 6, 64), energyMat,
    'Axial_Ether_Gyro_Ring', [0, 0, .11], [.60, -.28, 0]);
  const ring3 = add(highDetail, new THREE.TorusGeometry(.78, .007, 5, 72), emissiveMat,
    'Third_Stabilizer_Orbit', [0, 0, .14], [.75, .20, 0]);
  // Semicircular calibration ticks grouped in one mesh (instanced rendering).
  const tickGeo = new THREE.BoxGeometry(.023, .058, .028);
  const tickMesh = new THREE.InstancedMesh(tickGeo, gold, 24);
  tickMesh.name = 'Halo_Calibration_Ticks_Instanced';
  const temp = new THREE.Object3D();
  for (let i = 0; i < 24; i++) {
    const a = i * Math.PI * 2 / 24;
    temp.position.set(Math.sin(a) * .703, Math.cos(a) * .703, .14);
    temp.rotation.set(0, 0, -a);
    temp.updateMatrix();
    tickMesh.setMatrixAt(i, temp.matrix);
  }
  tickMesh.instanceMatrix.needsUpdate = true;
  highDetail.add(tickMesh);

  const sigils = new THREE.Group();
  sigils.name = 'Ancient_Runic_Optical_Script';
  highDetail.add(sigils);
  // All glyph segments are merged into a single draw call.
  const glyphPositions = [];
  for (let i = 0; i < 20; i++) {
    const a = i * Math.PI * 2 / 20;
    const cs = Math.cos(a), sn = Math.sin(a);
    const at = (r, tangent) => [r * cs - tangent * sn, r * sn + tangent * cs, -.505];
    const P = (r1, t1, r2, t2) => { glyphPositions.push(...at(r1, t1), ...at(r2, t2)); };
    P(.453, -.023, .503, -.023);
    P(.503, -.023, .522, .015);
    P(.522, .015, .473, .031);
    if (i % 2 === 0) P(.455, .014, .495, .005);
  }
  addLine(sigils, glyphPositions, runeMat, 'Twenty_Orbiting_Magic_Glyphs');
  const scanningRing = add(bodyRig, new THREE.TorusGeometry(.43, .022, 6, 72), scanMat,
    'Expandable_NonWeapon_Scan_Pulse', [0, 0, -.56]);
  scanningRing.visible = false;

  const satellites = new THREE.Group();
  satellites.name = 'Orbiting_Micro_Arcanites';
  highDetail.add(satellites);
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    const shard = add(satellites, new THREE.OctahedronGeometry(.048, 0), i % 2 ? gold : emissiveMat,
      `FreeFloating_Shard_${i + 1}`, [Math.cos(a) * .84, Math.sin(a) * .63, .18]);
    shard.rotation.z = a;
  }

  const pointLight = new THREE.PointLight(0x56e9d9, 1.25, 3.6, 2);
  pointLight.name = 'QualityOptional_CoreIllumination';
  pointLight.position.set(0, 0, -.52);
  bodyRig.add(pointLight);

  function applyPalette() {
    const p = palette[mode];
    coreMat.color.setHex(p.core);
    coreMat.emissive.setHex(p.core);
    coreInnerMat.color.setHex(p.core);
    emissiveMat.color.setHex(p.accent);
    emissiveMat.emissive.setHex(p.accent);
    energyMat.color.setHex(p.core);
    runeMat.color.setHex(p.core);
    scanMat.color.setHex(p.core);
    thrusterMat.color.setHex(p.core);
    glassMat.color.setHex(p.accent);
    pointLight.color.setHex(p.light);
  }

  function setMode(next) {
    if (disposed) return;
    if (next !== 'friendly' && next !== 'neutral' && next !== 'hostile') return;
    mode = next;
    applyPalette();
  }
  function setQuality(next) {
    if (disposed) return;
    quality = (next === 'high' || next === 'quality') ? 'high' : 'low';
    highDetail.visible = quality === 'high';
    pointLight.visible = quality === 'high';
    glassMat.opacity = quality === 'high' ? .32 : .14;
  }
  function setDeployment(valueOrNull) {
    if (disposed) return;
    deploymentOverride = (typeof valueOrNull === 'number' && Number.isFinite(valueOrNull))
      ? clamp(valueOrNull, 0, 1) : null;
  }
  function triggerScan() {
    if (disposed) return;
    scanAge = 0;
    scanActive = true;
  }
  function getState() {
    return { mode, quality, deployment, scanActive, elapsed, disposed };
  }
  function update(dt, context = {}) {
    if (disposed) return;
    dt = clamp(Number(dt) || 0, 0, .1);
    context = context || {};
    if (context && typeof context === 'object') {
      if (typeof context.mode === 'string' && context.mode !== mode) setMode(context.mode);
      if (Object.hasOwn(context, 'deployment') && context.deployment !== undefined) setDeployment(context.deployment);
      if (context.scan === true && !scanWantedLast) triggerScan();
      scanWantedLast = context.scan === true;
    }
    if (dt <= 0) return;
    const speed = clamp(Number(context.timeScale) || 1, .05, 3);
    const tdt = dt * speed;
    elapsed += tdt;
    const flying = context.flying !== false;
    const baseDeploy = mode === 'hostile' ? .96 : mode === 'neutral' ? .23 : .55;
    const wanted = deploymentOverride !== null ? deploymentOverride : baseDeploy;
    deployment = damp(deployment, wanted, 3.2, tdt);
    const velocity = context.velocity || { x: 0, y: 0, z: 0 };
    const vx = clamp(Number(velocity.x) || 0, -3, 3);
    const vz = clamp(Number(velocity.z) || 0, -3, 3);
    bodyRig.position.y = flying ? Math.sin(elapsed * 1.65) * .070 : 0;
    bodyRig.rotation.z = damp(bodyRig.rotation.z, -vx * .060, 3.2, tdt);
    bodyRig.rotation.x = damp(bodyRig.rotation.x, vz * .075, 3.2, tdt);
    bodyRig.rotation.y = Math.sin(elapsed * .7) * .018;
    iris.rotation.z = elapsed * (mode === 'hostile' ? -.55 : .27);
    crystal.rotation.y = elapsed * .65;
    crystal.rotation.x = Math.sin(elapsed * .8) * .16;
    gimbal.rotation.y = elapsed * .30;
    ring1.rotation.z = elapsed * .23;
    ring2.rotation.x = .60 + Math.sin(elapsed * .51) * .22;
    ring2.rotation.y = -.28 + elapsed * -.19;
    ring3.rotation.y = elapsed * -.23;
    sigils.rotation.z = -elapsed * .17;
    satellites.rotation.z = elapsed * .43;
    satellites.rotation.y = Math.sin(elapsed * .45) * .15;

    wingPivots.forEach(({ pivot, side, row, accent }, i) => {
      // Symmetric folding; rear airfoils counter-steer against the front pair.
      const sign = side === 1 ? -1 : 1;
      pivot.rotation.z = sign * (row ? (.38 - deployment * .56) : (-.48 + deployment * .62));
      pivot.rotation.x = (row ? -.16 : .16) + Math.sin(elapsed * 2.0 + i * 1.6) * .035;
      pivot.rotation.y = side * (row ? -.12 : .13) + side * deployment * .095;
      accent.material.opacity = .77;
      const pulse = 1 + .17 * Math.sin(elapsed * 3.8 + i);
      accent.scale.setScalar(pulse);
    });
    if (context.targetLocal) {
      const target = context.targetLocal;
      pupilX = damp(pupilX, clamp(Number(target.x) || 0, -.25, .25) * .22, 5, tdt);
      pupilY = damp(pupilY, clamp(Number(target.y) || 0, -.25, .25) * .22, 5, tdt);
    } else {
      pupilX = Math.sin(elapsed * .6) * .017;
      pupilY = Math.cos(elapsed * .47) * .013;
    }
    pupil.position.set(pupilX, pupilY, -.238);
    const breath = 1 + .070 * Math.sin(elapsed * (mode === 'hostile' ? 5.2 : 2.6));
    coreInnerMat.color.setHex(palette[mode].core);
    crystal.scale.setScalar(breath);
    coreMat.emissiveIntensity = mode === 'hostile' ? 2.0 + .55 * Math.sin(elapsed * 7.2) : 1.55 + .25 * Math.sin(elapsed * 2.2);
    pointLight.intensity = 1.18 + .20 * Math.sin(elapsed * 2.4);

    if (scanActive) {
      scanAge += tdt;
      const phase = scanAge / 1.55;
      if (phase >= 1) {
        scanActive = false;
        scanningRing.visible = false;
        scanMat.opacity = 0;
      } else {
        scanningRing.visible = true;
        scanningRing.scale.setScalar(1 + phase * 5.4);
        scanMat.opacity = Math.max(0, Math.sin(Math.PI * phase) * .70);
      }
    }
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    root.parent?.remove(root);
    const geometries = new Set();
    const mats = new Set(materials);
    root.traverse(child => {
      if (child.geometry) geometries.add(child.geometry);
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach(m => mats.add(m));
        else mats.add(child.material);
      }
    });
    geometries.forEach(g => g.dispose());
    mats.forEach(m => m.dispose());
    root.clear();
  }

  applyPalette();
  setQuality(options.quality === 'high' ? 'high' : 'low');
  if (typeof options.deployment === 'number') setDeployment(options.deployment);
  if (options.scanOnStart) triggerScan();

  return { root, update, setQuality, setMode, setDeployment, triggerScan, getState, dispose };
}
