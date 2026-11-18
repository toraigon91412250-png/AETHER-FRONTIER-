import {loadAetherCompat} from '../../integration/aether-compat.mjs';
import {computeVisualProfile} from './visual-clarity.js';

export async function createAtmosphere(THREE,scene,city) {
  const module=await loadAetherCompat({THREE,id:'18',options:{skyRadius:830,timeOfDay:12.3}});
  scene.add(module.root);
  module.instance.setAutoCycle(true,1800);
  module.instance.setCloudSeaLevel(-16);
  const skyline=new THREE.Group();
  const box=new THREE.BoxGeometry(1,1,1);
  const material=new THREE.MeshStandardMaterial({color:0x647f95,roughness:.9});
  const silhouette=[ [0,0,23,124,23], [0,0,40,64,40] ];
  for(let i=0;i<16;i++){
    const a=i*Math.PI/8;
    const r=i%2?75:96;
    silhouette.push([Math.sin(a)*r,Math.cos(a)*r,12,12+(i*13)%27,13]);
  }
  for(const [x,z,w,h,d] of silhouette){
    const mesh=new THREE.Mesh(box,material);
    mesh.position.set(x,h/2,z);mesh.scale.set(w,h,d);
    skyline.add(mesh);
  }
  scene.add(skyline);
  const weather=['clear','cloudy','rain','storm','mist'];
  let climate=0,elapsed=0,detail=true;
  const fillTint=new THREE.Color(0xd5edfa),fogTint=new THREE.Color(0xa7c9db);
  const groundTint=new THREE.Color(0x8497ad);
  function update(dt,camera,zone,quality,ambient,sun,renderer) {
    const indoor=zone==='lab'||zone==='vault';
    const distance=Math.hypot(camera.position.x,camera.position.z,Math.max(0,camera.position.y-40));
    const threshold=computeVisualProfile(zone,quality).cityDetailRange;
    if(distance>threshold+35)detail=false;
    else if(distance<threshold-35)detail=true;
    city.root.visible=!indoor&&detail;
    skyline.visible=!indoor&&!detail&&distance<990;
    module.root.visible=!indoor;
    elapsed+=Math.max(0,dt);
    if(elapsed>=115){elapsed%=115;climate=(climate+1)%weather.length;module.instance.setWeather(weather[climate],10);}
    if(!indoor)module.update(dt,{camera,quality});
    const light=indoor?null:module.instance.getLightingHint();
    const profile=computeVisualProfile(zone,quality,light);
    const ease=1-Math.exp(-Math.max(0,Math.min(dt,.1))*5);
    if(indoor){
      ambient.color.copy(fillTint);
      ambient.groundColor.copy(groundTint);
      sun.color.setHex(0xffe5cc);
      scene.fog.color.copy(groundTint);
    } else {
      sun.position.copy(light.sunDirection).multiplyScalar(200);
      sun.color.copy(light.sunColor);
      ambient.color.copy(light.ambientColor).lerp(fillTint,.24);
      ambient.groundColor.copy(groundTint);
      scene.fog.color.copy(light.suggestedFogColor).lerp(fogTint,.18);
    }
    sun.intensity+=(profile.sunIntensity-sun.intensity)*ease;
    ambient.intensity+=(profile.ambientIntensity-ambient.intensity)*ease;
    scene.fog.density+=(profile.fogDensity-scene.fog.density)*ease;
    if(renderer)renderer.toneMappingExposure+=(profile.exposure-renderer.toneMappingExposure)*ease;
    return profile;
  }
  return {module,update,dispose(){module.dispose();skyline.removeFromParent();box.dispose();material.dispose();}};
}
