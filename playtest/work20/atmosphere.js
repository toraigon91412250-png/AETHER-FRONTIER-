import {loadAetherCompat} from '../../integration/aether-compat.mjs';

export async function createAtmosphere(THREE,scene,city) {
  const module=await loadAetherCompat({THREE,id:'18',options:{skyRadius:830,timeOfDay:16.5}});
  scene.add(module.root);
  module.instance.setAutoCycle(true,420);
  module.instance.setCloudSeaLevel(-16);
  const skyline=new THREE.Group();
  const box=new THREE.BoxGeometry(1,1,1);
  const material=new THREE.MeshStandardMaterial({color:0x384a68,roughness:.9});
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
  const weather=['clear','overcast','storm','mist'].filter(name=>module.instance.setWeather(name,0));
  if(!weather.length)throw new Error('No.18 has no supported weather presets');
  module.instance.setWeather(weather[0],0);
  let climate=0,elapsed=0;
  let detail=true;
  function update(dt,camera,zone,quality,ambient,sun) {
    const indoor=zone==='lab'||zone==='vault';
    const distance=Math.hypot(camera.position.x,camera.position.z);
    const threshold=quality==='high'?550:400;
    if(distance>threshold+45)detail=false;
    else if(distance<threshold-45)detail=true;
    city.root.visible=!indoor&&detail;
    skyline.visible=!indoor&&!detail&&distance<990;
    module.root.visible=!indoor;
    elapsed+=dt;
    if(elapsed>=52){elapsed=0;climate=(climate+1)%weather.length;module.instance.setWeather(weather[climate],8);}
    if(indoor){ambient.intensity=1.5;sun.intensity=.7;return;}
    module.update(dt,{camera,quality});
    const light=module.instance.getLightingHint();
    sun.position.copy(light.sunDirection).multiplyScalar(200);
    sun.color.copy(light.sunColor);
    sun.intensity=light.suggestedSunIntensity*1.4;
    ambient.color.copy(light.ambientColor);
    ambient.intensity=1.05+light.daylight*.75;
    scene.fog.color.copy(light.ambientColor).lerp(ambient.groundColor,.18);
  }
  return {module,update,dispose(){module.dispose();skyline.removeFromParent();box.dispose();material.dispose();}};
}
