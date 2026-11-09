# AETHER FRONTIER / No.08 / LUMEN KESTREL

Procedural, piloted SF-fantasy aircraft, designed for Three.js **0.160.0**.

## Contents
- `index.html`: **single HTML playable demo**, no build step. Loads pinned Three.js 0.160.0 from jsDelivr on first visit (internet required).
- `src/ship.js`: standalone visual module, no camera or renderer ownership.
- `src/flight-controller.js`: flight state and input integration, independent of the visual model.
- `src/demo.js`: demonstration scene, mobile/desktop input, checkpoint game, camera and HUD.
- `modular-demo.html`: example of importing the source files directly.

## Integrating in main game

```js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { createAetherModule } from './src/ship.js';
import { AetherFlightController } from './src/flight-controller.js';

const ship = createAetherModule(THREE, { quality: 'low' });
scene.add(ship.root);
const flight = new AetherFlightController(THREE, {position:[0,24,0]});

// Game loop:
const state = flight.update(deltaSeconds, {
  yaw: 0, pitch: 0, lift: 0, throttle: 0,
  strafe: 0, boost: false, brake: false
});
ship.root.position.copy(state.position);
ship.root.quaternion.copy(state.quaternion);
ship.update(deltaSeconds, {flight:state});

// When user changes graphic quality:
ship.setQuality('low'); // or 'high'

// On world unload:
scene.remove(ship.root);
ship.dispose();
```

* Coordinates: +Y up, craft forward is -Z, 1 unit ≈ 1 meter.
* No scene, lights, renderer, camera, UI, collision logic or controls created by `createAetherModule`.
* Call `update(dt, { flight: telemetry })`; `dt` is seconds. Or call `setFlightState(telemetry)` first.
* `root` is the movable transform. `update` changes child articulation only, **not** root transform.
* Input `yaw` / `pitch` / `lift` / `throttle` / `strafe` is normalized [-1,1], `boost` / `brake` boolean. Throttle is a *rate of change* of cruise throttle.
* Progress upgrades: `flight.setTier(1..3)` increases maximum cruise speed (27 / 38 / 52 m/s). Main-game unlock rules may differ.
* Compatible with external FPS / TPS camera controllers; optional suggested anchor points in `ship.anchors`.
* `setQuality` toggles optional decorative meshes and particle count. It does not change renderer settings.
* Flight is arcade-style, not aerodynamic simulation. Ground/terrain collisions are the responsibility of the host game.
* `dispose()` disposes all geometries and materials **owned by this module**. Do not share its internal resources externally.

## Demo controls

Desktop: W/S throttle, A/D or left/right arrows steer, up/down arrows pitch, R/F lift, Shift boost, Space air brake. Drag scene to orbit TPS camera. V changes FPS/TPS, 1/2 changes quality, P toggles assisted autopilot, X resets.

Touch: left stick yaw/pitch, right stick throttle/lift, BOOST and BRAKE buttons, POV/QUALITY/AUTO buttons.

The demo contains six fly-through rings. Crossing rings 2 and 4 unlocks upgrade tiers 2 and 3. AUTO is a demonstration assist, not part of the reusable controller.

## Performance note

The targets are low mode 60 fps / minimum 50 fps on iPhone 16 Safari, high mode visually richer with 50 fps target. **These are design goals, not device-measured results.** Validate on the actual target device; heavy scenes created by other teams may require additional tuning.
