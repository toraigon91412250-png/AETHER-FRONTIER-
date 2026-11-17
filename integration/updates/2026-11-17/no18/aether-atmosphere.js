/**
 * AETHER FRONTIER / No.18 ETHERWEAVE ATMOSPHERE v1.1
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
    // Two-scale aerial perspective: near-horizon scattering and distant veiling.
    float horizonMist = exp(-pow(y / (0.105 + uHaze*0.13),2.0));
    float distanceVeil = exp(-pow((y+0.026)/0.037,2.0));
    sky = mix(sky, uHorizon + vec3(0.045,0.045,0.045),horizonMist*(0.16 + uHaze*0.38));
    sky = mix(sky, uHorizon, distanceVeil*(0.12 + uHaze*0.22));

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
  precision highp float;
  varying vec2 vPos;
  uniform vec3 uCloudColor;
  uniform vec3 uShadowColor;
  uniform vec2 uWorldOffset;
  uniform float uSeaRadius;
  uniform float uTime;
  uniform float uCoverage;
  uniform float uWind;
  uniform float uHaze;
  float hash2(vec2 p){
    vec3 q=fract(vec3(p.xyx)*0.1031);
    q+=dot(q,q.yzx+33.33);
    return fract((q.x+q.y)*q.z);
  }
  float n2(vec2 p){
    vec2 i=floor(p),f=fract(p);
    f=f*f*(3.0-2.0*f);
    return mix(mix(hash2(i),hash2(i+vec2(1.0,0.0)),f.x),
               mix(hash2(i+vec2(0.0,1.0)),hash2(i+vec2(1.0,1.0)),f.x),f.y);
  }
  void main(){
    // vPos follows the observer, but the noise pattern stays in world space.
    vec2 worldXZ = vec2(vPos.x,-vPos.y) + uWorldOffset;
    vec2 flow = vec2(uTime*uWind*1.8,-uTime*uWind*0.65);
    vec2 p=(worldXZ + flow)*0.0067;
    float large=n2(p*0.55+vec2(2.4,7.1));
    float middle=n2(p*2.0);
#ifdef HIGH_QUALITY
    float micro=n2(p*5.8+vec2(7.0,-3.0));
    float body=large*0.45+middle*0.40+micro*0.15;
#else
    float body=large*0.55+middle*0.45;
#endif
    float billow=smoothstep(0.30-uCoverage*0.15,0.75-uCoverage*0.10,body);
    vec3 c=mix(uShadowColor,uCloudColor,0.30+billow*0.70);
    float rimLight=smoothstep(0.51,0.69,body);
    c+=vec3(0.08,0.085,0.09)*rimLight;
    c=mix(c,uCloudColor,uHaze*0.18);
    float opacity=(0.25+uCoverage*0.51)*(0.68+billow*0.32);
    float sheetDistance=length(vPos);
    opacity*=1.0-smoothstep(uSeaRadius*0.73,uSeaRadius,sheetDistance);
    gl_FragColor=vec4(c,opacity);
    #include <colorspace_fragment>
  }
`;

// Original faceted cumulus silhouette; fade is evaluated on GPU per vertex.
const CLOUD_VERTEX = `
  attribute float aVariation;
  uniform vec3 uObserver;
  uniform float uFadeStart;
  uniform float uFadeEnd;
  uniform float uWindShift;
  varying float vOpacity;
  varying float vShade;
  varying float vVariation;
  void main(){
    vec4 worldLocal=instanceMatrix*vec4(position,1.0);
    worldLocal.x+=uWindShift;
    float d=length(worldLocal.xz-uObserver.xz);
    vOpacity=1.0-smoothstep(uFadeStart,uFadeEnd,d);
    vShade=clamp(0.61+normal.y*0.30,0.1,1.0);
    vVariation=aVariation;
    gl_Position=projectionMatrix*modelViewMatrix*worldLocal;
  }
`;
const CLOUD_FRAGMENT = `
  precision mediump float;
  uniform vec3 uCloudColor;
  uniform vec3 uCloudShadow;
  uniform float uDensity;
  uniform float uLayerAlpha;
  varying float vOpacity;
  varying float vShade;
  varying float vVariation;
  void main(){
    float shade=clamp(vShade+vVariation*0.17,0.0,1.0);
    vec3 c=mix(uCloudShadow,uCloudColor,shade);
    float alpha=vOpacity*uDensity*uLayerAlpha;
    alpha*=0.85+vVariation*0.15;
    if(alpha < 0.003) discard;
    gl_FragColor=vec4(c,alpha);
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


const PROFILE = Object.freeze({
  lite: Object.freeze({grid:7,lobes:3,rain:320,fadeStart:365,fadeEnd:620,seaRadius:1100,
                       atmosphereHz:24,cloudRefreshSeconds:0.14}),
  high: Object.freeze({grid:11,lobes:3,rain:1120,fadeStart:760,fadeEnd:1150,seaRadius:1550,
                       atmosphereHz:45,cloudRefreshSeconds:0.055})
});

/** ETHERWEAVE ATMOSPHERE 1.1: independent, scene-safe Three.js r160 module. */
export function createAetherModule(THREE, options={}) {
  if (!THREE || !THREE.Group || !THREE.ShaderMaterial || !THREE.InstancedMesh)
    throw new Error('No.18 ETHERWEAVE requires Three.js r160 namespace.');

  const root=new THREE.Group();
  root.name='AF18_EtherweaveAtmosphere';
  const ownedGeometry=[],ownedMaterials=[];
  const rememberGeom=g=>(ownedGeometry.push(g),g);
  const rememberMat=m=>(ownedMaterials.push(m),m);
  const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
  const smooth=(a,b,v)=>{let t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
  const wrapHour=v=>((v%24)+24)%24;
  const finite=n=>typeof n==='number'&&Number.isFinite(n);
  const preset=mode=>mode==='high'?'high':'lite';
  const CELL=260;
  const SKY_RADIUS=Math.max(600,Number(options.skyRadius)||1600);
  let quality=preset(options.quality);
  let timeOfDay=finite(options.timeOfDay)?wrapHour(options.timeOfDay):16.6;
  let weatherName=Object.hasOwn(WEATHER,options.weather)?options.weather:'clear';
  let weatherCurrent={...WEATHER[weatherName]},weatherTarget={...WEATHER[weatherName]};
  let transitionSeconds=0,autoCycle=!!options.autoCycle;
  let dayLengthSeconds=Math.max(30,Number(options.dayLengthSeconds)||240);
  let customWind=finite(options.windSpeed)?clamp(options.windSpeed,0,8):null;
  let seaLevel=finite(options.cloudSeaLevel)?options.cloudSeaLevel:-120;
  let seaEnabled=options.cloudSea!==false;
  let elapsed=0,flash=0,lightningTimer=4;
  let disposed=false,lastGridX=NaN,lastGridZ=NaN;
  let atmosphereAccum=999,gridAccum=999,gridDirty=true;
  let lightEvaluationCount=0,cloudGridBuilds=0;
  let seed=18673;
  function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  // Deterministic world-cell noise independent of visitation order.
  function hash(x,z,salt=0){
    let n=(Math.imul(x,374761393)^Math.imul(z,668265263)^Math.imul(salt+1,1442695041))|0;
    n=Math.imul(n^(n>>>13),1274126177);
    return ((n^(n>>>16))>>>0)/4294967296;
  }
  function uniformsSky(){return {
    uZenith:{value:new THREE.Color()},uUpper:{value:new THREE.Color()},
    uHorizon:{value:new THREE.Color()},uGround:{value:new THREE.Color()},
    uCloudColor:{value:new THREE.Color()},uSunColor:{value:new THREE.Color()},
    uSunDirection:{value:new THREE.Vector3(0,1,-1).normalize()},
    uDaylight:{value:1},uClouds:{value:0.2},uHaze:{value:0.1},
    uDarkness:{value:0},uAurora:{value:0},uFlash:{value:0},
    uTime:{value:0},uWind:{value:0.65}
  };}
  const skyU=uniformsSky();
  const skyMats={};
  for(const level of ['lite','high']){
    skyMats[level]=rememberMat(new THREE.ShaderMaterial({
      name:'AF18_Sky_'+level,uniforms:skyU,
      defines:level==='high'?{HIGH_QUALITY:1}:{},
      vertexShader:SKY_VERTEX,fragmentShader:SKY_FRAGMENT,
      depthTest:false,depthWrite:false,side:THREE.BackSide,
      fog:false,toneMapped:false
    }));
  }
  const sky=new THREE.Mesh(rememberGeom(new THREE.SphereGeometry(SKY_RADIUS,32,20)),skyMats[quality]);
  sky.name='SkyDome_NoDepth_NoSceneMutation';sky.frustumCulled=false;sky.renderOrder=-1000;
  root.add(sky);

  const seaU={uCloudColor:{value:new THREE.Color()},uShadowColor:{value:new THREE.Color()},
    uTime:{value:0},uCoverage:{value:0.3},uWind:{value:1},uHaze:{value:0.1},
    uWorldOffset:{value:new THREE.Vector2()},uSeaRadius:{value:PROFILE[quality].seaRadius}};
  const seaMats={};
  for(const level of ['lite','high'])seaMats[level]=rememberMat(new THREE.ShaderMaterial({
    name:'AF18_CloudOcean_'+level,uniforms:seaU,
    defines:level==='high'?{HIGH_QUALITY:1}:{},
    vertexShader:SEA_VERTEX,fragmentShader:SEA_FRAGMENT,
    transparent:true,depthTest:true,depthWrite:false,side:THREE.DoubleSide,
    fog:false,toneMapped:false
  }));
  const sea=new THREE.Mesh(rememberGeom(new THREE.PlaneGeometry(3300,3300)),seaMats[quality]);
  sea.name='WorldAnchoredCloudOcean';sea.rotation.x=-Math.PI/2;
  sea.position.y=seaLevel;sea.renderOrder=-10;sea.frustumCulled=false;
  sea.visible=seaEnabled;root.add(sea);

  const cloudGeom=rememberGeom(new THREE.IcosahedronGeometry(1,1));
  const MAX_LOBES=PROFILE.high.grid*PROFILE.high.grid*PROFILE.high.lobes;
  // Per-instance variation stored once; matrices regenerated only when crossing a grid cell.
  const cloudVariation=new Float32Array(MAX_LOBES);
  const variationAttr=new THREE.InstancedBufferAttribute(cloudVariation,1);
  cloudGeom.setAttribute('aVariation',variationAttr);
  const cloudU={uObserver:{value:new THREE.Vector3()},uFadeStart:{value:0},
    uFadeEnd:{value:0},uWindShift:{value:0},uCloudColor:{value:new THREE.Color()},
    uCloudShadow:{value:new THREE.Color()},uDensity:{value:0.7},uLayerAlpha:{value:0.5}};
  function makeCloudMat(name,layerAlpha){
    return rememberMat(new THREE.ShaderMaterial({
      name,vertexShader:CLOUD_VERTEX,fragmentShader:CLOUD_FRAGMENT,
      uniforms:{...cloudU,uLayerAlpha:{value:layerAlpha}},
      transparent:true,depthTest:true,depthWrite:false,
      fog:false,toneMapped:false,side:THREE.FrontSide
    }));
  }
  const cloudBottomMat=makeCloudMat('AF18_Cumulus_Underside',0.30);
  const cloudTopMat=makeCloudMat('AF18_Cumulus_Top',0.62);
  const clouds=new THREE.Group();clouds.name='WorldGridCumulus';
  const lowerClouds=new THREE.InstancedMesh(cloudGeom,cloudBottomMat,MAX_LOBES);
  const upperClouds=new THREE.InstancedMesh(cloudGeom,cloudTopMat,MAX_LOBES);
  for(const [mesh,order,name] of [[lowerClouds,-9,'CloudUndersides'],[upperClouds,-8,'UpperClouds']]){
    mesh.name=name;mesh.frustumCulled=false;mesh.renderOrder=order;
    if(THREE.DynamicDrawUsage)mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }
  clouds.add(lowerClouds,upperClouds);root.add(clouds);
  const dummy=new THREE.Object3D();
  function regenerateGrid(cellX,cellZ){
    const grid=PROFILE[quality].grid;
    const lobes=PROFILE[quality].lobes;
    const half=Math.floor(grid/2);
    let ix=0;
    for(let x=-half;x<=half;x++)for(let z=-half;z<=half;z++){
      const cx=x+cellX,cz=z+cellZ;
      const cellXpos=cx*CELL+(hash(cx,cz,0)-.5)*CELL*.48;
      const cellZpos=cz*CELL+(hash(cx,cz,1)-.5)*CELL*.48;
      const cy=seaLevel+31+hash(cx,cz,2)*87;
      const base=29+hash(cx,cz,3)*34;
      for(let l=0;l<lobes;l++){
        const angle=hash(cx,cz,l+4)*Math.PI*2;
        const offset=(l===0?0:base*(l===1?0.8:1.25));
        dummy.position.set(cellXpos+Math.cos(angle)*offset,
          cy+((hash(cx,cz,l+10)-.5)*base*.42),
          cellZpos+Math.sin(angle)*offset);
        dummy.rotation.set(0,hash(cx,cz,l+20)*TAU,0);
        const size=base*(1+hash(cx,cz,l+30)*0.8);
        dummy.scale.set(size*1.7,size*.52,size*1.35);
        dummy.updateMatrix();upperClouds.setMatrixAt(ix,dummy.matrix);
        dummy.position.y-=size*.20;
        dummy.scale.set(size*1.7,size*.37,size*1.35);
        dummy.updateMatrix();lowerClouds.setMatrixAt(ix,dummy.matrix);
        cloudVariation[ix]=hash(cx,cz,l+50)*2-1;
        ix++;
      }
    }
    upperClouds.count=ix;lowerClouds.count=ix;
    cloudGeom.attributes.aVariation.needsUpdate=true;
    upperClouds.instanceMatrix.needsUpdate=true;
    lowerClouds.instanceMatrix.needsUpdate=true;
    lastGridX=cellX;lastGridZ=cellZ;gridDirty=false;gridAccum=0;cloudGridBuilds++;
  }

  const RAIN_MAX=PROFILE.high.rain;
  const points=new Float32Array(RAIN_MAX*3);
  for(let i=0;i<RAIN_MAX;i++){
    points[i*3]=(random()-.5)*112;
    points[i*3+1]=random()*100;
    points[i*3+2]=(random()-.5)*112;
  }
  const rainGeometry=rememberGeom(new THREE.BufferGeometry());
  rainGeometry.setAttribute('position',new THREE.BufferAttribute(points,3));
  const rainU={uTime:{value:0},uWind:{value:0},uSize:{value:8},uOpacity:{value:0}};
  const rainMaterial=rememberMat(new THREE.ShaderMaterial({
    name:'AF18_Precipitation',uniforms:rainU,
    vertexShader:RAIN_VERTEX,fragmentShader:RAIN_FRAGMENT,
    transparent:true,depthWrite:false,depthTest:true,fog:false,toneMapped:false
  }));
  const rain=new THREE.Points(rainGeometry,rainMaterial);
  rain.name='GPU_Rain';rain.frustumCulled=false;rain.renderOrder=150;root.add(rain);

  const palette=PALETTE.map(row=>({hour:row[0],colors:row.slice(1).map(x=>new THREE.Color(x))}));
  const blended=Array.from({length:6},()=>new THREE.Color());
  const stormTint=['#102038','#29374c','#60707d','#384456'].map(x=>new THREE.Color(x));
  const camWorld=new THREE.Vector3(),camLocal=new THREE.Vector3();
  const sunDir=skyU.uSunDirection.value;
  let daylight=1;
  function evaluateAtmosphere(){
    let idx=0;
    while(idx<palette.length-2&&timeOfDay>palette[idx+1].hour)idx++;
    const a=palette[idx],b=palette[idx+1],t=smooth(a.hour,b.hour,timeOfDay);
    for(let k=0;k<6;k++)blended[k].copy(a.colors[k]).lerp(b.colors[k],t);
    for(let k=0;k<4;k++)blended[k].lerp(stormTint[k],weatherCurrent.dark*(k===2?.57:.72));
    const angle=(timeOfDay-6)*Math.PI/12;
    sunDir.set(Math.cos(angle)*.70,Math.sin(angle),-.72).normalize();
    daylight=smooth(-.16,.27,sunDir.y);
    const wind=customWind??weatherCurrent.wind;
    skyU.uZenith.value.copy(blended[0]);
    skyU.uUpper.value.copy(blended[1]);
    skyU.uHorizon.value.copy(blended[2]);
    skyU.uGround.value.copy(blended[3]);
    skyU.uCloudColor.value.copy(blended[4]);
    skyU.uSunColor.value.copy(blended[5]);
    skyU.uDaylight.value=daylight;skyU.uClouds.value=weatherCurrent.clouds;
    skyU.uHaze.value=weatherCurrent.haze;skyU.uDarkness.value=weatherCurrent.dark;
    skyU.uAurora.value=weatherCurrent.aurora;skyU.uFlash.value=flash;
    skyU.uTime.value=elapsed;skyU.uWind.value=wind;
    seaU.uCloudColor.value.copy(blended[4]);
    seaU.uShadowColor.value.copy(blended[1]).lerp(blended[3],.47);
    seaU.uTime.value=elapsed;seaU.uCoverage.value=weatherCurrent.clouds;
    seaU.uWind.value=wind;seaU.uHaze.value=weatherCurrent.haze;
    cloudU.uCloudColor.value.copy(blended[4]);
    cloudU.uCloudShadow.value.copy(blended[1]).lerp(blended[3],.40);
    cloudU.uDensity.value=.29+weatherCurrent.clouds*.67;
    cloudU.uFadeStart.value=PROFILE[quality].fadeStart;
    cloudU.uFadeEnd.value=PROFILE[quality].fadeEnd;
    cloudU.uWindShift.value=Math.sin(elapsed*.006*wind)*31;
    rain.visible=weatherCurrent.rain>.025;
    rainU.uTime.value=elapsed;rainU.uWind.value=wind;
    rainU.uOpacity.value=weatherCurrent.rain;
    rainU.uSize.value=quality==='high'?11.2:8.0;
    lightEvaluationCount++;
  }
  function setQuality(mode){
    if(disposed)return;
    const next=preset(mode);
    if(next!==quality){quality=next;gridDirty=true;atmosphereAccum=999;}
    sky.material=skyMats[quality];sea.material=seaMats[quality];
    seaU.uSeaRadius.value=PROFILE[quality].seaRadius;
    const ratio=PROFILE[quality].seaRadius/1500;
    sea.scale.set(ratio,ratio,1);
    rainGeometry.setDrawRange(0,PROFILE[quality].rain);
    // Rebuild only on the next update, after the observer location is known.
    evaluateAtmosphere();
  }
  function setWeather(name,seconds=2){
    if(disposed||!Object.hasOwn(WEATHER,name))return false;
    weatherName=name;weatherTarget={...WEATHER[name]};
    transitionSeconds=finite(seconds)?Math.max(0,seconds):2;
    if(!transitionSeconds)Object.assign(weatherCurrent,weatherTarget);
    atmosphereAccum=999;
    evaluateAtmosphere();
    return true;
  }
  function setTimeOfDay(hour){if(disposed||!finite(Number(hour)))return;timeOfDay=wrapHour(Number(hour));evaluateAtmosphere();}
  function setAutoCycle(enabled,seconds){if(disposed)return;autoCycle=!!enabled;if(finite(seconds)&&seconds>=30)dayLengthSeconds=seconds;}
  function setCloudSeaLevel(height){if(disposed||!finite(height))return;seaLevel=height;sea.position.y=height;gridDirty=true;}
  function setCloudSeaEnabled(enabled){if(disposed)return;seaEnabled=!!enabled;sea.visible=seaEnabled;clouds.visible=seaEnabled;}
  function setWindSpeed(speed){if(disposed)return;customWind=speed==null?null:clamp(Number(speed)||0,0,8);evaluateAtmosphere();}
  function update(dt=0,context={}){
    if(disposed)return;
    dt=finite(dt)?clamp(dt,0,0.10):0;
    elapsed+=dt;
    atmosphereAccum+=dt;gridAccum+=dt;
    if(context&&finite(context.timeOfDay))timeOfDay=wrapHour(context.timeOfDay);
    else if(autoCycle)timeOfDay=wrapHour(timeOfDay+dt*24/dayLengthSeconds);
    if(context&&typeof context.weather==='string'&&context.weather!==weatherName)setWeather(context.weather,2);
    if(context&&finite(context.windSpeed))customWind=clamp(context.windSpeed,0,8);
    if(transitionSeconds>0){
      const a=1-Math.exp(-dt*3/transitionSeconds);
      let maxDelta=0;
      for(const k in weatherCurrent){
        weatherCurrent[k]+=(weatherTarget[k]-weatherCurrent[k])*a;
        maxDelta=Math.max(maxDelta,Math.abs(weatherTarget[k]-weatherCurrent[k]));
      }
      if(maxDelta<.001){Object.assign(weatherCurrent,weatherTarget);transitionSeconds=0;}
    }
    if(weatherCurrent.rain>.90 && weatherCurrent.dark>.43){
      lightningTimer-=dt;
      if(lightningTimer<=0){flash=.6+random()*.33;lightningTimer=3.8+random()*9;}
    }else lightningTimer=Math.max(lightningTimer,1.5);
    flash*=Math.exp(-dt*10);
    const camera=context?.camera??options.camera;
    if(camera?.isCamera){
      camera.updateWorldMatrix(true,false);
      camera.getWorldPosition(camWorld);
      root.updateWorldMatrix(true,false);
      camLocal.copy(camWorld);root.worldToLocal(camLocal);
      sky.position.copy(camLocal);
      sea.position.x=camLocal.x;sea.position.z=camLocal.z;
      seaU.uWorldOffset.value.set(camLocal.x,camLocal.z);
      rain.position.copy(camLocal);
      cloudU.uObserver.value.copy(camLocal);
      const cx=Math.floor(camLocal.x/CELL),cz=Math.floor(camLocal.z/CELL);
      if(gridDirty || ((!Number.isFinite(lastGridX)||cx!==lastGridX||cz!==lastGridZ)
        &&gridAccum>=PROFILE[quality].cloudRefreshSeconds))regenerateGrid(cx,cz);
    }
    if(atmosphereAccum>=1/PROFILE[quality].atmosphereHz){
      evaluateAtmosphere();atmosphereAccum=0;
    }
  }
  function getState(){return {
    timeOfDay,weather:weatherName,quality,autoCycle,cloudSeaLevel:seaLevel,cloudSeaEnabled:seaEnabled,
    windSpeed:customWind??weatherCurrent.wind,rainIntensity:weatherCurrent.rain,
    cloudiness:weatherCurrent.clouds,daylight,lightning:flash
  };}
  function getLightingHint(){return {
    sunDirection:sunDir.clone(),sunColor:blended[5].clone(),ambientColor:blended[1].clone(),
    daylight,suggestedSunIntensity:.15+daylight*1.35*(1-weatherCurrent.dark*.55),
    suggestedFogColor:blended[2].clone().lerp(blended[1],weatherCurrent.haze*.32),
    suggestedFogDensity:.00065+weatherCurrent.haze*.0035+weatherCurrent.rain*.00045,
    horizonColor:blended[2].clone(),stormFlashIntensity:flash
  };}
  function getPerformanceBudget(){return {
    quality,activeRainParticles:PROFILE[quality].rain,
    cloudInstancesPerLayer:upperClouds.count,
    cloudInstancesTotal:upperClouds.count+lowerClouds.count,
    atmosphereHz:PROFILE[quality].atmosphereHz,
    gridRefreshSeconds:PROFILE[quality].cloudRefreshSeconds,
    cloudFadeEndMeters:PROFILE[quality].fadeEnd,
    cloudSeaRadiusMeters:PROFILE[quality].seaRadius,
    atmosphereEvaluations:lightEvaluationCount,cloudGridRebuilds:cloudGridBuilds
  };}
  function dispose(){
    if(disposed)return;
    disposed=true;
    if(root.parent)root.parent.remove(root);
    for(const g of ownedGeometry)g.dispose();
    for(const m of ownedMaterials)m.dispose();
    root.clear();
  }
  setQuality(quality);
  setCloudSeaEnabled(seaEnabled);
  update(0,{camera:options.camera});
  return {root,update,setQuality,dispose,setWeather,setTimeOfDay,setAutoCycle,
    setCloudSeaLevel,setCloudSeaEnabled,setWindSpeed,getState,getLightingHint,getPerformanceBudget};
}
