/**
 * Work20 readability policy. Keep postprocessing off and do not change asset geometry.
 * The host owns tone mapping, fog and global lights.
 */
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

export function computeVisualProfile(zone,quality,hint={}) {
  const indoor=zone==='lab'||zone==='vault';
  const high=quality==='high';
  const day=clamp(Number.isFinite(hint?.daylight)?hint.daylight:1,0,1);
  const sun=clamp(Number.isFinite(hint?.suggestedSunIntensity)?hint.suggestedSunIntensity:1.45,0,4);
  const weatherFog=clamp(Number.isFinite(hint?.suggestedFogDensity)?hint.suggestedFogDensity:.001,0,.008);
  return {
    exposure:indoor?1.55:(high?1.39:1.44),
    ambientIntensity:indoor?2.18:1.88+day*.42,
    sunIntensity:indoor?1.00:Math.max(1.12,Math.min(2.65,sun*1.48)),
    fogDensity:indoor?.00016:clamp(weatherFog*.66+.00024,.00080,high?.00175:.00185),
    cityDetailRange:high?465:350,
  };
}

/**
 * With no environment map, physically metallic materials can look almost black.
 * Preserve original values and clamp ONLY reflectance/roughness by display quality.
 * No material/geometry allocation, no scene traversal per frame.
 */
export function createReadabilityMaterials(root) {
  const seen=new Set(),materials=[];
  root.traverse?.(object=>{
    const candidates=Array.isArray(object.material)?object.material:[object.material];
    for(const mat of candidates){
      if(!mat?.isMeshStandardMaterial||seen.has(mat))continue;
      seen.add(mat);
      materials.push({mat,metalness:mat.metalness,roughness:mat.roughness});
    }
  });
  function setQuality(mode){
    const high=mode==='high';
    for(const {mat,metalness,roughness} of materials){
      mat.metalness=Math.min(metalness,high?.67:.56);
      mat.roughness=Math.max(roughness,high?.36:.45);
    }
  }
  return {setQuality,get count(){return materials.length;}};
}
