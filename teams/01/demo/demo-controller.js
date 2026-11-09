// AETHER FRONTIER / Team 01 | Standalone demo. Expects THREE and createAetherModule globals in this module scope.
function startAetherDemo(THREE, createAetherModule) {
  const mobile=matchMedia('(pointer: coarse)').matches;
  const isiPhone=/iPhone|iPod/i.test(navigator.userAgent);
  const preferred=mobile ? 'lite' : 'high';
  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0x071c2a);
  scene.fog=new THREE.FogExp2(0x0c293b,.0021);
  const camera=new THREE.PerspectiveCamera(mobile?76:77,innerWidth/innerHeight,.07,950);
  camera.rotation.order='YXZ';
  const renderer=new THREE.WebGLRenderer({antialias:!mobile,alpha:false,powerPreference:'high-performance',stencil:false});
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.65;
  renderer.setPixelRatio(1);
  renderer.setSize(innerWidth,innerHeight);
  renderer.domElement.id='view';
  renderer.domElement.style.touchAction='none';
  document.body.prepend(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xa9f7ff,0x1c3047,2.6));
  const sun=new THREE.DirectionalLight(0xffd9a4,2.65);
  sun.position.set(-90,220,-160);scene.add(sun);
  const cool=new THREE.DirectionalLight(0x8ee8ff,.85);cool.position.set(130,90,100);scene.add(cool);
  // Four gentle local sources. Switch off on Lite to reduce mobile lighting work.
  const localLights=[];
  [[0,70,0x46ebff,25],[0,157,0x67d5ff,19],[-55,7,0x48ceff,16],[55,7,0xffddad,16]].forEach(([x,y,col,power],i)=>{
    const light=new THREE.PointLight(col,power,i<2?62:34,2);
    light.position.set(x,y,i<2?0:-35);scene.add(light);localLights.push(light);
  });
  // A shader-built dusk dome: no downloaded textures, no skybox files.
  const skyGeo=new THREE.SphereGeometry(740,32,16);
  const skyMat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{time:{value:0}},vertexShader:`varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`precision mediump float;varying vec3 vDir;uniform float time;void main(){vec3 d=normalize(vDir);float h=clamp(d.y*.5+.5,0.,1.);vec3 zen=vec3(.008,.035,.075);vec3 mid=vec3(.04,.14,.19);vec3 warm=vec3(.22,.19,.21);vec3 c=mix(warm,mid,smoothstep(.0,.44,h));c=mix(c,zen,smoothstep(.35,1.,h));float sun=pow(max(dot(d,normalize(vec3(-.67,.30,-.7))),0.),80.);c+=vec3(.30,.20,.11)*sun;c+=vec3(.025,.07,.11)*pow(1.-abs(d.y),9.);gl_FragColor=vec4(c,1.);}`});
  const sky=new THREE.Mesh(skyGeo,skyMat);sky.name='demo_only_atmosphere';scene.add(sky);
  // Decorative cloud ocean beneath floating central metropolis.
  const cloudLow=new THREE.Mesh(new THREE.PlaneGeometry(1800,1800),new THREE.MeshBasicMaterial({color:0x123d4e,side:THREE.DoubleSide,depthWrite:false}));
  cloudLow.rotation.x=-Math.PI/2;cloudLow.position.y=-55;scene.add(cloudLow);
  const cloudHighMat=new THREE.ShaderMaterial({side:THREE.DoubleSide,depthWrite:false,transparent:true,uniforms:{time:{value:0}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`precision mediump float;varying vec2 vUv;uniform float time;void main(){vec2 p=vUv*35.;float s=sin(p.x*.61+time*.07)*sin(p.y*.49-time*.055);float t=sin(p.x*.24+p.y*.14+time*.025);float v=s*.5+t*.32;float a=smoothstep(-.26,.57,v)*.46;gl_FragColor=vec4(.33,.63,.68,a);}`});
  const cloudHigh=new THREE.Mesh(new THREE.PlaneGeometry(1700,1700),cloudHighMat);
  cloudHigh.rotation.x=-Math.PI/2;cloudHigh.position.y=-53;scene.add(cloudHigh);
  const module=createAetherModule(THREE,{quality:preferred,seed:1001});
  scene.add(module.root);
  const player={x:0,z:102,y:module.getFloorHeight(0,102),vy:0,yaw:0,pitch:-.08,grounded:true};
  let quality=preferred,thirdPerson=false,frame=0,avgFps=60,last=performance.now(),toastTimeout=0,helpUntil=performance.now()+16000;
  const keys=new Set(),input={joyX:0,joyY:0};
  const $=id=>document.getElementById(id);
  const qButton=$('quality'),camButton=$('mode'),prompt=$('prompt'),hint=$('hint'),stats=$('stats'),toast=$('toast'),map=$('map');
  const mapCtx=map.getContext('2d');
  const avatar=new THREE.Group();scene.add(avatar);
  const anthracite=new THREE.MeshStandardMaterial({color:0x1c3546,metalness:.58,roughness:.4});
  const copper=new THREE.MeshStandardMaterial({color:0xc79c6c,metalness:.6,roughness:.35});
  const lightSuit=new THREE.MeshBasicMaterial({color:0x83fff2,toneMapped:false});
  const avatarBox=(w,h,d,material,x,y,z)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);o.position.set(x,y,z);avatar.add(o);return o;};
  avatarBox(.83,1.05,.43,anthracite,0,1.07,0);
  avatarBox(.66,.51,.64,copper,0,1.95,-.05);
  avatarBox(.5,.20,.68,lightSuit,0,1.93,-.4);
  const legL=avatarBox(.27,.73,.3,anthracite,-.27,.3,0);
  const legR=avatarBox(.27,.73,.3,anthracite,.27,.3,0);
  const armL=avatarBox(.24,.75,.32,anthracite,-.61,1.02,0);
  const armR=avatarBox(.24,.75,.32,anthracite,.61,1.02,0);
  const cape=new THREE.Mesh(new THREE.PlaneGeometry(1.35,1.4),new THREE.MeshBasicMaterial({color:0x326976,side:THREE.DoubleSide,transparent:true,opacity:.7}));
  cape.position.set(0,1.2,.36);cape.rotation.x=.2;avatar.add(cape);
  function setQuality(mode){
    quality=module.setQuality(mode);
    localLights.forEach(l=>l.visible=quality==='high'&&!mobile);
    cloudHigh.visible=quality==='high';
    renderer.setPixelRatio(quality==='high'?(mobile?Math.min(devicePixelRatio,1.4):Math.min(devicePixelRatio,1.85)):1);
    renderer.setSize(innerWidth,innerHeight,false);
    qButton.textContent=quality==='high'?'◆ 高品質':'◇ 軽量';
    qButton.classList.toggle('selected',quality==='high');
  }
  function toggleView(){thirdPerson=!thirdPerson;camButton.textContent=thirdPerson?'TPS':'FPS';camButton.classList.toggle('selected',thirdPerson);}
  function notify(message){toast.textContent=message;toast.style.opacity='1';toastTimeout=performance.now()+4600;}
  function doInteract(){
    const near=module.getNearbyInteraction(player,5.6);
    if(!near)return;
    const result=module.interact(near.id);
    if(result.warpTo){
      player.x=result.warpTo.x;player.y=result.warpTo.y;player.z=result.warpTo.z;player.vy=0;player.grounded=true;
      player.yaw=near.id==='lift-up'?PI*.5:-PI*.5;player.pitch=-.07;
    }
    if(result.message)notify(result.message);
    updatePrompt();
  }
  const PI=Math.PI;
  function updatePrompt(){
    const near=module.getNearbyInteraction(player,5.6);
    if(!near){prompt.style.display='none';return;}
    prompt.style.display='block';
    prompt.innerHTML=`<span class="key">${mobile?'操作':'E'}</span>${near.label}`;
  }
  function jump(){if(player.grounded){player.vy=8.6;player.grounded=false;}}
  qButton.addEventListener('click',()=>setQuality(quality==='high'?'lite':'high'));
  camButton.addEventListener('click',toggleView);
  $('help').addEventListener('click',()=>{$('modal').classList.add('visible');document.exitPointerLock?.();});
  $('close').addEventListener('click',()=>$('modal').classList.remove('visible'));
  $('modal').addEventListener('click',e=>{if(e.target===$('modal'))$('modal').classList.remove('visible');});
  prompt.addEventListener('click',doInteract);
  document.addEventListener('keydown',e=>{
    if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
    keys.add(e.code);
    if(e.repeat)return;
    if(e.code==='Space')jump();
    if(e.code==='KeyE'||e.code==='Enter')doInteract();
    if(e.code==='KeyV'||e.code==='KeyQ')toggleView();
    if(e.code==='KeyH')$('modal').classList.toggle('visible');
    if(e.code==='Digit1')setQuality('lite');
    if(e.code==='Digit2')setQuality('high');
  });
  document.addEventListener('keyup',e=>keys.delete(e.code));
  window.addEventListener('blur',()=>{keys.clear();input.joyX=0;input.joyY=0;});
  let dragPointer=null,dragX=0,dragY=0;
  renderer.domElement.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'&&e.button===0){renderer.domElement.requestPointerLock?.();return;}
    if(e.pointerType==='touch'&&dragPointer===null){dragPointer=e.pointerId;dragX=e.clientX;dragY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId);}
  });
  document.addEventListener('pointerlockchange',()=>{
    if(document.pointerLockElement===renderer.domElement)hint.textContent='WASD 移動 ／ マウス 視点 ／ Shift ダッシュ ／ E 調べる ／ V 視点切替 ／ Space ジャンプ';
  });
  function look(dx,dy){player.yaw-=dx*(mobile?.0035:.00225);player.pitch=Math.max(-1.25,Math.min(1.32,player.pitch-dy*(mobile?.0033:.00195)));}
  document.addEventListener('mousemove',e=>{if(document.pointerLockElement===renderer.domElement)look(e.movementX,e.movementY);});
  renderer.domElement.addEventListener('pointermove',e=>{
    if(e.pointerId!==dragPointer)return;
    look(e.clientX-dragX,e.clientY-dragY);dragX=e.clientX;dragY=e.clientY;
  });
  const pointerEnd=e=>{if(e.pointerId===dragPointer)dragPointer=null;};
  renderer.domElement.addEventListener('pointerup',pointerEnd);renderer.domElement.addEventListener('pointercancel',pointerEnd);
  const stick=$('stickPad'),thumb=$('stickThumb');let joyPointer=null;
  function moveStick(e){
    const rect=stick.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
    const dx=e.clientX-cx,dy=e.clientY-cy,len=Math.max(1,Math.hypot(dx,dy)),r=Math.min(40,len);
    input.joyX=dx/Math.max(40,len);input.joyY=-dy/Math.max(40,len);
    thumb.style.transform=`translate(${dx/len*r}px,${dy/len*r}px)`;
  }
  stick.addEventListener('pointerdown',e=>{joyPointer=e.pointerId;stick.setPointerCapture(e.pointerId);moveStick(e);e.preventDefault();});
  stick.addEventListener('pointermove',e=>{if(e.pointerId===joyPointer)moveStick(e);});
  function stopStick(e){if(e.pointerId!==joyPointer)return;joyPointer=null;input.joyX=input.joyY=0;thumb.style.transform='translate(0px,0px)';}
  stick.addEventListener('pointerup',stopStick);stick.addEventListener('pointercancel',stopStick);
  $('jump').addEventListener('pointerdown',e=>{e.preventDefault();jump();});
  $('act').addEventListener('pointerdown',e=>{e.preventDefault();doInteract();});
  $('touchView').addEventListener('pointerdown',e=>{e.preventDefault();toggleView();});
  function drawMap(){
    if(!mapCtx)return;
    const TAU=Math.PI*2,s=154,scale=.49,px=s*.5,pz=s*.5;
    mapCtx.clearRect(0,0,s,s);
    mapCtx.strokeStyle='rgba(117,200,215,.37)';mapCtx.lineWidth=1;
    for(const r of [22,68,132]){mapCtx.beginPath();mapCtx.arc(px,pz,r*scale,0,TAU);mapCtx.stroke();}
    mapCtx.strokeStyle='rgba(185,216,227,.25)';
    mapCtx.beginPath();mapCtx.moveTo(px,10);mapCtx.lineTo(px,144);mapCtx.moveTo(10,pz);mapCtx.lineTo(144,pz);mapCtx.stroke();
    mapCtx.fillStyle='#e0c282';mapCtx.beginPath();mapCtx.arc(px,pz,4.6,0,TAU);mapCtx.fill();
    const state=module.getState();
    [[0,81],[55,-35],[-55,-35]].forEach(([x,z],i)=>{
      mapCtx.fillStyle=i<state.activated?'#f4d49c':'#67c5cc';
      mapCtx.beginPath();mapCtx.arc(px+x*scale,pz+z*scale,3,0,TAU);mapCtx.fill();
    });
    const x=px+player.x*scale,y=pz+player.z*scale;
    mapCtx.save();mapCtx.translate(x,y);mapCtx.rotate(player.yaw);mapCtx.fillStyle='#ffffff';
    mapCtx.beginPath();mapCtx.moveTo(0,-6);mapCtx.lineTo(-3.5,5);mapCtx.lineTo(3.5,5);mapCtx.closePath();mapCtx.fill();mapCtx.restore();
  }
  function animate(now){
    requestAnimationFrame(animate);
    const dt=Math.min((now-last)*.001,.055)||.016;last=now;frame++;
    let forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)+input.joyY;
    let strafe=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+input.joyX;
    const norm=Math.max(1,Math.hypot(forward,strafe));forward/=norm;strafe/=norm;
    const walking=Math.hypot(forward,strafe)>.02;
    const sprint=keys.has('ShiftLeft')||keys.has('ShiftRight');
    const speed=sprint?20:12.2;
    const sy=Math.sin(player.yaw),cy=Math.cos(player.yaw);
    const dx=(sy*forward+cy*strafe)*dt*speed;
    const dz=(-cy*forward+sy*strafe)*dt*speed;
    let nx=player.x+dx,nz=player.z+dz;
    const resolved=module.resolveHorizontal(nx,nz,player.x,player.z,player.y);
    player.x=resolved.x;player.z=resolved.z;
    const floor=module.getFloorHeight(player.x,player.z,player.y);
    player.vy-=19*dt;player.y+=player.vy*dt;
    if(player.y<=floor){player.y=floor;player.vy=0;player.grounded=true;}else player.grounded=false;
    module.update(dt,{playerPosition:player});
    const ey=player.y+1.66;
    if(thirdPerson){
      const cx=player.x-Math.sin(player.yaw)*5.9,cz=player.z+Math.cos(player.yaw)*5.9;
      camera.position.set(cx,player.y+3.4+Math.sin(-player.pitch)*1.1,cz);
      camera.lookAt(player.x+Math.sin(player.yaw)*6.5,player.y+2.4+Math.tan(player.pitch)*6.5,player.z-Math.cos(player.yaw)*6.5);
    }else{
      camera.position.set(player.x,ey,player.z);
      camera.rotation.set(player.pitch,player.yaw,0,'YXZ');
    }
    avatar.visible=thirdPerson;avatar.position.set(player.x,player.y,player.z);avatar.rotation.y=player.yaw;
    const t=now*.01,walk=walking?Math.sin(t*1.6)*.32:0;
    legL.rotation.x=walk;legR.rotation.x=-walk;armL.rotation.x=-walk*.6;armR.rotation.x=walk*.6;
    cape.rotation.x=.18+(walking?.06*Math.sin(t):0);
    sky.position.copy(camera.position);skyMat.uniforms.time.value=now*.001;
    cloudHighMat.uniforms.time.value=now*.001;
    renderer.render(scene,camera);
    if(frame%16===0){
      avgFps=avgFps*.6+(1/Math.max(.001,dt))*.4;
      const state=module.getState();
      stats.innerHTML=`FPS <span class="strong">${Math.round(avgFps)}</span> · Calls <span class="strong">${renderer.info.render.calls}</span><br>高度 <span class="strong">${Math.round(player.y)}m</span> · 共鳴 <span class="strong">${state.activated}/3</span><br><span class="strong">${state.awakened?'塔冠覚醒':'塔冠：休眠'}</span>`;
      updatePrompt();drawMap();
      if(now>toastTimeout)toast.style.opacity='0';
      if(now>helpUntil&&prompt.style.display==='block')hint.style.opacity='0';
    }
  }
  function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();setQuality(quality);}
  window.addEventListener('resize',resize);
  setQuality(preferred);drawMap();updatePrompt();
  hint.textContent=mobile?'左側の円で移動、右側ドラッグで視点変更。共鳴碑を探そう。':'WASD 移動 ／ マウス 視点 ／ Shift ダッシュ ／ E 調べる ／ V 視点切替 ／ Space ジャンプ';
  if(isiPhone)hint.textContent='左スティックで移動、右画面のドラッグで視点変更。共鳴碑は3つ。';
  requestAnimationFrame(animate);
  window.__AETHER01_TEST__={module,player,renderer,camera,scene,setQuality,doInteract,playerAt:(x,y,z)=>{player.x=x;player.y=y;player.z=z;},stop:()=>{module.dispose();renderer.dispose();}};
}
