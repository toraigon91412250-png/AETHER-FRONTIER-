/*
 * AETHER FRONTIER / No.17 Performance Controller v1.0.0
 * Three.js r160 (0.160.0). No imports, no build step.
 * Copyright (c) AETHER FRONTIER project. MIT-style usage within the project.
 *
 * Contract: createAetherModule(THREE, options) ->
 *   { root, update(dt, context), setQuality(mode), dispose(), ...extras }
 *
 * Design:
 * - External renderer/camera/scene ownership; never create/own/dispose them.
 * - Never mutate renderer settings except opt-in renderer.setPixelRatio().
 * - LOD registration changes only visibility of explicitly registered objects.
 * - Frame interval is RAF wall time, *not* GPU time; endFrame() is CPU render time.
 */
const scope = {};
(function (scope) {
  'use strict';

  const CONFIG = Object.freeze({
    lite: Object.freeze({ name: 'lite', targetFPS: 60, maxDPR: 1.35, minDPR: 0.72, initialDetail: 0.76, minDetail: 0.30 }),
    high: Object.freeze({ name: 'high', targetFPS: 50, maxDPR: 2.0, minDPR: 0.90, initialDetail: 1.0, minDetail: 0.44 })
  });
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const finite = (v) => typeof v === 'number' && Number.isFinite(v);
  const msNow = () => typeof performance !== 'undefined' ? performance.now() : Date.now();
  const round = (v, places = 2) => Number(v.toFixed(places));
  const normalizeMode = (mode) => {
    if (mode === 'lite' || mode === 'low' || mode === 'light') return 'lite';
    if (mode === 'high' || mode === 'quality') return 'high';
    throw new RangeError('Unknown quality mode: ' + String(mode));
  };

  function createAetherModule(THREE, options = {}) {
    if (!THREE || typeof THREE.Group !== 'function' || typeof THREE.Vector3 !== 'function') {
      throw new Error('A valid Three.js THREE namespace is required.');
    }

    const root = new THREE.Group();
    root.name = 'No17_PerformanceController';

    let renderer = null;
    let originalDPR = null;
    let changedDPR = false;
    let camera = options.camera || null;
    let mode = normalizeMode(options.quality || 'lite');
    let adaptive = options.adaptive === true;
    const manageDPR = options.managePixelRatio === true;
    const lodRefreshFrames = clamp(Number(options.lodRefreshFrames) || 4, 1, 120);
    const sampleLimit = clamp(Number(options.sampleLimit) || 120, 30, 600);
    const onError = typeof options.onError === 'function' ? options.onError : null;

    let detail = CONFIG[mode].initialDetail;
    let desiredDPR = null;
    let counter = 0;
    let lastAdjustAt = msNow();
    let lastFrameAt = null;
    let renderBeginAt = null;
    let renderCPU = 0;
    let tuning = 'stable';
    let disposed = false;
    let intervalBuffer = [];
    let cachedStats = { fps: 0, avgMs: 0, p90Ms: 0, p95Ms: 0, worstMs: 0, samples: 0 };
    let lastStatsRecalc = 0;
    const clients = new Map();
    const lodEntries = new Map();
    let autoId = 0;
    const camPosition = new THREE.Vector3();
    const anchorPosition = new THREE.Vector3();
    let drawCalls = 0, triangles = 0, geometries = 0, textures = 0;
    const externalOnChange = typeof options.onChange === 'function' ? options.onChange : null;

    function sendError(error) {
      if (onError) {
        try { onError(error); } catch (_) { /* don't hide original error */ }
      } else if (typeof console !== 'undefined') {
        console.warn('[AETHER No.17]', error);
      }
    }

    function modePreset() { return CONFIG[mode]; }

    function restoreRendererDPR() {
      if (renderer && changedDPR && originalDPR !== null && typeof renderer.setPixelRatio === 'function') {
        try { renderer.setPixelRatio(originalDPR); } catch (error) { sendError(error); }
      }
      changedDPR = false;
    }

    function attachRenderer(next) {
      if (!next || next === renderer) return;
      restoreRendererDPR();
      renderer = next;
      originalDPR = typeof renderer.getPixelRatio === 'function'
        ? renderer.getPixelRatio() : 1;
      originalDPR = finite(originalDPR) && originalDPR > 0 ? originalDPR : 1;
      desiredDPR = null;
      applyDPR(true);
    }

    function capDPR() {
      if (!renderer || originalDPR === null) return 1;
      // Honor host initial DPR ceiling and display's native DPR.
      let device = originalDPR;
      if (typeof window !== 'undefined' && finite(window.devicePixelRatio)) {
        device = Math.min(device, window.devicePixelRatio);
      }
      return Math.max(0.5, Math.min(device, modePreset().maxDPR));
    }

    function floorDPR() {
      return Math.min(capDPR(), modePreset().minDPR);
    }

    function applyDPR(force = false) {
      if (!manageDPR || !renderer || !renderer.setPixelRatio) return;
      const cap = capDPR();
      const next = round(clamp(desiredDPR === null ? cap : desiredDPR, floorDPR(), cap), 3);
      const actual = typeof renderer.getPixelRatio === 'function' ? renderer.getPixelRatio() : null;
      desiredDPR = next;
      if (force || !finite(actual) || Math.abs(actual - next) > 0.015) {
        try {
          // Host opted into DPR management. Does not change camera, scene or renderer effects.
          renderer.setPixelRatio(next);
          changedDPR = true;
        } catch (error) { sendError(error); }
      }
    }

    function getDPR() {
      return renderer && typeof renderer.getPixelRatio === 'function' ? renderer.getPixelRatio() : null;
    }

    function snapshotBudget() {
      return {
        mode, adaptive, detail: round(detail, 3),
        targetFPS: modePreset().targetFPS,
        dpr: getDPR(),
        dprManaged: manageDPR,
        tuning
      };
    }

    function publishChange() {
      const budget = snapshotBudget();
      for (const [id, client] of clients) {
        try {
          if (client.setQuality && client.lastMode !== mode) {
            client.setQuality(mode, budget);
            client.lastMode = mode;
          }
          if (client.setDetail) client.setDetail(detail, budget);
        } catch (error) { sendError(new Error('Client ' + id + ': ' + error.message)); }
      }
      if (externalOnChange) {
        try { externalOnChange(budget); } catch (error) { sendError(error); }
      }
    }

    function setQuality(nextMode) {
      if (disposed) return;
      mode = normalizeMode(nextMode);
      detail = modePreset().initialDetail;
      desiredDPR = null;
      tuning = 'stable';
      lastAdjustAt = msNow();
      applyDPR();
      publishChange();
      refreshLODs(true);
    }

    function setAdaptive(value) {
      if (disposed) return;
      adaptive = Boolean(value);
      lastAdjustAt = msNow();
      // Turning adaptive OFF restores the selected mode's reproducible preset.
      if (!adaptive) {
        detail = modePreset().initialDetail;
        desiredDPR = null;
        tuning = 'stable';
        applyDPR();
      }
      publishChange();
    }

    function registerClient(id, callbacks) {
      if (disposed) throw new Error('Module disposed');
      // Supports registerClient('city', {setDetail, setQuality}) and object form.
      if (id && typeof id === 'object') { callbacks = id; id = callbacks.id; }
      if (!id) id = 'client-' + (++autoId);
      if (clients.has(id)) throw new Error('Duplicate client ID: ' + id);
      if (!callbacks || (!callbacks.setQuality && !callbacks.setDetail)) {
        throw new TypeError('Client needs setQuality() or setDetail().');
      }
      const entry = { setQuality: callbacks.setQuality, setDetail: callbacks.setDetail, lastMode: null };
      clients.set(id, entry);
      const budget = snapshotBudget();
      try {
        if (entry.setQuality) { entry.setQuality(mode, budget); entry.lastMode = mode; }
        if (entry.setDetail) entry.setDetail(detail, budget);
      } catch (error) { sendError(error); }
      return () => { clients.delete(id); };
    }

    function registerLOD(config) {
      if (disposed) throw new Error('Module disposed');
      if (!config || !Array.isArray(config.levels) || config.levels.length < 2) {
        throw new TypeError('LOD requires levels [{object, maxDistance}, ..., {object, maxDistance: Infinity}].');
      }
      const id = config.id || 'lod-' + (++autoId);
      if (lodEntries.has(id)) throw new Error('Duplicate LOD ID: ' + id);
      let lastLimit = -Infinity;
      const levels = config.levels.map((level) => {
        if (!level || !level.object || !('visible' in level.object)) {
          throw new TypeError('Each LOD level must provide a Three.js Object3D.');
        }
        const max = level.maxDistance;
        if (!(typeof max === 'number' && max > lastLimit)) {
          throw new RangeError('LOD maxDistance must be strictly increasing; last can be Infinity.');
        }
        lastLimit = max;
        return { object: level.object, maxDistance: max, wasVisible: level.object.visible };
      });
      if (levels[levels.length - 1].maxDistance !== Infinity) {
        throw new RangeError('Last LOD maxDistance must equal Infinity.');
      }
      const entry = {
        levels,
        anchor: config.anchor || levels[0].object,
        hysteresis: clamp(finite(config.hysteresis) ? config.hysteresis : 0.09, 0, 0.4),
        index: -1
      };
      lodEntries.set(id, entry);
      updateOneLOD(entry, true);
      return () => unregisterLOD(id);
    }

    function unregisterLOD(id) {
      const entry = lodEntries.get(id);
      if (!entry) return;
      for (const level of entry.levels) level.object.visible = level.wasVisible;
      lodEntries.delete(id);
    }

    function updateOneLOD(entry, force = false) {
      if (!camera || !entry.anchor || !entry.anchor.getWorldPosition) return;
      camera.getWorldPosition(camPosition);
      entry.anchor.getWorldPosition(anchorPosition);
      // Lower detail -> transition to simplified meshes at shorter world distances.
      const scaled = camPosition.distanceTo(anchorPosition) / (0.55 + detail * 0.45);
      let index = entry.index;
      if (index < 0 || force) {
        index = entry.levels.findIndex((level) => scaled <= level.maxDistance);
      } else {
        while (index < entry.levels.length - 1 &&
            scaled > entry.levels[index].maxDistance * (1 + entry.hysteresis)) index++;
        while (index > 0 &&
            scaled < entry.levels[index - 1].maxDistance * (1 - entry.hysteresis)) index--;
      }
      if (index < 0) index = entry.levels.length - 1;
      if (index !== entry.index || force) {
        entry.levels.forEach((level, i) => { level.object.visible = i === index; });
        entry.index = index;
      }
    }

    function refreshLODs(force = false) {
      if (!camera || !lodEntries.size) return;
      // Update parent/world matrices once; no forced recomputation per object.
      if (typeof camera.updateWorldMatrix === 'function') camera.updateWorldMatrix(true, false);
      for (const entry of lodEntries.values()) updateOneLOD(entry, force);
    }

    function calculateStats() {
      if (!intervalBuffer.length) return;
      const values = intervalBuffer;
      const sorted = values.slice().sort((a, b) => a - b);
      const sum = values.reduce((a, b) => a + b, 0);
      const mean = sum / values.length;
      const percentile = (p) => sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)];
      cachedStats = {
        fps: round(1000 / mean, 1), avgMs: round(mean, 2),
        p90Ms: round(percentile(0.9), 2),
        p95Ms: round(percentile(0.95), 2),
        worstMs: round(sorted[sorted.length - 1], 2),
        samples: values.length
      };
    }

    function adjustIfNeeded(now) {
      if (!adaptive || counter < 50 || intervalBuffer.length < 40 || now - lastAdjustAt < 1900) return;
      const baseMs = 1000 / modePreset().targetFPS;
      const s = cachedStats;
      const tooSlow = s.avgMs > baseMs * 1.045 || s.p90Ms > baseMs * 1.17;
      const lotsOfRoom = s.avgMs < baseMs * 0.85 && s.p90Ms < baseMs * 0.95;
      let changed = false;
      const cap = capDPR();
      const floor = floorDPR();
      const currentDPR = desiredDPR === null ? cap : desiredDPR;
      if (tooSlow) {
        // Draw-call-bound scenes should reduce scene complexity before pixel count.
        if (drawCalls > 420 && detail > modePreset().minDetail + 0.015) {
          detail = round(Math.max(modePreset().minDetail, detail - 0.12), 3);
          changed = true;
        } else if (manageDPR && currentDPR > floor + 0.02) {
          desiredDPR = Math.max(floor, currentDPR - 0.15);
          applyDPR();
          changed = true;
        } else if (detail > modePreset().minDetail + 0.015) {
          detail = round(Math.max(modePreset().minDetail, detail - 0.12), 3);
          changed = true;
        }
        tuning = changed ? 'decreased' : 'at-minimum';
      } else if (lotsOfRoom && now - lastAdjustAt >= 4200) {
        // Recovery deliberately slower than downshifts to prevent oscillation.
        if (detail < modePreset().initialDetail - 0.015) {
          detail = round(Math.min(modePreset().initialDetail, detail + 0.07), 3);
          changed = true;
        } else if (manageDPR && currentDPR < cap - 0.02) {
          desiredDPR = Math.min(cap, currentDPR + 0.08);
          applyDPR();
          changed = true;
        }
        tuning = changed ? 'increased' : 'stable';
      } else {
        tuning = 'stable';
      }
      if (changed) {
        lastAdjustAt = now;
        publishChange();
        refreshLODs(true);
      }
    }

    function beginFrame() {
      if (disposed) return;
      renderBeginAt = msNow();
    }

    function endFrame() {
      if (disposed) return;
      if (renderBeginAt !== null) {
        renderCPU = Math.max(0, msNow() - renderBeginAt);
        renderBeginAt = null;
      }
      if (!renderer || !renderer.info) return;
      const info = renderer.info;
      drawCalls = info.render && finite(info.render.calls) ? info.render.calls : 0;
      triangles = info.render && finite(info.render.triangles) ? info.render.triangles : 0;
      geometries = info.memory && finite(info.memory.geometries) ? info.memory.geometries : 0;
      textures = info.memory && finite(info.memory.textures) ? info.memory.textures : 0;
    }

    function update(dt, context = {}) {
      if (disposed) return;
      if (context && context.renderer) attachRenderer(context.renderer);
      if (context && context.camera) camera = context.camera;
      counter++;
      const now = msNow();
      if (!finite(dt) && lastFrameAt !== null) dt = (now - lastFrameAt) / 1000;
      lastFrameAt = now;
      // Ignore extreme background-tab/sleep gaps; a genuine 20-100ms frame is retained.
      if (!(typeof document !== 'undefined' && document.hidden) && finite(dt) && dt >= 0.001 && dt < 0.25) {
        intervalBuffer.push(dt * 1000);
        if (intervalBuffer.length > sampleLimit) intervalBuffer.shift();
      }
      if (now - lastStatsRecalc >= 180 || intervalBuffer.length === 1) {
        calculateStats();
        lastStatsRecalc = now;
      }
      if (counter % lodRefreshFrames === 0) refreshLODs();
      adjustIfNeeded(now);
    }

    function getMetrics() {
      return {
        ...cachedStats,
        renderCpuMs: round(renderCPU, 2),
        drawCalls, triangles, geometries, textures,
        registeredClients: clients.size, registeredLODs: lodEntries.size,
        ...snapshotBudget()
      };
    }

    function dispose() {
      if (disposed) return;
      disposed = true;
      for (const id of Array.from(lodEntries.keys())) unregisterLOD(id);
      clients.clear();
      restoreRendererDPR();
      intervalBuffer.length = 0;
      renderer = null;
      camera = null;
      root.clear(); // root is a non-rendered container; nothing external is disposed.
    }

    attachRenderer(options.renderer || null);
    publishChange();
    return {
      root, update, setQuality, dispose,
      setAdaptive, getMetrics, getBudget: snapshotBudget,
      registerClient, registerLOD, unregisterLOD,
      beginFrame, endFrame,
      getHistory: () => intervalBuffer.slice(),
      version: '1.0.0'
    };
  }

  scope.createAetherModule = createAetherModule;
  if (typeof module !== 'undefined' && module.exports) module.exports = { createAetherModule };
})(scope);
export const createAetherModule = scope.createAetherModule;
