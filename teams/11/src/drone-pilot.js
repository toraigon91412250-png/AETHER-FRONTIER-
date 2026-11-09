/**
 * Optional external world-space controller for SERAPH-11. 
 * The visual module NEVER calls this controller or changes its own public root transform.
 * Supply `root`, and either use the autopilot or call `pilot.update(dt, input)`.
 */
export function createDronePilot(THREE, options = {}) {
  if (!options.root) throw new Error('createDronePilot requires { root }.');
  const root = options.root;
  const V3 = THREE.Vector3;
  const base = new V3(...(options.center || [0, 2, 0]));
  const velocity = new V3();
  const desired = new V3();
  const target = new V3();
  const bounds = { horizontal: Number(options.horizontalLimit) || 5.0, yMin: .65, yMax: 4.5 };
  let autopilot = options.autopilot !== false;
  let time = 0;
  let disposed = false;
  let currentSpeed = 0;
  root.position.copy(base);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  function setAutopilot(on) {
    autopilot = Boolean(on);
    velocity.multiplyScalar(.25);
    if (autopilot) {
      // Re-center patrol on user's current position smoothly.
      base.x = clamp(root.position.x, -1.5, 1.5);
      base.z = clamp(root.position.z, -1.5, 1.5);
    }
  }
  function setCenter(x, y, z) { base.set(x, y, z); }
  function reset() {
    velocity.set(0, 0, 0);
    base.set(...(options.center || [0, 2, 0]));
    root.position.copy(base);
    root.rotation.set(0, 0, 0);
    time = 0;
  }
  function update(dt, input = {}) {
    if (disposed) return { velocity, speed: 0, autopilot };
    dt = clamp(Number(dt) || 0, 0, .08);
    if (!dt) return { velocity, speed: velocity.length(), autopilot };
    time += dt;
    const previous = root.position.clone();
    if (autopilot) {
      target.set(
        base.x + Math.cos(time * .42) * .74,
        base.y + Math.sin(time * .78) * .18,
        base.z + Math.sin(time * .42) * .43
      );
      const factor = 1 - Math.exp(-2.0 * dt);
      root.position.lerp(target, factor);
      const yawTarget = -Math.atan2(target.x - root.position.x, -(target.z - root.position.z));
      let dy = Math.atan2(Math.sin(yawTarget - root.rotation.y), Math.cos(yawTarget - root.rotation.y));
      root.rotation.y += dy * (1 - Math.exp(-1.1 * dt));
    } else {
      // Manual input convention: x: A/D, z: S/W, y: Q/E. Camera-relative planar yaw optional.
      const x = clamp(Number(input.x) || 0, -1, 1);
      const y = clamp(Number(input.y) || 0, -1, 1);
      const z = clamp(Number(input.z) || 0, -1, 1);
      const yaw = Number(input.cameraYaw) || 0;
      const s = Math.sin(yaw), c = Math.cos(yaw);
      desired.set(x * c + z * s, y, z * c - x * s);
      if (desired.lengthSq() > 1) desired.normalize();
      const maxSpeed = input.boost ? 3.2 : 1.75;
      desired.multiplyScalar(maxSpeed);
      velocity.lerp(desired, 1 - Math.exp(-4.8 * dt));
      root.position.addScaledVector(velocity, dt);
      root.position.x = clamp(root.position.x, -bounds.horizontal, bounds.horizontal);
      root.position.z = clamp(root.position.z, -bounds.horizontal, bounds.horizontal);
      root.position.y = clamp(root.position.y, bounds.yMin, bounds.yMax);
      if (Math.abs(x) + Math.abs(z) > .1) {
        const facing = -Math.atan2(velocity.x, -velocity.z);
        let dy = ((facing - root.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        root.rotation.y += dy * (1 - Math.exp(-4 * dt));
      }
    }
    velocity.copy(root.position).sub(previous).divideScalar(dt);
    currentSpeed = velocity.length();
    return { velocity, speed: currentSpeed, autopilot };
  }
  function dispose() { disposed = true; }
  return { update, setAutopilot, setCenter, reset, dispose, get autopilot() { return autopilot; },
    get speed() { return currentSpeed; }, velocity };
}
