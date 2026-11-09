/** AETHER FRONTIER No.19 / optional keyboard-mouse-touch adapter. MIT. */
export function createAetherInputAdapter(options={}) {
  const element=options.domElement ?? document.body;
  const touchParent=options.touchParent ?? document.body;
  const deviceIsTouch=window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const showTouch=options.showTouch ?? deviceIsTouch;
  const keys=new Set();
  const touch={moveX:0,moveY:0,jump:false,sprint:false,action:false,dash:false,toggleView:false};
  let lookX=0,lookY=0,active=true,locked=false,dragId=null,dragX=0,dragY=0;
  let pointerActive=false,stickId=null,stickX=0,stickY=0;
  const disposable=[];
  let ui=null,style=null;
  const on=(target,type,handler,opts)=>{target.addEventListener(type,handler,opts);disposable.push(()=>target.removeEventListener(type,handler,opts));};
  const editable=target=>target && (['INPUT','TEXTAREA','SELECT'].includes(target.tagName) || target.isContentEditable);
  function keyboard(e,pressed){
    if (!active || editable(e.target)) return;
    const movementKeys=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight',
      'ShiftLeft','ShiftRight','Space','KeyE','KeyQ','KeyF','KeyV','KeyC'];
    if (!movementKeys.includes(e.code)) return;
    if (pressed) keys.add(e.code); else keys.delete(e.code);
    if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
  }
  on(window,'keydown',e=>keyboard(e,true));
  on(window,'keyup',e=>keyboard(e,false));
  on(window,'blur',()=>{keys.clear();dragId=null;pointerActive=false;stickId=null;resetTouch();});
  on(document,'visibilitychange',()=>{if(document.hidden){keys.clear();resetTouch();}});
  function resetTouch(){
    touch.moveX=touch.moveY=0;
    for(const k of ['jump','sprint','action','dash','toggleView']) touch[k]=false;
    if(ui) ui.stickThumb.style.transform='translate(0px,0px)';
  }
  function addLook(dx,dy,scale){lookX+=dx*scale;lookY+=dy*scale;}
  on(document,'pointerlockchange',()=>{locked=document.pointerLockElement===element;});
  on(document,'mousemove',e=>{if(active&&locked)addLook(e.movementX,e.movementY,options.mouseSensitivity??0.00225);});
  on(element,'pointerdown',e=>{
    if(!active || e.pointerType!=='mouse' || e.button!==0) return;
    dragId=e.pointerId;dragX=e.clientX;dragY=e.clientY;
    if(options.pointerLock!==false && element.requestPointerLock) {
      try {const promise=element.requestPointerLock();if(promise?.catch)promise.catch(()=>{});}catch(_){}
    }
  });
  on(window,'pointermove',e=>{
    if(!active||locked||e.pointerType!=='mouse'||dragId!==e.pointerId)return;
    addLook(e.clientX-dragX,e.clientY-dragY,options.mouseSensitivity??0.00225);
    dragX=e.clientX;dragY=e.clientY;
  });
  on(window,'pointerup',e=>{if(e.pointerId===dragId)dragId=null;});
  on(window,'pointercancel',e=>{if(e.pointerId===dragId)dragId=null;});
  if (showTouch) {
    style=document.createElement('style');style.dataset.aetherTouch='19';
    style.textContent=`
    .a19-touch{position:fixed;inset:0;z-index:35;pointer-events:none;user-select:none;-webkit-user-select:none;font-family:system-ui,-apple-system,sans-serif;color:#fff;touch-action:none}
    .a19-look{position:absolute;top:12%;right:0;bottom:18%;width:60%;pointer-events:auto;touch-action:none}
    .a19-joystick{position:absolute;bottom:calc(27px + env(safe-area-inset-bottom));left:calc(28px + env(safe-area-inset-left));width:132px;height:132px;display:grid;place-items:center;border:1px solid rgba(125,233,255,.35);border-radius:50%;background:radial-gradient(circle,rgba(34,99,133,.22),rgba(4,12,30,.47));box-shadow:inset 0 0 20px rgba(109,215,255,.13);pointer-events:auto;touch-action:none}
    .a19-stick{width:62px;height:62px;border-radius:50%;background:radial-gradient(circle at 36% 28%,rgba(216,248,255,.64),rgba(45,138,183,.28));border:1px solid rgba(180,237,255,.8);box-shadow:0 0 14px rgba(50,195,247,.22);pointer-events:none}
    .a19-buttons{position:absolute;right:calc(19px + env(safe-area-inset-right));bottom:calc(28px + env(safe-area-inset-bottom));display:grid;grid-template-columns:repeat(3,64px);grid-template-rows:repeat(2,64px);gap:10px;pointer-events:none}
    .a19-btn{pointer-events:auto;touch-action:none;display:grid;place-items:center;font-size:12px;letter-spacing:.08em;font-weight:800;color:#f4fcff;border:1px solid rgba(112,223,255,.48);border-radius:19px;background:linear-gradient(145deg,rgba(18,53,80,.78),rgba(7,19,34,.84));box-shadow:inset 0 1px rgba(255,255,255,.16),0 4px 18px rgba(0,0,0,.22);-webkit-tap-highlight-color:transparent}
    .a19-btn.a19-down{background:linear-gradient(145deg,rgba(35,156,201,.74),rgba(8,63,93,.85));border-color:#d4f8ff;transform:scale(.96)}
    .a19-btn.view{grid-column:1}.a19-btn.sprint{grid-column:2}.a19-btn.jump{grid-column:3}.a19-btn.dash{grid-column:2}.a19-btn.action{grid-column:3}
    @media(max-width:380px){.a19-joystick{width:112px;height:112px;left:14px;bottom:calc(24px + env(safe-area-inset-bottom))}.a19-buttons{grid-template-columns:repeat(3,56px);grid-template-rows:repeat(2,56px);gap:6px;right:10px}.a19-btn{font-size:11px}}
    `;
    document.head.appendChild(style);
    ui=document.createElement('div');ui.className='a19-touch';
    ui.innerHTML='<div class="a19-look" aria-label="Drag to look"></div><div class="a19-joystick" aria-label="Move joystick"><div class="a19-stick"></div></div><div class="a19-buttons"><button type="button" class="a19-btn view">視点</button><button type="button" class="a19-btn sprint">走る</button><button type="button" class="a19-btn jump">ジャンプ</button><button type="button" class="a19-btn dash">ダッシュ</button><button type="button" class="a19-btn action">調べる</button></div>';
    touchParent.appendChild(ui);
    const stickZone=ui.querySelector('.a19-joystick');
    ui.stickThumb=ui.querySelector('.a19-stick');
    const lookZone=ui.querySelector('.a19-look');
    let touchLookId=null,lastX=0,lastY=0;
    on(stickZone,'pointerdown',e=>{
      e.preventDefault();if(stickId!==null)return;
      stickId=e.pointerId;stickZone.setPointerCapture(e.pointerId);
      const rect=stickZone.getBoundingClientRect();stickX=rect.left+rect.width/2;stickY=rect.top+rect.height/2;
      moveStick(e);
    });
    function moveStick(e){
      const dx=e.clientX-stickX,dy=e.clientY-stickY;
      const max=43;const ratio=Math.min(1,max/Math.max(0.001,Math.hypot(dx,dy)));
      const x=dx*ratio,y=dy*ratio;
      touch.moveX=x/max;touch.moveY=-y/max;
      ui.stickThumb.style.transform=`translate(${x}px,${y}px)`;
    }
    on(stickZone,'pointermove',e=>{if(e.pointerId===stickId)moveStick(e);});
    function releaseStick(e){if(e.pointerId!==stickId)return;stickId=null;touch.moveX=0;touch.moveY=0;ui.stickThumb.style.transform='translate(0px,0px)';}
    on(stickZone,'pointerup',releaseStick);on(stickZone,'pointercancel',releaseStick);
    on(lookZone,'pointerdown',e=>{
      e.preventDefault();if(touchLookId!==null)return;
      touchLookId=e.pointerId;lastX=e.clientX;lastY=e.clientY;
      lookZone.setPointerCapture(e.pointerId);
    });
    on(lookZone,'pointermove',e=>{
      if(e.pointerId!==touchLookId)return;
      addLook(e.clientX-lastX,e.clientY-lastY,options.touchSensitivity??0.0041);
      lastX=e.clientX;lastY=e.clientY;
    });
    const stopLook=e=>{if(e.pointerId===touchLookId)touchLookId=null;};
    on(lookZone,'pointerup',stopLook);on(lookZone,'pointercancel',stopLook);
    for(const name of ['view','sprint','jump','dash','action']) {
      const button=ui.querySelector(`.a19-btn.${name}`);
      const key=name==='view'?'toggleView':name;
      on(button,'pointerdown',e=>{
        e.preventDefault();button.setPointerCapture(e.pointerId);
        touch[key]=true;button.classList.add('a19-down');
      });
      const release=e=>{touch[key]=false;button.classList.remove('a19-down');};
      on(button,'pointerup',release);on(button,'pointercancel',release);
      on(button,'contextmenu',e=>e.preventDefault());
    }
  }
  function sample(){
    const activeMove = n=>keys.has(n);
    const dx=(activeMove('KeyD')||activeMove('ArrowRight')?1:0)-(activeMove('KeyA')||activeMove('ArrowLeft')?1:0);
    const dy=(activeMove('KeyW')||activeMove('ArrowUp')?1:0)-(activeMove('KeyS')||activeMove('ArrowDown')?1:0);
    const result={moveX:Math.max(-1,Math.min(1,dx+touch.moveX)),
      moveY:Math.max(-1,Math.min(1,dy+touch.moveY)),
      lookX:lookX,lookY:lookY,
      jump:keys.has('Space')||touch.jump,
      sprint:keys.has('ShiftLeft')||keys.has('ShiftRight')||touch.sprint,
      dash:keys.has('KeyQ')||touch.dash,
      action:keys.has('KeyE')||keys.has('KeyF')||touch.action,
      toggleView:keys.has('KeyV')||keys.has('KeyC')||touch.toggleView};
    lookX=lookY=0;
    return active?result:{moveX:0,moveY:0,lookX:0,lookY:0};
  }
  function dispose(){
    for(const off of disposable.splice(0))off();
    if(ui)ui.remove();if(style)style.remove();
    ui=style=null;keys.clear();
  }
  return {sample,dispose,setEnabled(v){active=!!v;if(!active){keys.clear();resetTouch();}},
    isTouch:showTouch,get locked(){return locked;},
    get ui(){return ui;},
  };
}
