/**
 * SERAPH-11 OPTIONAL world-motion driver. Not an AI, navigator, combat or collision system.
 * Motion is OFF by default. The host owns collision, scene, health and target selection.
 * Three.js r160 / Y up / local forward -Z / meters.
 */
export function createSeraphMotionController(THREE, options = {}) {
  if (!options.root) throw new TypeError('SERAPH motion requires root');
  const root = options.root;
  const v = () => new THREE.Vector3();
  const followTarget = v(), desired = v(), previous = v(), delta = v(), velocity = v(), start = v(), evadeDirection = v();
  const worldTarget = v();
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const number = (x, fallback) => Number.isFinite(x) ? x : fallback;
  const offset = { x: number(options.offset?.x, -1.6), y: number(options.offset?.y, 1.8), z: number(options.offset?.z, 1.45) };
  let motionMode = 'external', hasTarget = false, disposed = false;
  let targetYaw = 0, evadeLeft = 0, evadeTotal = .36, evadeDistance = 0, evadeProgress = 0;
  let lastY = root.rotation.y;
  const speed = Math.max(.1, number(options.maxSpeed, 4.4));
  const resolve = typeof options.resolveMovement === 'function' ? options.resolveMovement : null;
  const copyPoint = (dst, p) => {
    if (!p || ![p.x,p.y,p.z].every(Number.isFinite)) return false;
    dst.set(p.x,p.y,p.z); return true;
  };
  function setMode(mode) {
    if (disposed || !['external','follow','hold'].includes(mode)) return false;
    motionMode = mode;
    velocity.set(0,0,0);
    evadeLeft = 0;
    return true;
  }
  function setFollowTarget(point, yaw = 0) {
    if (disposed) return false;
    hasTarget = copyPoint(followTarget, point);
    targetYaw = number(yaw, 0);
    return hasTarget;
  }
  function requestEvade({direction, distance = 1.6, duration = .38} = {}) {
    if (disposed || motionMode === 'external') return false;
    if (!copyPoint(evadeDirection, direction || {x: 1, y: 0, z: 0})) return false;
    evadeDirection.y = 0;
    if (evadeDirection.lengthSq() < .0001) evadeDirection.set(1,0,0);
    evadeDirection.normalize();
    evadeDistance = clamp(number(distance,1.6), .15, 3);
    evadeTotal = clamp(number(duration,.38), .18, .75);
    evadeLeft = evadeTotal; evadeProgress = 0;
    return true;
  }
  function update(dt, context = {}) {
    if (disposed) return { moved:false, velocity, mode:motionMode };
    dt = clamp(number(dt,0), 0, .1);
    if (context && Object.hasOwn(context,'playerPosition')) setFollowTarget(context.playerPosition,context.playerYaw);
    if (!dt || motionMode === 'external') {velocity.set(0,0,0);return {moved:false,velocity,mode:motionMode};}
    previous.copy(root.position);
    desired.copy(previous);
    let desiredYaw = null;
    if (evadeLeft > 0) {
      const next = Math.min(1, evadeProgress + dt / evadeTotal);
      // Smooth step difference integrates a finite sideways evade without frame dependence.
      const curve = x => x*x*(3-2*x);
      const displacement = (curve(next) - curve(evadeProgress)) * evadeDistance;
      desired.addScaledVector(evadeDirection, displacement);
      evadeProgress = next;
      evadeLeft = Math.max(0, evadeLeft - dt);
    } else if (motionMode === 'follow' && hasTarget) {
      const s = Math.sin(targetYaw), c = Math.cos(targetYaw);
      worldTarget.set(
        followTarget.x + offset.x*c + offset.z*s,
        followTarget.y + offset.y,
        followTarget.z + offset.z*c - offset.x*s
      );
      // Host may parent the drone under a zone/group: convert world target to parent-local.
      if (root.parent?.worldToLocal) {
        root.parent.updateWorldMatrix?.(true,false);
        root.parent.worldToLocal(worldTarget);
      }
      delta.copy(worldTarget).sub(root.position);
      const dist = delta.length();
      if (dist > .04) {
        const maxStep = Math.min(dist, speed*dt, dist*(1-Math.exp(-3.7*dt)));
        desired.addScaledVector(delta, maxStep/dist);
        if (Math.hypot(delta.x, delta.z) > .06) desiredYaw = Math.atan2(-delta.x,-delta.z);
      }
    }
    // External collision adapter must explicitly opt in. Input and output in root parent's local coordinates.
    if (resolve) {
      const out = resolve(desired, previous, {dt,mode:motionMode,root});
      if (out && [out.x,out.y,out.z].every(Number.isFinite)) desired.copy(out);
    }
    root.position.copy(desired);
    if (desiredYaw !== null) {
      const angular = Math.atan2(Math.sin(desiredYaw-lastY),Math.cos(desiredYaw-lastY));
      lastY += angular * (1-Math.exp(-5*dt));
      root.rotation.y = lastY;
    } else lastY = root.rotation.y;
    velocity.copy(desired).sub(previous).divideScalar(dt);
    return {moved:velocity.lengthSq()>.00001,velocity,mode:motionMode};
  }
  function dispose(){disposed=true;hasTarget=false;evadeLeft=0;velocity.set(0,0,0);}
  if(options.mode) setMode(options.mode);
  return {setMode,setFollowTarget,requestEvade,update,dispose,velocity,
    get mode(){return motionMode},get hasTarget(){return hasTarget},get evading(){return evadeLeft>0}};
}
