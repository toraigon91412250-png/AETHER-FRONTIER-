/**
 * AETHER FRONTIER / Team 19
 * Browser-only, dependency-injected controller for Three.js r160.
 * World axes: +Y up, forward -Z, 1 world unit = approx. 1 meter.
 * No renderer, scene, camera, DOM, animation loop or engine singleton is created.
 * License: MIT (original project code).
 */
export function createAetherModule(THREE, options = {}) {
  if (!THREE || !THREE.Group || !THREE.Vector3) throw new Error('Three.js namespace is required');
  const root = new THREE.Group();
  root.name = 'AETHER_PLAYER_ROOT';
  const v3 = (x=0,y=0,z=0) => new THREE.Vector3(x,y,z);
  const opts = {
    moveSpeed: options.moveSpeed ?? 4.7,
    sprintSpeed: options.sprintSpeed ?? 8.1,
    groundAccel: options.groundAccel ?? 20,
    airAccel: options.airAccel ?? 6.8,
    friction: options.friction ?? 18,
    gravity: options.gravity ?? 23,
    jumpSpeed: options.jumpSpeed ?? 8.6,
    coyoteTime: options.coyoteTime ?? 0.115,
    jumpBuffer: options.jumpBuffer ?? 0.14,
    radius: options.radius ?? 0.39,
    height: options.height ?? 1.84,
    eyeHeight: options.eyeHeight ?? 1.66,
    orbitDistance: options.orbitDistance ?? 4.65,
    orbitHeight: options.orbitHeight ?? 1.42,
    shoulder: options.shoulder ?? 0.46,
    cameraSmooth: options.cameraSmooth ?? 15,
    dashSpeed: options.dashSpeed ?? 15.3,
    dashDuration: options.dashDuration ?? 0.2,
    dashCooldown: options.dashCooldown ?? 1.15,
  };
  const initial = options.position || {x:0,y:0,z:0};
  root.position.set(initial.x ?? 0, initial.y ?? 0, initial.z ?? 0);
  let camera = options.camera ?? null;
  let scene = options.scene ?? null;
  let avatar = options.avatar ?? null;
  let ownSceneAttachment = false;
  if (scene && options.attachToScene !== false) { scene.add(root); ownSceneAttachment = true; }
  if (avatar) root.add(avatar);
  let mode = options.mode === 'fps' ? 'fps' : 'tps';
  let quality = options.quality === 'high' ? 'high' : 'low';
  let enabled = true;
  let disposed = false;
  let yaw = options.yaw ?? 0;
  let pitch = options.pitch ?? -0.12;
  let time = 0, coyote = 0, jumpBuffer = 0, dashTimer = 0, dashCooldown = 0;
  let grounded = false, jumping = false, moving = false, sprinting = false;
  let bobPhase = 0, landKick = 0, cameraInitialized = false;
  const velocity = v3(), horizontal = v3(), dashDirection = v3(0,0,-1);
  const prevPosition = v3(), proposed = v3(), forward = v3(), right = v3(), focus = v3();
  const desiredCamera = v3(), smoothCamera = v3(), cameraLook = v3();
  let lastActions = {jump:false, dash:false, action:false, toggleView:false};
  let inputSource = options.input ?? null;
  let obstructionTick = 0, rememberedDistance = opts.orbitDistance;
  const camRayFrom = v3(), camRayTo = v3();
  const events = new Set();

  function fire(type, detail={}) {
    const event = {type, ...detail};
    if (typeof options.onEvent === 'function') options.onEvent(event, api);
    for (const cb of events) cb(event, api);
  }
  function clamp(n,a,b) { return Math.max(a,Math.min(b,n)); }
  function expFollow(rate,dt) { return 1-Math.exp(-rate*dt); }
  function getGroundAt(x,z,context) {
    const cb = context.getGroundHeight || options.getGroundHeight;
    if (typeof cb === 'function') {
      const out = cb(x,z,context,api);
      return Number.isFinite(out) ? out : -Infinity;
    }
    return 0;
  }
  function readInput(context) {
    const input = context.input ?? inputSource;
    const got = typeof input === 'function' ? input() :
      (input && typeof input.sample === 'function' ? input.sample() : input);
    return got || {};
  }
  function syncAvatar() { if (avatar) avatar.visible = (mode !== 'fps'); }
  syncAvatar();
  function setMode(next) {
    if (next !== 'fps' && next !== 'tps') return mode;
    if (next !== mode) {
      mode = next;
      cameraInitialized = false;
      syncAvatar();
      fire('mode', {mode});
    }
    return mode;
  }
  function setQuality(next) {
    quality = (next === 'high' || next === 'quality') ? 'high' : 'low';
    fire('quality', {quality});
    return quality;
  }
  function setCamera(cam) { camera = cam; cameraInitialized = false; }
  function setAvatar(model) {
    if (avatar && avatar.parent === root) root.remove(avatar);
    avatar = model || null;
    if (avatar) root.add(avatar);
    syncAvatar();
  }
  function teleport(x,y,z,rotationYaw) {
    root.position.set(x,y,z);
    if (Number.isFinite(rotationYaw)) yaw = rotationYaw;
    velocity.set(0,0,0); horizontal.set(0,0,0);
    grounded = false; cameraInitialized = false;
    dashTimer = 0; dashCooldown = 0;
    fire('teleport', {position:getPosition()});
  }
  function getPosition() {
    return {x:root.position.x,y:root.position.y,z:root.position.z};
  }
  function getState() {
    return {position:getPosition(),velocity:{x:velocity.x,y:velocity.y,z:velocity.z},
      yaw,pitch,mode,quality,grounded,moving,sprinting,jumping,dashing:dashTimer>0,
      dashReady:dashCooldown<=0,enabled,time};
  }

  function physicalStep(h, input, context) {
    const groundBefore = getGroundAt(root.position.x,root.position.z,context);
    if (root.position.y <= groundBefore + 0.016 && velocity.y <= 0) {
      root.position.y = groundBefore;
      if (!grounded) { grounded = true; if (jumping) { landKick = Math.min(0.15,Math.abs(velocity.y)*0.008); fire('land'); } }
      velocity.y = 0;
      jumping = false;
      coyote = opts.coyoteTime;
    } else { grounded = false; coyote = Math.max(0,coyote-h); }

    if (jumpBuffer > 0 && (grounded || coyote > 0)) {
      velocity.y = opts.jumpSpeed;
      grounded = false; jumping = true; coyote = 0; jumpBuffer = 0;
      fire('jump');
    }
    jumpBuffer = Math.max(0,jumpBuffer-h);
    dashCooldown = Math.max(0,dashCooldown-h);
    const ix = clamp(Number(input.moveX) || 0,-1,1), iy = clamp(Number(input.moveY) || 0,-1,1);
    const size = Math.hypot(ix,iy), factor = size>1 ? 1/size : 1;
    const sx = ix*factor, sy = iy*factor;
    forward.set(Math.sin(yaw),0,-Math.cos(yaw));
    right.set(Math.cos(yaw),0,Math.sin(yaw));
    let dirX = right.x*sx + forward.x*sy;
    let dirZ = right.z*sx + forward.z*sy;
    moving = size>0.07;
    sprinting = Boolean(input.sprint) && moving;
    const desiredSpeed = sprinting ? opts.sprintSpeed : opts.moveSpeed;
    const responsiveness = grounded ? opts.groundAccel : opts.airAccel;
    const smooth = expFollow(moving ? responsiveness : opts.friction,h);
    horizontal.x += (dirX*desiredSpeed-horizontal.x)*smooth;
    horizontal.z += (dirZ*desiredSpeed-horizontal.z)*smooth;
    if (dashTimer > 0) {
      dashTimer = Math.max(0,dashTimer-h);
      const dashFactor = 0.45+0.55*(dashTimer/opts.dashDuration);
      horizontal.x = dashDirection.x*opts.dashSpeed*dashFactor;
      horizontal.z = dashDirection.z*opts.dashSpeed*dashFactor;
    }
    velocity.x = horizontal.x;
    velocity.z = horizontal.z;
    velocity.y -= opts.gravity*h;
    // Variable jump height: release jump early to shorten the ascent.
    if (!input.jump && jumping && velocity.y > 0) velocity.y -= opts.gravity*0.95*h;
    prevPosition.copy(root.position);
    proposed.set(root.position.x + velocity.x*h,root.position.y + velocity.y*h,
      root.position.z + velocity.z*h);
    const resolve = context.resolveMovement || options.resolveMovement;
    if (typeof resolve === 'function') {
      const out = resolve({previous:prevPosition.clone(),proposed:proposed.clone(),
        velocity:velocity.clone(),radius:opts.radius,height:opts.height,
        dt:h,grounded,context,controller:api});
      const point = out && out.position ? out.position : out;
      if (point && Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z)) {
        proposed.copy(point);
        if (out && out.velocity) velocity.copy(out.velocity);
        if (out && typeof out.grounded === 'boolean') grounded = out.grounded;
      }
    }
    root.position.copy(proposed);
    const groundAfter = getGroundAt(root.position.x,root.position.z,context);
    if (root.position.y <= groundAfter && velocity.y<=0) {
      root.position.y = groundAfter;
      if (!grounded) { if (jumping) {landKick=Math.min(0.16,Math.abs(velocity.y)*0.01);fire('land');} }
      grounded = true; jumping = false; velocity.y = 0;
      coyote = opts.coyoteTime;
    }
    root.rotation.y = yaw;
    if (moving && grounded) bobPhase += h*Math.hypot(horizontal.x,horizontal.z)*1.65;
  }

  function updateCamera(dt,context) {
    const cam = context.camera || camera;
    if (!cam) return;
    const bobAmp = (moving && grounded) ? Math.min(0.035,Math.hypot(horizontal.x,horizontal.z)*0.0045) : 0;
    landKick *= Math.exp(-12*dt);
    const bob = Math.sin(bobPhase)*bobAmp - landKick;
    if (mode === 'fps') {
      desiredCamera.set(root.position.x,root.position.y + opts.eyeHeight + bob,root.position.z);
      // Snap FPS view to player. Do not allow camera lag while turning in tight spaces.
      cam.position.copy(desiredCamera);
      cam.rotation.order = 'YXZ';
      cam.rotation.set(pitch,yaw,0,'YXZ');
      cameraInitialized = true;
      return;
    }
    forward.set(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));
    right.set(Math.cos(yaw),0,Math.sin(yaw));
    focus.set(root.position.x,root.position.y + opts.orbitHeight + bob,root.position.z);
    const shoulder = opts.shoulder;
    cameraLook.copy(focus).addScaledVector(right,shoulder*0.24);
    desiredCamera.copy(focus).addScaledVector(forward,-opts.orbitDistance).addScaledVector(right,shoulder);
    const minHeight = getGroundAt(desiredCamera.x,desiredCamera.z,context)+0.52;
    desiredCamera.y = Math.max(desiredCamera.y,minHeight);
    // External camera obstruction query can return a safe fraction [0..1], or safe distance.
    const query = context.cameraObstruction || options.cameraObstruction;
    if (typeof query === 'function') {
      const frequency = quality==='high' ? 1 : 2;
      if (++obstructionTick % frequency === 0 || !cameraInitialized) {
        camRayFrom.copy(cameraLook); camRayTo.copy(desiredCamera);
        const rayLength = camRayFrom.distanceTo(camRayTo);
        const result = query({origin:camRayFrom.clone(),target:camRayTo.clone(),
          distance:rayLength,context,controller:api});
        if (Number.isFinite(result)) {
          rememberedDistance = clamp(result<=1 ? result*rayLength : result,0.5,rayLength);
        } else rememberedDistance = rayLength;
      }
      const vector = desiredCamera.clone().sub(cameraLook);
      if (vector.lengthSq()>0.0001) desiredCamera.copy(cameraLook).addScaledVector(vector.normalize(),Math.min(rememberedDistance,vector.length()));
    }
    if (!cameraInitialized) {
      smoothCamera.copy(desiredCamera);
      cameraInitialized = true;
    } else smoothCamera.lerp(desiredCamera,expFollow(opts.cameraSmooth,dt));
    cam.position.copy(smoothCamera);
    cam.lookAt(cameraLook);
  }

  function update(dt, context={}) {
    if (disposed || !enabled) return getState();
    const frame = clamp(Number(dt)||0,0,0.0667);
    if (!frame) return getState();
    const input = readInput(context);
    yaw += clamp(Number(input.lookX)||0,-0.9,0.9);
    pitch = clamp(pitch - clamp(Number(input.lookY)||0,-0.9,0.9),-1.18,1.25);
    const trigger = name => Boolean(input[name]) && !lastActions[name];
    if (trigger('toggleView')) setMode(mode==='fps'?'tps':'fps');
    if (trigger('jump')) jumpBuffer = opts.jumpBuffer;
    if (trigger('action')) fire('action', {position:getPosition(),yaw});
    if (trigger('dash') && dashCooldown<=0) {
      forward.set(Math.sin(yaw),0,-Math.cos(yaw));
      right.set(Math.cos(yaw),0,Math.sin(yaw));
      const ix = clamp(Number(input.moveX)||0,-1,1), iy = clamp(Number(input.moveY)||0,-1,1);
      dashDirection.copy(forward).multiplyScalar(iy).addScaledVector(right,ix);
      if (dashDirection.lengthSq() < 0.01) dashDirection.copy(forward);
      dashDirection.normalize();
      dashTimer = opts.dashDuration; dashCooldown = opts.dashCooldown;
      fire('dash',{direction:{x:dashDirection.x,y:0,z:dashDirection.z}});
    }
    lastActions = {jump:!!input.jump,dash:!!input.dash,
      action:!!input.action,toggleView:!!input.toggleView};
    const count = Math.max(1,Math.ceil(frame/(1/90)));
    for(let i=0;i<count;i++) physicalStep(frame/count,input,context);
    time += frame;
    updateCamera(frame,context);
    const state = getState();
    if (typeof options.onUpdate === 'function') options.onUpdate(state,api);
    return state;
  }
  function dispose() {
    if (disposed) return;
    disposed=true;
    events.clear();
    if (ownSceneAttachment && root.parent) root.parent.remove(root);
    if (avatar && avatar.parent===root) root.remove(avatar);
    // Caller retains ownership of external geometry, materials, scene and camera.
    avatar=null; camera=null; scene=null; inputSource=null;
  }
  const api = { root,update,setQuality,dispose,setMode,getMode:()=>mode,
    setCamera,setAvatar,teleport,getState,getPosition,
    setEnabled(value){enabled=!!value; if(!enabled){velocity.set(0,0,0);horizontal.set(0,0,0);} },
    setInputSource(source){inputSource=source;},
    on(handler){events.add(handler);return()=>events.delete(handler);},
    get camera(){return camera;},
  };
  return api;
}
