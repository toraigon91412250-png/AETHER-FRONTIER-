/**
 * Example integration with an existing Three.js 0.160.0 scene and player system.
 * Import the pure module separately. It does not create a scene, camera, or renderer.
 */
import { createAetherModule } from './aether-interactions.js';

export function installMeridianVault(THREE, scene, opts = {}) {
  const module20 = createAetherModule(THREE, {
    quality: opts.quality ?? 'low',
    includeStage: opts.includeStage ?? true,
    includeLights: opts.includeLights ?? false,
    onEvent: (event) => opts.onEvent?.(event),
    onTeleport: (event) => opts.onTeleport?.(event),
  });
  if (opts.position) module20.root.position.copy(opts.position);
  scene.add(module20.root);

  function tick(dt, playerPosition) {
    module20.update(dt, { playerPosition });
  }
  function findAim(camera, playerPosition) {
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    return module20.findInteractable({
      origin: camera.getWorldPosition(new THREE.Vector3()),
      direction,
      playerPosition,
      maxPlayerDistance: 4.3,
    });
  }
  function use(camera, playerPosition) {
    const target = findAim(camera, playerPosition);
    if (!target) return { ok: false, type: 'no_target' };
    // Teleport returns a world-space position but does not move the player.
    const result = module20.interact(target.id, { requireRange: true, playerPosition });
    if (result.type === 'teleport') opts.movePlayerTo?.(result.position);
    return result;
  }
  return {
    module: module20,
    tick, findAim, use,
    serialize: () => module20.getState(),
    restore: (saved) => module20.setState(saved),
    quality: (mode) => module20.setQuality(mode),
    collisions: () => module20.getColliders(), // local coords, see README
    destroy: () => module20.dispose(),
  };
}
