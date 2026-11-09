# AETHER FRONTIER | No.12 | RH-06 RIFT HOUND

## Deliverables

- `No12_RiftHound_Standalone.html`: one-file playable demo. Contains all custom code, styling and world geometry. No build process. Requires an internet connection to fetch the **Three.js 0.160.0 ES module** from a public CDN (jsDelivr, fallback: unpkg). No images, fonts or other game assets are requested.
- `index.html`: identical standalone demo, ready for direct upload to Cloudflare Pages. **Upload `index.html` as a static site or upload this ZIP**, without Wrangler or a build step.
- `module-demo.html`: browser-hosted demo using the separate ES modules in `source/`.
- `source/aether-vehicle.js`: **integration-ready, rendering/controls independent 3D vehicle**.
- `source/aether-driver.js`: independent physics / steering / boost / drift controller.
- `source/demo-main.js`: sample scene, course, renderer and input implementation. Not required for integration.
- `source/demo-styles.css`: demo user interface.

## Controls

| PC | Action |
| --- | --- |
| W / ↑ | Accelerate |
| S / ↓ | Brake and reverse |
| A / D or ← / → | Turn |
| Shift | Boost (uses charge) |
| Space | Drift |
| C | Cycle chase / low / cockpit cameras |
| Q | Switch LITE / HIGH quality |
| V | Inspect vehicle (drag to orbit) |
| R | Reset to start |
| P | Pause |
| Mouse drag | Camera orbit |
| Mouse scroll | Camera distance |

On iPhone Safari, steer with the left arrows and hold **GO** to accelerate. Right buttons control BRAKE, BOOST and DRIFT. Camera, graphics and inspect are in the top toolbar.

## Gameplay

Drive a closed desert-salt racing route with **7 sequential checkpoint gates** and a lap timer, permanent local personal-best storage (best time only), two `ARC LAUNCH` ground jump pads, five regenerating `AETHER CELL` charge pickups, six-wheel terrain-following suspension, boost and drift FX. Driving off the road reduces top speed and lateral traction.

## Integration contract

Three.js **r160 / 0.160.0**, meters, Y-up, vehicle nose at **-Z**.

```js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { createAetherModule } from './source/aether-vehicle.js';
import { createGroundDriver } from './source/aether-driver.js';

const vehicle = createAetherModule(THREE, { quality: 'low' });
scene.add(vehicle.root);
vehicle.root.position.set(x, y, z); // model only; no auto movement

// Integration option A: host game does physics; inject drive-state for animations.
vehicle.setDriveState({speed:25,steering:.35,boost:1,drift:0,throttle:1,brake:0});
vehicle.update(dt, context); // call once every game loop

// Integration option B: sample standalone controller, injecting host terrain/input.
const driver = createGroundDriver(vehicle, {
  groundHeight: (x,z) => yourWorldHeight(x,z),
  onRoad: (x,z) => true,
  spawn: { x:0,z:0,yaw:0 }
});
// Input values: throttle/brake [0..1], steer [-1..1], boost/drift booleans.
driver.update(dt,{throttle:1,brake:0,steer:.2,boost:false,drift:false});
vehicle.update(dt);

vehicle.setQuality('high'); // or 'low'
vehicle.dispose(); // disposes module-owned GPU resources and detaches root
```

### API

`createAetherModule(THREE, options)` returns:
- `root: THREE.Group` with stable local coordinate system (the ground is y=0)
- `update(dt, context={})`
- `setQuality('low' | 'high')`
- `dispose()` (idempotent)
- `setDriveState({ speed, steering, drift, boost, throttle, brake, airborne, groundRoughness })` optional visual inputs
- `info` metadata

`createGroundDriver(vehicle, options)` returns:
- `state` persistent mutable simulation state with x, y, z, yaw, speed, boostEnergy, airborne, etc.
- `update(dt, input, environment={})` does not call `vehicle.update()`
- `spawn({x,z,yaw})`, `jump(power)`, `refill(amount)` and `parameters`

**Separation:** Model never creates a camera, renderer, event listener, track, terrain or user-interface. Driver never accesses the browser DOM and has no dependency on Three.js. The sample demo hosts all rendering/input details separately. The integrated game can use the model alone or reuse the driver.

## Quality/performance notes

LITE disables decorative mesh groups, animated spoke detailing and real-time shadows, lowers internal pixel ratio, and limits trail particles. HIGH enables extra hardware details, denser ground scenery, shadows and higher render resolution. The renderer uses **no postprocessing, asset downloads, shader imports or external control libraries**. 50/60 FPS is a **target**, not an unverified claim; the sample HUD includes a live FPS reading. PC / iPhone 16 Safari have not been physically benchmarked in this build environment.

## Public hosting

Cloudflare Pages (Direct Upload): create a Pages project and drag/drop the **ZIP** or the static folder containing `index.html`. There is **no `wrangler.toml`, npm setup or build step**. Public internet required to load Three.js from the CDN. On iPhone local Files preview may restrict WebGL/ES modules; use Safari on a hosted HTTPS page.

## Licence

Original RIFT HOUND code © 2026 AETHER FRONTIER No.12, provided for project integration and modification. Three.js 0.160.0 is third-party software licensed under MIT by its contributors and is fetched directly from CDN; it is not repackaged in this ZIP. See https://threejs.org/license and the upstream project for its licence.

## Validation scope

Syntax-checked with Node v22; packaged file layout verified. Rendered frame rate, iPhone actual input performance and WebGL visual output require on-device testing. No fabricated measurements or physical browser test claims.
