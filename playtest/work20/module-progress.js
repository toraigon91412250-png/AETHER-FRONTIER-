/**
 * No.00 persistence adapter for Work20's independent exploration modules.
 * Restores state by replaying public puzzle interactions. Never mutates team
 * internals or the host's renderer, scene, player, camera, or localStorage.
 * Three.js and browser globals are intentionally not required.
 */
const BOOL = v => v === true;
const RECORD = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const PLANT_SECTORS = Object.freeze(['01', '02', '03']);
const LAB_TERMINALS = Object.freeze([
  {id:'valveA', x:-57, z:-46, when:s=>BOOL(s.valveA)||BOOL(s.valveB)||BOOL(s.cooling)},
  {id:'valveB', x:-57, z:-25, when:s=>BOOL(s.valveB)||BOOL(s.cooling)},
  {id:'tone1', x:59, z:-46, when:s=>Number.isInteger(s.tuning)&&s.tuning>=1},
  {id:'tone2', x:59, z:-36, when:s=>Number.isInteger(s.tuning)&&s.tuning>=2},
  {id:'tone3', x:59, z:-26, when:s=>Number.isInteger(s.tuning)&&s.tuning>=3},
  {id:'archive', x:0, z:-99, when:s=>BOOL(s.archive)},
  {id:'secret', x:-29, z:-44.2, when:s=>BOOL(s.secret)},
  {id:'gate', x:3.8, z:-108.2, when:s=>BOOL(s.gateOpen)||BOOL(s.awakened)},
  {id:'core', x:0, z:-156.6, when:s=>BOOL(s.awakened)},
]);

export const MODULE_PROGRESS_VERSION = 1;
export const MODULE_PROGRESS_AREAS = Object.freeze(['temple','lab','plant']);

// Save only stable puzzle data. Exclude implementation and quality settings.
function sanitize(area, raw) {
  if(!RECORD(raw))return null;
  if(area==='temple')return Object.fromEntries(
    ['west','east','heart','gate','archive'].map(k=>[k,BOOL(raw[k])]));
  if(area==='lab')return {
    valveA:BOOL(raw.valveA), valveB:BOOL(raw.valveB), cooling:BOOL(raw.cooling),
    tuning:Number.isInteger(raw.tuning)?Math.max(0,Math.min(3,raw.tuning)):0,
    archive:BOOL(raw.archive), gateOpen:BOOL(raw.gateOpen),
    awakened:BOOL(raw.awakened), secret:BOOL(raw.secret),
  };
  if(area==='plant')return {
    activeSectors:PLANT_SECTORS.filter(id=>Array.isArray(raw.activeSectors)&&raw.activeSectors.includes(id)),
    overdrive:BOOL(raw.overdrive),
  };
  return null;
}

export function captureModuleProgress(areas) {
  const states={version:MODULE_PROGRESS_VERSION};
  for(const key of MODULE_PROGRESS_AREAS) {
    const instance=areas?.get?.(key)?.module?.instance;
    if(typeof instance?.getState !== 'function')continue;
    try {
      const data=sanitize(key,instance.getState());
      if(data)states[key]=data;
    } catch { /* One faulty module must not prevent other saves. */ }
  }
  return states;
}

function replayTemple(instance,s) {
  const actions=['west','east','heart','archive'];
  const applied=[];
  for(const id of actions) {
    if(!BOOL(s[id]))continue;
    if(BOOL(instance.getState()[id]))continue;
    const entry=instance.getInteractables?.().find(entry=>entry.id===id);
    if(!entry?.position)throw new Error(`temple:${id}: missing interactable`);
    const result=instance.interact(entry.position);
    if(!result?.ok || !BOOL(instance.getState()[id]))throw new Error(`temple:${id}: not restored`);
    applied.push(id);
  }
  if(BOOL(s.gate)&&!BOOL(instance.getState().gate))throw new Error('temple:gate: prerequisites missing');
  return applied;
}
function replayLab(instance,s) {
  const applied=[];
  for(const terminal of LAB_TERMINALS) {
    if(!terminal.when(s))continue;
    const current=instance.getState();
    if(terminal.id==='tone1'&&current.tuning>=1)continue;
    if(terminal.id==='tone2'&&current.tuning>=2)continue;
    if(terminal.id==='tone3'&&current.tuning>=3)continue;
    const key=terminal.id==='tone1'||terminal.id==='tone2'||terminal.id==='tone3'
      ?null:terminal.id==='gate'?'gateOpen':terminal.id==='core'?'awakened':terminal.id;
    if(key&&BOOL(current[key]))continue;
    instance.interact({x:terminal.x,y:1.5,z:terminal.z},1.9);
    const after=instance.getState();
    const success=key?BOOL(after[key]):after.tuning>=Number(terminal.id.slice(-1));
    if(!success)throw new Error(`lab:${terminal.id}: prerequisites missing`);
    applied.push(terminal.id);
  }
  return applied;
}
function replayPlant(instance,s) {
  const applied=[];
  const desired=PLANT_SECTORS.filter(id=>s.activeSectors.includes(id));
  // Overdrive only exists after all three subsystems are activated.
  if(s.overdrive)for(const id of PLANT_SECTORS)if(!desired.includes(id))desired.push(id);
  for(const id of desired) {
    if(instance.getState().activeSectors.includes(id))continue;
    const result=instance.interact(id);
    if(!result?.ok || !instance.getState().activeSectors.includes(id))throw new Error(`plant:${id}: restore failed`);
    applied.push(id);
  }
  if(s.overdrive&&!instance.getState().overdrive) {
    const result=instance.interact('FINAL');
    if(!result?.ok||!instance.getState().overdrive)throw new Error('plant:FINAL: restore failed');
    applied.push('FINAL');
  }
  return applied;
}

export function restoreModuleProgress(areas, stored) {
  const report={restored:[],skipped:[],errors:[]};
  if(!RECORD(stored)||stored.version!==MODULE_PROGRESS_VERSION)return report;
  for(const key of MODULE_PROGRESS_AREAS) {
    const data=sanitize(key,stored[key]);
    const module=areas?.get?.(key)?.module;
    const instance=module?.instance;
    if(!data||typeof instance?.getState!=='function'||typeof instance?.interact!=='function'){
      report.skipped.push(key);continue;
    }
    try {
      // Future team updates may expose a native state API. Prefer it when available.
      let operations;
      if(typeof instance.setState==='function'){
        const result=instance.setState(data);
        if(result===false)throw new Error(`${key}: native setState rejected save`);
        operations=['setState'];
      } else {
        operations=key==='temple'?replayTemple(instance,data)
          :key==='lab'?replayLab(instance,data):replayPlant(instance,data);
      }
      module.drainEvents?.(); // Replayed historical events must not trigger new quests.
      report.restored.push({area:key,operations});
    }catch(error){
      module.drainEvents?.();
      report.errors.push({area:key,message:error?.message||String(error)});
    }
  }
  return report;
}
