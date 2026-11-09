/**
 * AETHER FRONTIER / No.00: independent integration adapter for 20 team modules.
 * Three.js r160, Y-up, -Z forward, 1 unit approximately 1 meter.
 * Browser-native ES modules; no npm, bundler, renderer or scene ownership.
 * Originals are left unchanged. The host owns camera/scene/renderer/player/save/HP.
 */
import {TEAM_REGISTRY,TEAM_IDS,teamId,canonicalQuality,moduleQuality,importTeamFactory} from './team-registry.mjs';
export {TEAM_REGISTRY,TEAM_IDS,teamId,canonicalQuality,moduleQuality,importTeamFactory};

const finite=(v,fallback=0)=>Number.isFinite(v)?v:fallback;
function checkContract(mod,id) {
  for(const name of ['root','update','setQuality','dispose']){
    if(!(name in mod)|| (name!=='root'&&typeof mod[name]!=='function'))
      throw new TypeError('No.'+id+' missing API: '+name);
  }
  if(typeof mod.root.updateWorldMatrix!=='function'||typeof mod.root.worldToLocal!=='function'||typeof mod.root.localToWorld!=='function')
    throw new TypeError('No.'+id+' root must be a THREE.Object3D');
}

/**
 * @param {Object} params
 * @param {object} params.THREE Same THREE namespace for ALL modules.
 * @param {string|number} params.id Team identifier 01..20 (No.00 is the host).
 * @param {Function} params.factory Team's createAetherModule, imported separately.
 * @param {Object} [params.options] Native module options, camera/renderer only if required.
 * @param {string} [params.quality] Unified 'lite' or 'high'.
 * @param {Function} [params.onEvent] Host callback receiving normalized {teamId,type,payload,raw}.
 */
export function createAetherCompat({THREE,id,factory,options={},quality='lite',onEvent}={}) {
  const key=teamId(id);
  if(typeof factory!=='function')throw new TypeError('No.'+key+' factory must be a function');
  if(!THREE||typeof THREE.Vector3!=='function')throw new TypeError('THREE.Vector3 required');
  let mode=canonicalQuality(quality),disposed=false;
  const queue=[];
  const emit=(e)=>{
    const raw=e&&typeof e==='object'?e:{type:'event',value:e};
    const payload={teamId:key,type:String(raw.type??'event'),payload:raw,raw};
    if(queue.length>=64)queue.shift();queue.push(payload);
    if(typeof onEvent==='function')onEvent(payload);
  };
  const nativeOptions={...options,quality:moduleQuality(key,mode)};
  const originalOnEvent=options.onEvent;
  nativeOptions.onEvent=(e)=>{
    emit(e);
    if(typeof originalOnEvent==='function')originalOnEvent(e);
  };
  const instance=factory(THREE,nativeOptions);
  if(!instance||typeof instance!=='object')throw new TypeError('No.'+key+' factory returned no module');
  checkContract(instance,key);
  const root=instance.root;

  const toLocal=(point)=>{
    root.updateWorldMatrix(true,false);
    return root.worldToLocal(new THREE.Vector3(finite(point?.x),finite(point?.y),finite(point?.z)));
  };
  const toWorld=(point)=>{
    root.updateWorldMatrix(true,false);
    return root.localToWorld(new THREE.Vector3(finite(point?.x),finite(point?.y),finite(point?.z)));
  };
  // Ground sampling is deliberately explicit; NOT every module has a walkable floor.
  // Return null for out-of-bounds/unknown, never invent walkable world surfaces.
  const localFoot=(x,z,feetY=0)=>toLocal({x,y:feetY,z});
  const fromLocalHeight=(localX,localZ,localY)=>{
    if(!Number.isFinite(localY))return null;
    return toWorld({x:localX,y:localY,z:localZ}).y;
  };
  const sampleGroundWorld=(x,z,feetY=0)=>{
    if(!Number.isFinite(x)||!Number.isFinite(z)||!Number.isFinite(feetY))return null;
    const p=localFoot(x,z,feetY);
    let height=null;
    switch(key){
      case '01':
        if(typeof instance.getFloorHeight==='function')height=instance.getFloorHeight(p.x,p.z,p.y);
        break;
      case '02':
        // Module 02 subtracts its own root.position internally (no parent transform).
        if(typeof instance.getGroundHeight==='function')height=instance.getGroundHeight(p.x+root.position.x,p.z+root.position.z,p.y+root.position.y)-root.position.y;
        break;
      case '03': {
        const result=instance.sampleGround?.(p.x,p.z,p.y);
        height=Number.isFinite(result?.height)?result.height:null;
        break;
      }
      case '04':
        // Its getFloorHeight() accounts for root.position.x/z but NOT root Y.
        if(typeof instance.getFloorHeight==='function'){
          const bounds=instance.metadata?.bounds;
          if(bounds&&(p.x<bounds.min[0]||p.x>bounds.max[0]||p.z<bounds.min[2]||p.z>bounds.max[2]))return null;
          height=instance.getFloorHeight(p.x+root.position.x,p.z+root.position.z);
        }
        break;
      case '05':
        if(instance.isWalkable?.(p.x,p.z))height=0;
        break;
      case '06':
        height=instance.navigation?.sampleGround?.(p.x,p.z,p.y)??null;
        break;
      case '07':
        if(instance.bounds&&(p.x<instance.bounds.minX||p.x>instance.bounds.maxX||p.z<instance.bounds.minZ||p.z>instance.bounds.maxZ))return null;
        height=instance.surfaceHeight?.(p.x,p.z)??null;
        break;
      case '09':
        height=instance.sampleWalkable?.(p.x,p.z,p.y)??null;
        break;
      case '20':
        if(instance.isWalkable?.(p.x,p.z))height=0;
        break;
    }
    return fromLocalHeight(p.x,p.z,height);
  };
  const isBlockedWorld=(x,z,worldY=0,radius=.45)=>{
    if(!Number.isFinite(x)||!Number.isFinite(z)||!Number.isFinite(worldY))return false;
    const p=toLocal({x,y:worldY,z});
    if(key==='04')return !!instance.isBlocked?.(p.x+root.position.x,p.z+root.position.z,p.y,radius);
    if(key==='05')return !instance.isWalkable?.(p.x,p.z,radius);
    if(key==='06')return !!instance.navigation?.collides?.(p.x,p.z,radius,p.y);
    // null = this module does not implement blockers. Host can consult another module.
    return null;
  };
  const getSpawnWorld=()=>{
    if(typeof instance.getSpawnPoint==='function'){
      const point=instance.getSpawnPoint();
      return key==='04'?toWorld({x:0,y:point.y-root.position.y,z:point.z-root.position.z}):toWorld(point); // No.04 returns root-positioned coordinates; repair parent transforms.
    }
    if(key==='06'&&instance.navigation?.spawn)return toWorld(instance.navigation.spawn);
    return null;
  };
  // Interaction API is only normalized for modules with comparable proximity semantics.
  // Others remain available through `instance` (e.g. No.20 raycasting/puzzles).
  const legacyWorld=(p)=>{
    const v=toLocal(p);
    return new THREE.Vector3(v.x+root.position.x,v.y+root.position.y,v.z+root.position.z);
  };
  const nearestWorld=(position,range=4)=>{
    if(!position)return null;
    const p=toLocal(position);
    switch(key){
      case '04': {
        const hit=instance.nearest?.(legacyWorld(position),range);
        return hit?{...hit,position:hit.position?toWorld({x:hit.position.x-root.position.x,y:hit.position.y-root.position.y,z:hit.position.z-root.position.z}):null}:null;
      }
      case '05': {
        const hit=instance.getNearestInteractable?.(p,range);
        return hit?{...hit,position:hit.position?toWorld(hit.position):null}:null;
      }
      case '06':return instance.getNearestInteraction?.(position,range)??null;
      case '07':return instance.getNearby?.(p,range)??null;
      default:return null;
    }
  };
  const interactWorld=(position,range=4)=>{
    if(!position)return {ok:false,reason:'missing_position'};
    const p=toLocal(position);
    if(key==='04')return instance.interact(legacyWorld(position));
    if(key==='05')return instance.interact(p,range);
    if(key==='07')return instance.interact(p);
    if(key==='06'){
      const hit=nearestWorld(position,range);
      return hit?instance.interact(hit.id):{ok:false,reason:'out_of_range'};
    }
    return {ok:false,reason:'module_requires_specialized_interaction'};
  };
  const update=(dt,context={})=>{
    if(disposed)return;
    const d=Math.max(0,Math.min(.1,finite(dt)));
    const ctx={...context};
    if(typeof ctx.quality==='string')ctx.quality=moduleQuality(key,ctx.quality);
    instance.update(d,ctx);
  };
  const setQuality=(next)=>{
    if(disposed)return mode;
    mode=canonicalQuality(next);
    instance.setQuality(moduleQuality(key,mode));
    return mode;
  };
  const dispose=()=>{
    if(disposed)return;
    disposed=true;
    instance.dispose();queue.length=0;
  };
  const drainEvents=()=>queue.splice(0);
  return Object.freeze({id:key,role:TEAM_REGISTRY[key].role,root,instance,update,setQuality,dispose,
    get quality(){return mode;},get disposed(){return disposed;},
    toLocal,toWorld,sampleGroundWorld,isBlockedWorld,getSpawnWorld,nearestWorld,interactWorld,drainEvents});
}

/** Import native or isolated-legacy factory; retains the original module's source. */
export async function loadAetherCompat({THREE,id,baseUrl=new URL('../',import.meta.url),...rest}={}) {
  const factory=await importTeamFactory(id,baseUrl);
  return createAetherCompat({THREE,id,factory,...rest});
}
