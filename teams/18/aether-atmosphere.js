/**
 * AETHER FRONTIER / No.18 ETHERWEAVE ATMOSPHERE v1.0
 * Three.js r160 / ESM / build-free / world Y-up, forward -Z, 1 unit = 1m.
 *
 * This module owns ONLY its own scene graph and GPU resources.
 * It never changes the caller's renderer, scene.background, scene.fog,
 * tone mapping, camera, environment map or light setup.
 *
 * Usage:
 *   import { createAetherModule } from './aether-atmosphere.js';
 *   const sky = createAetherModule(THREE, { quality:'lite', timeOfDay:17.5 });
 *   scene.add(sky.root);
 *   sky.update(deltaSeconds, { camera });
 *   sky.setWeather('storm', 2);
 *   sky.dispose(); // after scene.remove(sky.root)
 */

const TAU = Math.PI * 2;
const WEATHER = Object.freeze({
  clear:    { clouds:0.19, haze:0.10, rain:0,    dark:0,    aurora:0, wind:0.65 },
  cloudy:   { clouds:0.69, haze:0.28, rain:0,    dark:0.13, aurora:0, wind:1.00 },
  mist:     { clouds:0.53, haze:0.73, rain:0,    dark:0.08, aurora:0, wind:0.38 },
  rain:     { clouds:0.82, haze:0.42, rain:0.72, dark:0.28, aurora:0, wind:1.65 },
  storm:    { clouds:1.00, haze:0.51, rain:1.00, dark:0.55, aurora:0, wind:2.45 },
  aurora:   { clouds:0.12, haze:0.08, rain:0,    dark:0,    aurora:1, wind:0.45 }
});

// Painted atmospheric palettes: zenith / mid sky / horizon / below horizon /
// illuminated cloud / sun. Interpolated smoothly across midnight.
const PALETTE = [
  [ 0.00, '#08152d','#172846','#33435f','#111b34','#7788aa','#ffd09b'],
  [ 4.30, '#0d1a39','#27365e','#625975','#28243c','#7984a5','#ffd5b2'],
  [ 5.60, '#253858','#805f7c','#e89a8d','#514157','#c1a2aa','#ffb777'],
  [ 6.55, '#426889','#a99aaa','#ffd29a','#81736e','#f5d4bd','#ffcc83'],
  [ 8.20, '#327fac','#91c6df','#d9edf1','#9fbfc9','#f4f3ed','#fff1c9'],
  [12.00, '#1769ad','#72b4df','#c9e6f0','#97c1cf','#f1f5f6','#fff5d5'],
  [15.60, '#277aaf','#87bfdd','#e9e2ce','#abbbc5','#f6e5d0','#ffdcaa'],
  [17.40, '#46517b','#bc899b','#ffbf84','#6e6277','#f8caaa','#ffbe81'],
  [18.35, '#28345e','#815374','#ed967c','#504257','#dca3a6','#ffab7c'],
  [19.35, '#132448','#394063','#8b5970','#272841','#8b7d98','#ffbd99'],
  [21.00, '#08162f','#172a49','#394762','#141d35','#6e7f9e','#ffd0a2'],
  [24.00, '#08152d','#172846','#33435f','#111b34','#7788aa','#ffd09b']
];

const SKY_VERTEX = `
  varying vec3 vDirection;
  void main() {
    vDirection = position;
    vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = clip;
    // Sky is always rendered at the farthest depth, without writing depth.
    gl_Position.z = gl_Position.w * 0.9999;
  }
`;

const SKY_FRAGMENT = `
  precision highp float;
  varying vec3 vDirection;
  uniform vec3 uZenith;
  uniform vec3 uUpper;
  uniform vec3 uHorizon;
  uniform vec3 uGround;
  uniform vec3 uCloudColor;
  uniform vec3 uSunColor;
  uniform vec3 uSunDirection;
  uniform float uDaylight;
  uniform float uClouds;
  uniform float uHaze;
  uniform float uDarkness;
  uniform float uAurora;
  uniform float uFlash;
  uniform float uTime;
  uniform float uWind;

  float hash31(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }
  float hash21(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float noise2(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0,0.0));
    float c = hash21(i + vec2(0.0,1.0));
    float d = hash21(i + vec2(1.0,1.0));
    return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
  }

  void main(){
    vec3 d = normalize(vDirection);
    float y = d.y;
    float mid = smoothstep(-0.07,0.48,y);
    vec3 sky = mix(uHorizon, uUpper, mid);
    sky = mix(sky, uZenith, smoothstep(0.28,0.98,y));
    sky = mix(uGround,sky,smoothstep(-0.48,0.025,y));
    float horizonMist = exp(-pow(y / (0.13 + uHaze*0.14),2.0));
    sky = mix(sky, uHorizon + vec3(0.055,0.048,0.045),horizonMist*(0.15 + uHaze*0.36));

    float sunDot = dot(d,uSunDirection);
    float sunVisibility = smoothstep(-0.10,0.10,uSunDirection.y);
    float warmGlow = pow(max(sunDot,0.0),9.0) * 0.30 + pow(max(sunDot,0.0),44.0)*0.26;
    sky += uSunColor * warmGlow * sunVisibility * (1.0-uDarkness*0.48);

    // Sparse stable stars; no per-frame CPU update and no texture download.
    vec3 cellPos = d * 390.0;
    vec3 cell = floor(cellPos);
    vec3 f = fract(cellPos) - 0.5;
    float seed = hash31(cell);
    float star = step(0.9980,seed) * (1.0-smoothstep(0.01,0.41,length(f)));
    float sparkle = 0.78 + 0.22*sin(uTime*0.78 + seed*70.0);
    float night = 1.0-smoothstep(0.03,0.48,uDaylight);
    float stars = star * sparkle * night * smoothstep(-0.10,0.09,y);
    sky += stars * mix(vec3(0.48,0.68,1.0),vec3(1.0,0.96,0.85),hash31(cell+21.4)) * 1.35;

    // Moon remains opposite the sun, with a faint halo.
    float moonDot = dot(d,-uSunDirection);
    float moonUp = smoothstep(-0.08,0.10,-uSunDirection.y);
    float moonDisc = smoothstep(0.99958,0.99974,moonDot) * moonUp;
    float moonHalo = pow(max(moonDot,0.0),80.0) * 0.075 * moonUp;
    float moonMottle = 0.95;
#ifdef HIGH_QUALITY
    if (moonDot > 0.999) moonMottle = 0.88 + 0.12*noise2(d.xz*270.0);
#endif
    sky += vec3(0.67,0.77,0.95) * (moonDisc*moonMottle*0.76+moonHalo) * night;

#ifdef HIGH_QUALITY
    // High cloud strata: two cheap value-noise octaves, only on the sky dome.
    float az = atan(d.z,d.x);
    vec2 uv = vec2(az*2.7,d.y*5.3);
    uv += vec2(uTime*0.0036*uWind,uTime*0.0012*uWind);
    float n = noise2(uv*2.0)*0.66 + noise2(uv*4.6)*0.34;
    float cloud = smoothstep(0.45-uClouds*0.20,0.76-uClouds*0.09,n);
    float region = smoothstep(-0.07,0.10,y) * (1.0-smoothstep(0.65,0.94,y));
    float lightFacing = smoothstep(-0.23,0.78,sunDot);
    vec3 cirrus = mix(uUpper*0.78,uCloudColor,0.50+0.4*lightFacing);
    sky = mix(sky,cirrus,cloud*region*(0.12+uClouds*0.46));
#endif
    // Aurora remains available in Lite mode; high mode adds extra ripples.
    if (uAurora > 0.01 && night > 0.02) {
      float aurAz = atan(d.z,d.x);
      float band = sin(aurAz*6.0 + sin(y*4.0+uTime*0.04)*1.3);
      float curtain = pow(max(0.0,band*0.5+0.5),7.0) *
        smoothstep(0.10,0.42,y)*(1.0-smoothstep(0.87,0.99,y));
#ifdef HIGH_QUALITY
      float ripple = sin(y*24.0 + aurAz*5.0 - uTime*0.16)*0.5 + 0.5;
#else
      float ripple = sin(y*8.0 - uTime*0.09)*0.5 + 0.5;
#endif
      vec3 auroraColor = mix(vec3(0.14,0.75,0.69),vec3(0.57,0.42,0.92),ripple);
      sky += auroraColor * curtain * uAurora * night * 0.70;
    }
    float disc = smoothstep(0.99970,0.99985,sunDot) * sunVisibility;
    sky += uSunColor * disc * 2.1 * (1.0-uDarkness*0.5);
    sky = mix(sky,vec3(0.84,0.91,1.0),uFlash*0.58);
    gl_FragColor = vec4(sky,1.0);
    #include <colorspace_fragment>
  }
`;

const SEA_VERTEX = `
  varying vec2 vPos;
  void main(){
    vPos = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
  }
`;

const SEA_FRAGMENT = `
  precision mediump float;
  varying vec2 vPos;
  uniform vec3 uCloudColor;
  uniform vec3 uShadowColor;
  uniform float uTime;
  uniform float uCoverage;
  uniform float uWind;
  uniform float uHaze;
  float hash2(vec2 p){
    return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);
  }
  float n2(vec2 p){
    vec2 i=floor(p),f=fract(p);
    f=f*f*(3.0-2.0*f);
    return mix(mix(hash2(i),hash2(i+vec2(1.0,0.0)),f.x),
               mix(hash2(i+vec2(0.0,1.0)),hash2(i+vec2(1.0,1.0)),f.x),f.y);
  }
  void main(){
    vec2 p=vPos*0.009 + vec2(uTime*uWind*0.014,-uTime*uWind*0.005);
    float n=n2(p)*0.70;
#ifdef HIGH_QUALITY
    n += n2(p*2.37+4.3)*0.22+n2(p*4.80-7.1)*0.08;
#else
    n += n2(p*2.37+4.3)*0.30;
#endif
    float wave = smoothstep(0.25-uCoverage*0.10,0.72,n);
    vec3 c = mix(uShadowColor,uCloudColor,wave);
    float alpha= (0.44+uCoverage*0.43) * (0.78+wave*0.22);
    // Soften the square edges of this camera-following cloud ocean.
    float rim = 1.0-smoothstep(1010.0,1510.0,length(vPos));
    alpha *= rim;
    c = mix(c,uCloudColor,uHaze*0.24);
    gl_FragColor = vec4(c,alpha);
    #include <colorspace_fragment>
  }
`;

const RAIN_VERTEX = `
  uniform float uTime;
  uniform float uWind;
  uniform float uSize;
  varying float vDepth;
  void main(){
    vec3 p=position;
    p.y=mod(position.y-uTime*(42.0+uWind*6.0)+2000.0,100.0)-42.0;
    p.x+=uWind*(48.0-p.y)*0.055;
    vec4 mv=modelViewMatrix*vec4(p,1.0);
    gl_Position=projectionMatrix*mv;
    gl_PointSize=clamp(uSize*(22.0/max(-mv.z,3.0)),2.0,13.0);
    vDepth=clamp(1.0-(-mv.z)/85.0,0.1,1.0);
  }
`;
const RAIN_FRAGMENT = `
  precision mediump float;
  uniform float uOpacity;
  varying float vDepth;
  void main(){
    vec2 uv=gl_PointCoord-0.5;
    float streak=(1.0-smoothstep(0.04,0.20,abs(uv.x)))*
                 (1.0-smoothstep(0.31,0.50,abs(uv.y)));
    gl_FragColor=vec4(0.70,0.84,1.0,streak*uOpacity*vDepth*0.72);
    #include <colorspace_fragment>
  }
`;

export function createAetherModule(THREE, options = {}) {
  if (!THREE || !THREE.Group || !THREE.ShaderMaterial || !THREE.InstancedMesh) {
    throw new Error('No.18 needs the Three.js r160 namespace.');
  }
  const root = new THREE.Group();
  root.name = 'AF18_EtherweaveAtmosphere';
  const ownedGeometry = [];
  const ownedMaterials = [];
  const skyRadius = Math.max(600, Number(options.skyRadius) || 1600);
  const initialQuality = options.quality === 'high' ? 'high' : 'lite';
  let quality = initialQuality;
  let disposed = false;
  let elapsed = 0;
  let timeOfDay = Number.isFinite(options.timeOfDay) ? ((options.timeOfDay%24)+24)%24 : 16.6;
  let autoCycle = !!options.autoCycle;
  let dayLengthSeconds = Math.max(30, Number(options.dayLengthSeconds) || 240);
  let weatherName = Object.hasOwn(WEATHER, options.weather) ? options.weather : 'clear';
  let transitionSeconds = 0;
  const weatherCurrent = { ...WEATHER[weatherName] };
  let weatherTarget = { ...WEATHER[weatherName] };
  let customWind = Number.isFinite(options.windSpeed) ? Math.max(0,options.windSpeed) : null;
  let seaLevel = Number.isFinite(options.cloudSeaLevel) ? options.cloudSeaLevel : -120;
  let cloudSeaEnabled = options.cloudSea !== false;
  let lightningTimer = 3.5, flash = 0;
  let seed = 18673;
  function random(){ seed = (Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; }
  function clamp(v,a,b){ return Math.min(b,Math.max(a,v)); }
  function wrapHour(v){ return ((v%24)+24)%24; }
  function smooth(a,b,x){ x=clamp((x-a)/(b-a),0,1); return x*x*(3-2*x); }
  function rememberGeom(g){ ownedGeometry.push(g); return g; }
  function rememberMat(m){ ownedMaterials.push(m); return m; }
  const uniformSet = () => ({
    uZenith:{value:new THREE.Color()},uUpper:{value:new THREE.Color()},
    uHorizon:{value:new THREE.Color()},uGround:{value:new THREE.Color()},
    uCloudColor:{value:new THREE.Color()},uSunColor:{value:new THREE.Color()},
    uSunDirection:{value:new THREE.Vector3(0,1,-1).normalize()},
    uDaylight:{value:1},uClouds:{value:0.2},uHaze:{value:0.1},
    uDarkness:{value:0},uAurora:{value:0},uFlash:{value:0},
    uTime:{value:0},uWind:{value:0.65}
  });
  const skyUniforms = uniformSet();
  const skyMats = {
    lite: rememberMat(new THREE.ShaderMaterial({
      name:'AF18_Sky_Lite', uniforms:skyUniforms,
      vertexShader:SKY_VERTEX,fragmentShader:SKY_FRAGMENT,
      depthTest:false,depthWrite:false,side:THREE.BackSide,
      fog:false,toneMapped:false
    })),
    high: rememberMat(new THREE.ShaderMaterial({
      name:'AF18_Sky_High',uniforms:skyUniforms,
      vertexShader:SKY_VERTEX,fragmentShader:SKY_FRAGMENT,
      defines:{HIGH_QUALITY:1},depthTest:false,depthWrite:false,
      side:THREE.BackSide,fog:false,toneMapped:false
    }))
  };
  const sky = new THREE.Mesh(rememberGeom(new THREE.SphereGeometry(skyRadius,32,20)),skyMats[quality]);
  sky.name='SkyDome_NoDepth_NoSceneMutation';
  sky.frustumCulled=false;
  sky.renderOrder=-1000;
  root.add(sky);

  // Cloud-ocean sheet, world-height anchored but X/Z follow observer.
  const seaUniforms = {
    uCloudColor:{value:new THREE.Color()},uShadowColor:{value:new THREE.Color()},
    uTime:{value:0},uCoverage:{value:0.2},uWind:{value:1},uHaze:{value:0.1}
  };
  const seaMats = {
    lite:rememberMat(new THREE.ShaderMaterial({name:'AF18_CloudOcean_Lite',
      uniforms:seaUniforms,vertexShader:SEA_VERTEX,fragmentShader:SEA_FRAGMENT,
      transparent:true,depthWrite:false,side:THREE.DoubleSide,fog:false,toneMapped:false})),
    high:rememberMat(new THREE.ShaderMaterial({name:'AF18_CloudOcean_High',
      uniforms:seaUniforms,vertexShader:SEA_VERTEX,fragmentShader:SEA_FRAGMENT,
      defines:{HIGH_QUALITY:1},transparent:true,depthWrite:false,
      side:THREE.DoubleSide,fog:false,toneMapped:false}))
  };
  const sea = new THREE.Mesh(rememberGeom(new THREE.PlaneGeometry(3000,3000,1,1)),seaMats[quality]);
  sea.name='CloudOcean_Optional';
  sea.rotation.x=-Math.PI/2;
  sea.position.y=seaLevel;
  sea.renderOrder=-10;
  sea.frustumCulled=false;
  sea.visible=cloudSeaEnabled;
  root.add(sea);

  // Horizon cloud sculptures, single draw call each via instanced geometry.
  // Deliberately use MeshBasic: no dependency on host lighting/environment.
  const cloudGeometry = rememberGeom(new THREE.IcosahedronGeometry(1,1));
  const upperMat = rememberMat(new THREE.MeshBasicMaterial({
    name:'AF18_CloudBillows',color:0xffffff,transparent:true,
    opacity:0.7,depthWrite:false,fog:false,toneMapped:false
  }));
  const lowerMat = rememberMat(new THREE.MeshBasicMaterial({
    name:'AF18_CloudUndersides',color:0x63758c,transparent:true,
    opacity:0.37,depthWrite:false,fog:false,toneMapped:false
  }));
  const MAX_CLUSTERS = 64, LOBES = 4;
  const clouds = new THREE.Group();
  clouds.name='InstancedHorizonClouds';
  const upperClouds = new THREE.InstancedMesh(cloudGeometry,upperMat,MAX_CLUSTERS*LOBES);
  const lowerClouds = new THREE.InstancedMesh(cloudGeometry,lowerMat,MAX_CLUSTERS*LOBES);
  upperClouds.frustumCulled=false; lowerClouds.frustumCulled=false;
  upperClouds.renderOrder=-8; lowerClouds.renderOrder=-9;
  upperClouds.name='UpperClouds_256InstancesMax';
  lowerClouds.name='CloudShadows_256InstancesMax';
  const dummy = new THREE.Object3D();
  for(let cluster=0;cluster<MAX_CLUSTERS;cluster++){
    const a = cluster*2.3999632297 + (random()-0.5)*0.55;
    const rad = 345 + Math.sqrt(random())*1040;
    const cx=Math.sin(a)*rad, cz=Math.cos(a)*rad;
    const cy = 11 + random()*66;
    const base=30 + random()*34;
    for(let l=0;l<LOBES;l++){
      const index=cluster*LOBES+l;
      const side=(l-1.5)*base*0.78;
      const rx=(random()-0.5)*base*0.55;
      const rz=(random()-0.5)*base*1.2;
      const sx=base*(1.06+random()*1.1);
      const sy=base*(0.27+random()*0.22);
      const sz=base*(0.62+random()*0.75);
      dummy.position.set(cx+side+rx,cy+(random()-0.5)*base*0.12,cz+rz);
      dummy.rotation.set(0,random()*TAU,0);
      dummy.scale.set(sx,sy,sz);
      dummy.updateMatrix();upperClouds.setMatrixAt(index,dummy.matrix);
      dummy.position.y-=sy*0.26;
      dummy.scale.set(sx*0.97,sy*0.76,sz*0.98);
      dummy.updateMatrix();lowerClouds.setMatrixAt(index,dummy.matrix);
    }
  }
  upperClouds.instanceMatrix.needsUpdate=true;
  lowerClouds.instanceMatrix.needsUpdate=true;
  clouds.add(lowerClouds,upperClouds);
  root.add(clouds);

  // GPU-animated precipitation. All point positions are static on CPU.
  const RAIN_MAX = 1120;
  const points = new Float32Array(RAIN_MAX*3);
  for(let i=0;i<RAIN_MAX;i++){
    points[3*i]=(random()-0.5)*112;
    points[3*i+1]=random()*100;
    points[3*i+2]=(random()-0.5)*112;
  }
  const rainGeometry=rememberGeom(new THREE.BufferGeometry());
  rainGeometry.setAttribute('position',new THREE.BufferAttribute(points,3));
  const rainUniforms={uTime:{value:0},uWind:{value:0},uSize:{value:8.5},uOpacity:{value:0}};
  const rainMaterial=rememberMat(new THREE.ShaderMaterial({
    name:'AF18_Precipitation',uniforms:rainUniforms,
    vertexShader:RAIN_VERTEX,fragmentShader:RAIN_FRAGMENT,
    transparent:true,depthWrite:false,depthTest:true,fog:false,toneMapped:false
  }));
  const rain = new THREE.Points(rainGeometry,rainMaterial);
  rain.name='GPU_Rain';
  rain.frustumCulled=false;
  rain.renderOrder=150;
  root.add(rain);

  const palette = PALETTE.map(row => ({
    hour:row[0],
    colors:row.slice(1).map(color => new THREE.Color(color))
  }));
  const blended = Array.from({length:6},()=>new THREE.Color());
  const stormTint = [new THREE.Color('#102038'),new THREE.Color('#29374c'),
                     new THREE.Color('#60707d'),new THREE.Color('#384456')];
  const localCamera = new THREE.Vector3();
  const worldCamera = new THREE.Vector3();
  const sunDirection = skyUniforms.uSunDirection.value;
  let daylight = 1;
  function evaluateAtmosphere(){
    let idx=0;
    while(idx<palette.length-2 && timeOfDay>palette[idx+1].hour)idx++;
    const a=palette[idx],b=palette[idx+1];
    const t=smooth(a.hour,b.hour,timeOfDay);
    for(let k=0;k<6;k++)blended[k].copy(a.colors[k]).lerp(b.colors[k],t);
    for(let k=0;k<4;k++)blended[k].lerp(stormTint[k],weatherCurrent.dark*(k===2?0.57:0.72));
    const angle = (timeOfDay-6)*Math.PI/12;
    sunDirection.set(Math.cos(angle)*0.70,Math.sin(angle),-0.72).normalize();
    daylight = smooth(-0.16,0.27,sunDirection.y);
    const skyU=skyUniforms;
    skyU.uZenith.value.copy(blended[0]);
    skyU.uUpper.value.copy(blended[1]);
    skyU.uHorizon.value.copy(blended[2]);
    skyU.uGround.value.copy(blended[3]);
    skyU.uCloudColor.value.copy(blended[4]);
    skyU.uSunColor.value.copy(blended[5]);
    skyU.uDaylight.value=daylight;
    skyU.uClouds.value=weatherCurrent.clouds;
    skyU.uHaze.value=weatherCurrent.haze;
    skyU.uDarkness.value=weatherCurrent.dark;
    skyU.uAurora.value=weatherCurrent.aurora;
    skyU.uFlash.value=flash;
    const wind = customWind??weatherCurrent.wind;
    skyU.uWind.value=wind;
    skyU.uTime.value=elapsed;
    seaUniforms.uCloudColor.value.copy(blended[4]);
    seaUniforms.uShadowColor.value.copy(blended[1]).lerp(blended[3],0.44);
    seaUniforms.uTime.value=elapsed;
    seaUniforms.uCoverage.value=weatherCurrent.clouds;
    seaUniforms.uWind.value=wind;
    seaUniforms.uHaze.value=weatherCurrent.haze;
    upperMat.color.copy(blended[4]).lerp(blended[1],weatherCurrent.dark*0.35);
    lowerMat.color.copy(blended[1]).lerp(blended[3],0.45);
    upperMat.opacity=0.46+weatherCurrent.clouds*0.36;
    lowerMat.opacity=0.23+weatherCurrent.clouds*0.20;
    const maxClouds=(quality==='high'?MAX_CLUSTERS:23)*LOBES;
    const count=Math.max(LOBES*8,Math.floor(maxClouds*(0.46+weatherCurrent.clouds*0.54)/LOBES)*LOBES);
    upperClouds.count=count;lowerClouds.count=count;
    rain.visible=weatherCurrent.rain>0.025;
    rainUniforms.uOpacity.value=weatherCurrent.rain;
    rainUniforms.uTime.value=elapsed;
    rainUniforms.uWind.value=wind;
    rainUniforms.uSize.value=quality==='high'?11.2:8.0;
  }

  function setQuality(mode){
    if(disposed) return;
    quality = mode === 'high'?'high':'lite';
    sky.material=skyMats[quality];
    sea.material=seaMats[quality];
    rainGeometry.setDrawRange(0,quality==='high'?RAIN_MAX:380);
    evaluateAtmosphere();
  }
  function setWeather(name,seconds=2.0){
    if(disposed) return false;
    if(!Object.hasOwn(WEATHER,name))return false;
    weatherName=name;
    weatherTarget={...WEATHER[name]};
    transitionSeconds=Math.max(0,Number(seconds)||0);
    if(transitionSeconds===0)Object.assign(weatherCurrent,weatherTarget);
    evaluateAtmosphere();
    return true;
  }
  function setTimeOfDay(hour){
    if(disposed || !Number.isFinite(Number(hour)))return;
    timeOfDay=wrapHour(Number(hour));
    evaluateAtmosphere();
  }
  function setAutoCycle(enabled,daySeconds){
    autoCycle=!!enabled;
    if(Number.isFinite(daySeconds)&&daySeconds>=30)dayLengthSeconds=daySeconds;
  }
  function setCloudSeaLevel(height){
    if(!Number.isFinite(height))return;
    seaLevel=height;
    sea.position.y=seaLevel;
    clouds.position.y=seaLevel;
  }
  function setCloudSeaEnabled(enabled){
    cloudSeaEnabled=!!enabled;
    sea.visible=cloudSeaEnabled;
    clouds.visible=cloudSeaEnabled;
  }
  function setWindSpeed(speed){
    customWind=speed==null?null:clamp(Number(speed)||0,0,8);
    evaluateAtmosphere();
  }
  function update(dt=0,context={}){
    if(disposed)return;
    if(!Number.isFinite(dt))dt=0;
    dt=clamp(dt,0,0.10);
    elapsed+=dt;
    if(context && Number.isFinite(context.timeOfDay))timeOfDay=wrapHour(context.timeOfDay);
    else if(autoCycle)timeOfDay=wrapHour(timeOfDay+dt*24/dayLengthSeconds);
    if(context && typeof context.weather === 'string' && context.weather!==weatherName){
      setWeather(context.weather,2);
    }
    if(context && Number.isFinite(context.windSpeed))customWind=clamp(context.windSpeed,0,8);
    if(transitionSeconds>0){
      const a=1-Math.exp(-dt*3.0/transitionSeconds);
      let maxDelta=0;
      for(const k in weatherCurrent){
        weatherCurrent[k]+=(weatherTarget[k]-weatherCurrent[k])*a;
        maxDelta=Math.max(maxDelta,Math.abs(weatherTarget[k]-weatherCurrent[k]));
      }
      if(maxDelta<0.001){Object.assign(weatherCurrent,weatherTarget);transitionSeconds=0;}
    }
    if(weatherCurrent.rain>0.90 && weatherCurrent.dark>0.43){
      lightningTimer-=dt;
      if(lightningTimer<=0){
        flash=0.6+random()*0.33;
        lightningTimer=3.8+random()*9.0;
      }
    }else lightningTimer=Math.max(lightningTimer,1.5);
    flash*=Math.exp(-dt*10.0);
    const camera=context?.camera??options.camera;
    if(camera && camera.isCamera){
      camera.getWorldPosition(worldCamera);
      root.updateWorldMatrix(true,false);
      localCamera.copy(worldCamera);
      root.worldToLocal(localCamera);
      sky.position.copy(localCamera);
      sea.position.x=localCamera.x;
      sea.position.z=localCamera.z;
      clouds.position.x=localCamera.x;
      clouds.position.z=localCamera.z;
      rain.position.copy(localCamera);
    }
    const wind=customWind??weatherCurrent.wind;
    clouds.rotation.y=Math.sin(elapsed*0.0014*wind)*0.026;
    evaluateAtmosphere();
  }
  function getState(){
    return {
      timeOfDay,weather:weatherName,quality,autoCycle,
      cloudSeaLevel:seaLevel,cloudSeaEnabled,
      windSpeed:customWind??weatherCurrent.wind,
      rainIntensity:weatherCurrent.rain,cloudiness:weatherCurrent.clouds,
      daylight,lightning:flash
    };
  }
  function getLightingHint(){
    return {
      sunDirection:sunDirection.clone(),
      sunColor:blended[5].clone(),
      ambientColor:blended[1].clone(),
      daylight,
      suggestedSunIntensity:0.15+daylight*1.35*(1-weatherCurrent.dark*0.55)
    };
  }
  function dispose(){
    if(disposed)return;
    disposed=true;
    if(root.parent)root.parent.remove(root);
    if(typeof upperClouds.dispose === 'function') upperClouds.dispose();
    if(typeof lowerClouds.dispose === 'function') lowerClouds.dispose();
    for(const geometry of ownedGeometry)geometry.dispose();
    for(const material of ownedMaterials)material.dispose();
    root.clear();
  }
  setCloudSeaLevel(seaLevel);
  setCloudSeaEnabled(cloudSeaEnabled);
  setQuality(quality);
  update(0,{camera:options.camera});
  return {root,update,setQuality,dispose,setWeather,setTimeOfDay,
    setAutoCycle,setCloudSeaLevel,setCloudSeaEnabled,setWindSpeed,
    getState,getLightingHint};
}
