const assert=require('node:assert/strict');
const {chromium,devices}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const browserPath=process.argv[2];
const origin=process.env.AETHER_TEST_URL||'http://127.0.0.1:8871';
const legacyKey='aether-frontier-00-v01';
const key='aether-frontier-work20-v1';
const stage=process.argv[3]||'final';
(async()=>{
 const b=await chromium.launch({executablePath:browserPath,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 const p=await b.newPage({viewport:{width:640,height:420}});
 const errors=[];
 p.on('pageerror',error=>(console.error(error.stack),errors.push(error.message)));
 p.on('console',m=>{if(m.type()==='error'&&/THREE.WebGL|Shader Error/.test(m.text()))errors.push(m.text());});
 await p.addInitScript(({key,legacyKey})=>{localStorage.setItem(legacyKey,'legacy-sentinel');localStorage.setItem(key,JSON.stringify({unlocked:true}));},{key,legacyKey});
 await p.route('**/work20/main.js',async route=>{
  const resp=await route.fetch();
  const src=await resp.text();
  const hook=`window.qaWork20={warp,world,player,flight,currentAction,
   state(){const pos=player.root.position;return {zone:world.zoneAt(pos.x,pos.z,pos.y),action:currentAction(pos,world.zoneAt(pos.x,pos.z,pos.y))?.label};},
   bossHome,
  };
  return {frame};`;
  await route.fulfill({response:resp,body:src.replace('return {frame};',hook)});
 });
 const prefix=stage==='final'?'':'/af20-checkpoints/stage'+stage;
 await p.goto(origin+prefix+'/playtest/work20/');
 await p.waitForFunction(()=>document.querySelector('#start').textContent!=='ワールドを構築中');
 assert.equal(await p.locator('#start').textContent(),'探索を開始',await p.locator('#controls').textContent());
 await p.locator('#start').click();
 const wait=fn=>p.waitForFunction(fn,undefined,{timeout:10000});
 await wait(()=>aetherStatus().metrics.drawCalls>0);
 const tap=async key=>{await p.keyboard.down(key);await p.waitForTimeout(900);await p.keyboard.up(key);await p.waitForTimeout(430);};
 const move=async key=>{await p.keyboard.down(key);await p.waitForTimeout(400);await p.keyboard.up(key);};
 const status=()=>p.evaluate(()=>aetherStatus());
 const here=()=>p.evaluate(()=>qaWork20.state());
 const warp=xyz=>p.evaluate(([x,y,z,yaw])=>qaWork20.warp({x,y,z},yaw??0),xyz);
 const local=async (area,x,y,z,yaw=0)=>p.evaluate(({area,x,y,z,yaw})=>{
  const a=qaWork20.world.exploration.areas.get(area);
  const v=a.module.toWorld({x,y,z});
  v.y=a.module.sampleGroundWorld(v.x,v.z,v.y)??v.y;
  qaWork20.warp(v,yaw);
 },{area,x,y,z,yaw});
 const go=async key=>{
  await p.evaluate(()=>qaWork20.warp(qaWork20.world.exploration.hub));
  await tap('e');
  await p.locator('#destination').selectOption(key);
  await p.getByRole('button',{name:'転送'}).click();
  assert.equal((await here()).zone,key);
 };
 const before=(await status()).position;
 await move('w');
 assert.ok((await status()).position[2]<before[2]-.05);
 await p.locator('#view').click();assert.equal((await status()).view,'fps');
 await p.locator('#view').click();assert.equal((await status()).view,'tps');
 await p.locator('#quality').click();assert.equal((await status()).quality,'high');
 await p.locator('#quality').click();
 for(const key of ['temple','lab','plant','wilds']){
  await go(key);
  await tap('e');
  assert.equal((await here()).zone,'city',JSON.stringify({state:await here(),status:await status(),focus:await p.evaluate(()=>document.activeElement.tagName)}));
 }
 await local('temple',-32,2,-18);await tap('e');
 assert.ok(await p.evaluate(()=>{const s=qaWork20.world.exploration.areas.get('temple').module.instance.getState();return Object.entries(s).some(([k,v])=>k!=='gate'&&v===true);}));
 if(stage!=='1'){
  await go('carrier');
  await local('carrier',14,32.18,75,Math.PI/2);
  await p.keyboard.down('w');
  await p.waitForFunction(()=>aetherStatus().position[0]>-219,undefined,{timeout:28000});
  await p.keyboard.up('w');
  assert.ok((await status()).position[1]<89,'walked down onto the ramp');
  await local('carrier',60,27.18,70);
  await tap('e');
  await wait(()=>aetherStatus().robot==='flight');
  await go('wilds');
  await p.evaluate(()=>qaWork20.warp(qaWork20.world.vehicles.rover.root.position));
  await tap('e');assert.ok((await status()).driving);
  const roverBefore=(await status()).position;
  await move('w');
  assert.notDeepEqual((await status()).position,roverBefore);
  await p.evaluate(()=>{const d=qaWork20.world.vehicles.driver;d.spawn(d.state);});
  await tap('e');assert.equal((await status()).driving,false);
 }
 if(['3','4','final'].includes(stage)){
   await local('wilds',0,1,-10,0);
  const active=await p.evaluate(()=>qaWork20.world.encounters.active(qaWork20.player.root.position,'wilds'));
  assert.equal(active,'golem');
  const missHP=await p.evaluate(()=>qaWork20.world.encounters.hud('golem').ratio);
  await tap('r');await p.waitForTimeout(700);
  assert.equal(await p.evaluate(()=>qaWork20.world.encounters.hud('golem').ratio),missHP);
  for(let i=0;i<8 && !(await status()).golem;i++){
   await local('wilds',0,1,-17.8,0);
   await tap('r');await p.waitForTimeout(1250);
  }
  assert.ok((await status()).golem,'golem falls to actual melee');
  await local('wilds',-43,1,27,0);
  await wait(()=>document.querySelector('#enemyName').textContent==='AEGIS-IX');
  assert.ok(await p.evaluate(()=>qaWork20.world.encounters.hud('aegis').ratio>0));
 }
 if(stage==='final'){
  await warp([0,.42,-111.5,0]);
  await tap('e');
  assert.equal((await status()).flying,true,'board flight craft with normal input');
  await p.evaluate(()=>{
    const {flight,world}=qaWork20;
    const pad=world.exploration.areas.get('carrier').spawn;
    flight.reset([pad.x,pad.y+2,pad.z]);flight.throttle=0;
  });
  await tap('e');
  assert.equal((await status()).flying,false,'land flight craft on deck');
  assert.equal((await here()).zone,'carrier');
  await go('lab');
  for(const [x,z] of [[-57,-46],[-57,-25],[59,-46],[59,-36],[59,-26],[0,-99],[3.8,-108.2],[0,-156.6]]){
   await local('lab',x,0,z);
   await tap('e');
  }
  assert.ok(await p.evaluate(()=>qaWork20.world.exploration.areas.get('lab').module.instance.getState().awakened),'lab puzzle to final core');
  assert.equal(await p.evaluate(()=>localStorage.getItem('aether-frontier-00-v01')),'legacy-sentinel');
  assert.equal(await p.evaluate(()=>qaWork20.world.atmosphere.module.instance.getState().autoCycle),true);
 }
 assert.deepEqual(errors,[]);
 console.log('PASS',stage,'PC WebGL, actual input and rendering');
 if(stage==='final'){
  const mobile=await b.newPage({...devices['iPhone 15'],defaultBrowserType:undefined});
  await mobile.goto(origin+'/playtest/work20/');
  await mobile.getByRole('button',{name:'探索を開始'}).tap();
  await mobile.waitForFunction(()=>aetherStatus().metrics.drawCalls>0);
  await mobile.locator('.a19-btn.view').tap();
  await mobile.waitForFunction(()=>aetherStatus().view==='fps');
  assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  console.log('PASS Chromium mobile emulation: touch view toggle and viewport width');
 }

 } finally {await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
