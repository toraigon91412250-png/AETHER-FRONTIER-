import {loadAetherCompat} from '../../integration/aether-compat.mjs';

export async function createEncounters(THREE,scene,wilds) {
  let player, damage=()=>{}, report=()=>{}, defeated=()=>{};
  let golemHP=180, cooldown=1.5, next='slam';
  const aim=new THREE.Vector3(), impact=new THREE.Vector3();
  const spawn=wilds.spawn;
  const at=(dx,dz)=>{
    const x=spawn.x+dx,z=spawn.z+dz;
    return new THREE.Vector3(x,wilds.module.sampleGroundWorld(x,z,spawn.y),z);
  };
  const golemHome=at(0,-43), enemyHome=at(-43,1);
  const [golem,enemy]=await Promise.all([
    loadAetherCompat({THREE,id:'14',onEvent({type,raw}){
      if(type==='telegraphStart')report(raw.attack==='slam'?'ゴーレムの叩きつけ。赤い円から離れろ':'ゴーレムの衝撃波。輪の内側か外へ');
      if(type!=='impact'||!player)return;
      const spec=golem.instance.getAttackSpec(raw.attack);
      if(!spec)return;
      impact.set(spec.center.x,0,spec.center.z);
      golem.root.localToWorld(impact);
      const d=Math.hypot(player.x-impact.x,player.z-impact.z);
      if(Math.abs(player.y-impact.y)<2&&d<=(spec.radius??spec.outerRadius)&&d>=(spec.innerRadius??0))damage(29);
    }}),
    loadAetherCompat({THREE,id:'16',options:{maxHP:190,position:enemyHome},onEvent({type,raw}){
      if(type==='playerHit')damage(raw.damage);
      if(type==='telegraph')report('AEGIS-IX '+raw.label+'。予兆範囲から離れろ');
      if(type==='phaseChanged')report('AEGIS-IX 第二形態');
      if(type==='enemyDefeated')defeated('aegis');
    }}),
  ]);
  golem.root.position.copy(golemHome);
  const modules=[golem,enemy];
  for(const module of modules){scene.add(module.root);module.root.visible=false;}
  function setHandlers(handlers){({damage,report,defeated}=handlers);}
  function restore(cleared) {
    if(cleared.golem){golemHP=0;golem.root.rotation.z=-1.2;}
    if(cleared.aegis){enemy.instance.receiveHit({damage:9999});enemy.root.visible=false;}
  }
  function active(pos,zone) {
    if(zone!=='wilds')return null;
    if(golemHP>0&&pos.distanceToSquared(golemHome)<27**2)return 'golem';
    if(enemy.instance.isAlive&&pos.distanceToSquared(enemyHome)<28**2)return 'aegis';
    return null;
  }
  function update(dt,pos,zone,onFoot,quality) {
    player=onFoot?pos:null;
    golem.root.visible=zone==='wilds'&&pos.distanceToSquared(golemHome)<140**2;
    enemy.root.visible=zone==='wilds'&&pos.distanceToSquared(enemyHome)<140**2;
    const selected=onFoot?active(pos,zone):null;
    if(golem.root.visible){
      if(selected==='golem'&&golem.instance.getStatus().action==='none'){
        golem.root.rotation.y=Math.atan2(golemHome.x-pos.x,golemHome.z-pos.z);
        if((cooldown-=dt)<=0&&golem.instance.startAttack(next)){next=next==='slam'?'pulse':'slam';cooldown=.7;}
      }
      golem.update(dt,{quality});
    }
    if(enemy.root.visible){
      enemy.update(dt,{quality,player:selected==='aegis'?{position:pos}:undefined});
      const p=enemy.root.position;
      if(p.distanceToSquared(enemyHome)>31**2)enemy.instance.reset({position:enemyHome});
      p.y=wilds.module.sampleGroundWorld(p.x,p.z,p.y)??enemyHome.y;
    }
  }
  function target(id){
    if(id==='golem')return {position:aim.set(golemHome.x,golemHome.y+1.65,golemHome.z),radius:1.6};
    return {position:aim.set(enemy.root.position.x,enemy.root.position.y+1.45,enemy.root.position.z),radius:.95};
  }
  function hit(id,amount){
    if(id==='aegis')return enemy.instance.receiveHit({damage:amount,stagger:28});
    golemHP=Math.max(0,golemHP-amount);
    // Let telegraphs resolve unless the final strike breaks the guardian.
    if(golem.instance.getStatus().action==='none'||golemHP===0)golem.instance.receiveHit({strength:1.4});
    if(!golemHP){golem.root.rotation.z=-1.2;defeated('golem');}
    return {accepted:true,damage:amount};
  }
  function hud(id){
    return id==='golem'?{name:'VESTIGE-Ω',ratio:golemHP/180}:{name:'AEGIS-IX',ratio:enemy.instance.snapshot().hpRatio};
  }
  return {modules,active,update,target,hit,hud,setHandlers,restore,dispose(){
    for(const module of modules){module.root.removeFromParent();module.dispose();}
  }};
}
