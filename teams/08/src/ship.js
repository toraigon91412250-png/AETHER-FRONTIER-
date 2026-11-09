/**
 * AETHER FRONTIER / No.08: LUMEN KESTREL
 * Procedural SF-fantasy airship. Three.js 0.160.0.
 * +Y up, forward -Z, 1 unit = about 1 meter.
 * Renderer, camera, input and physics are deliberately NOT owned by this module.
 */
export function createAetherModule(THREE, options = {}) {
  const root = new THREE.Group();
  root.name = 'AF08_LUMEN_KESTREL';
  const visual = new THREE.Group();
  visual.name = 'ship_visual';
  root.add(visual);
  const main = new THREE.Group();
  main.name = 'non_articulated_airframe';
  visual.add(main);
  const high = new THREE.Group();
  high.name = 'high_detail_decorations';
  visual.add(high);
  const dynamic = [];
  const group = (name, parent = main) => { const g = new THREE.Group(); g.name = name; parent.add(g); return g; };
  const mat = (name, hex, metal = 0.25, rough = 0.5, extra = {}) => {
    const m = new THREE.MeshStandardMaterial({color: hex, metalness: metal, roughness: rough, ...extra});
    m.name = name; return m;
  };
  const m = {
    hull: mat('titanium_midnight', 0x17263a, .75, .3),
    armor: mat('pearl_armor', 0x9fbbcc, .75, .26),
    edge: mat('anodized_gunmetal', 0x344b60, .7, .34),
    shadow: mat('recesses', 0x0a1424, .5, .49),
    gold: mat('ancient_gold', 0xba9564, .66, .29),
    glass: mat('cockpit_crystal', 0x20678a, .35, .16, {transparent:true, opacity:.67, depthWrite:false, side:THREE.DoubleSide}),
    cyan: mat('aether_cyan', 0x52e3ef, .08, .28, {emissive:0x15a9c5, emissiveIntensity:1.55}),
    blue: mat('drive_blue', 0x4b8aff, .09, .27, {emissive:0x1767eb, emissiveIntensity:2.1}),
    warm: mat('mana_gold', 0xffdb94, .15, .2, {emissive:0xc28b38, emissiveIntensity:1.35}),
    vent: mat('power_channels', 0x111c2b, .5, .52),
    thruster: new THREE.MeshBasicMaterial({color:0x7cedff, transparent:true, opacity:.94, depthWrite:false, side:THREE.DoubleSide}),
    glow: new THREE.MeshBasicMaterial({color:0x21dfff, transparent:true, opacity:.2, depthWrite:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide})
  };
  const geom = {
    box: new THREE.BoxGeometry(1,1,1),
    unitCylinder: new THREE.CylinderGeometry(1,1,1,12),
    orb: new THREE.SphereGeometry(1,12,8),
    finOrb: new THREE.IcosahedronGeometry(1,1)
  };
  const add = (parent, geometry, material, name, pos, scale, rot) => {
    const o = new THREE.Mesh(geometry,material); o.name = name;
    if(pos)o.position.set(...pos); if(scale)o.scale.set(...scale); if(rot)o.rotation.set(...rot);
    parent.add(o); return o;
  };
  const box = (p,material,name,pos,scale,rot) => add(p,geom.box,material,name,pos,scale,rot);
  const orb = (p,material,name,pos,scale) => add(p,geom.orb,material,name,pos,scale);
  const ring = (p,material,name,pos,r,t,rot) => add(p,new THREE.TorusGeometry(r,t,7,36),material,name,pos,null,rot);
  const beam = (p,material,name,a,b,r) => {
    const aa = new THREE.Vector3(...a), bb = new THREE.Vector3(...b);
    const obj = add(p,geom.unitCylinder,material,name);
    const dir = bb.clone().sub(aa);
    obj.position.copy(aa.add(bb).multiplyScalar(.5));
    obj.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.clone().normalize());
    obj.scale.set(r,dir.length(),r); return obj;
  };
  function fuselage(rings, sides=16) {
    const v=[], ids=[];
    rings.forEach(({z,rx,ry,y=0}) => {
      for(let j=0;j<sides;j++){const a=j/sides*Math.PI*2;v.push(Math.cos(a)*rx,y+Math.sin(a)*ry,z);}
    });
    for(let k=0;k<rings.length-1;k++) for(let j=0;j<sides;j++) {
      const a=k*sides+j,b=k*sides+(j+1)%sides,c=(k+1)*sides+j,d=(k+1)*sides+(j+1)%sides;
      ids.push(a,b,c,b,d,c);
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex(ids);g.computeVertexNormals();return g;
  }
  function slab(points, thickness=.16, side=1) {
    // Convex top-down aerodynamic panel, triangulated into a closed thin solid.
    const n=points.length, v=[];for(const y of [thickness/2,-thickness/2]) for(const [x,z] of points)v.push(x*side,y,z);
    const ix=[];
    const crossY=((points[1][1]-points[0][1])*(points[2][0]-points[0][0])-(points[1][0]-points[0][0])*(points[2][1]-points[0][1]))*side;
    const reverseTop=crossY<0;
    for(let i=1;i<n-1;i++) {
      if(reverseTop){ix.push(0,i+1,i);ix.push(n,n+i,n+i+1);}
      else {ix.push(0,i,i+1);ix.push(n,n+i+1,n+i);}
    }
    for(let i=0;i<n;i++){let j=(i+1)%n;ix.push(i,j,n+i,j,n+j,n+i);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex(ix);g.computeVertexNormals();return g;
  }
  // ----- armored hull & bow -----
  add(main,fuselage([
    {z:-6.25,rx:.035,ry:.045,y:.03}, {z:-5.63,rx:.58,ry:.34,y:-.04},
    {z:-4.65,rx:1.05,ry:.53,y:-.08}, {z:-2.95,rx:1.37,ry:.68,y:-.13},
    {z:-.9,rx:1.48,ry:.75,y:-.12}, {z:1.15,rx:1.39,ry:.69,y:-.11},
    {z:3.05,rx:1.03,ry:.55,y:-.08}, {z:4.64,rx:.18,ry:.28,y:-.05}
  ]),m.hull,'armored_fuselage');
  add(main,fuselage([
    {z:-5.7,rx:.08,ry:.08,y:.23},{z:-4.9,rx:.52,ry:.22,y:.43},
    {z:-3.3,rx:.85,ry:.25,y:.49},{z:-1.8,rx:.91,ry:.23,y:.46},
    {z:-.85,rx:.53,ry:.13,y:.5},{z:-.56,rx:.04,ry:.03,y:.42}
  ],12),m.glass,'panoramic_crystal_canopy');
  beam(main,m.gold,'bow_gold_keel',[0,-.31,-6.11],[0,-.44,-3.45],.055);
  for(const s of [-1,1]) {
    beam(main,m.armor,'upper_armor_streak',[s*.35,.39,-5.37],[s*1.08,.51,-2.31],.08);
    beam(main,m.edge,'side_rib',[s*1.08,.12,-4.42],[s*1.43,-.12,.56],.093);
    beam(main,m.cyan,'side_ether_seam',[s*1.15,-.20,-3.35],[s*1.32,-.24,.82],.032);
    box(main,m.armor,'tail_guard',[s*.85,.13,2.8],[.23,.32,2.2],[0,s*.16,0]);
  }
  // Hexagonal forward sensor and runic trim.
  orb(main,m.warm,'bow_focus',[0,.08,-6.2],[.13,.13,.22]);
  ring(main,m.gold,'nose_annulus',[0,.13,-5.83],.37,.055);
  ring(main,m.cyan,'nose_locator',[0,.13,-5.84],.24,.026);
  // ----- variable geometry lift surfaces -----
  const wingPivots=[];
  const panels=[];
  for(const s of [-1,1]) {
    const w=group((s<0?'port':'starboard')+'_articulated_wing',visual);
    w.position.set(s*1.1,.17,-.34);
    const points=[[.05,-2.12],[1.45,-2.19],[4.5,-.86],[5.12,-.10],[5.0,.73],[4.32,1.24],[1.61,2.53],[.15,1.65]];
    add(w,slab(points,.22,s),m.armor,'aerofoil_shield');
    add(w,slab([[.25,-1.88],[1.46,-1.84],[3.91,-.76],[3.41,-.44],[.53,-1.02]],.26,s),m.edge,'wing_front_inset');
    add(w,slab([[2.4,.86],[4.18,.73],[4.0,1.01],[2.33,1.93]],.24,s),m.hull,'rear_stealth_panel');
    beam(w,m.gold,'leading_edge',[s*.19,.15,-2.05],[s*4.67,.15,-.65],.076);
    beam(w,m.cyan,'rune_vein',[s*.7,.151,-1.24],[s*4.22,.151,.16],.037);
    beam(w,m.cyan,'rune_branch',[s*2.54,.15,-.52],[s*2.73,.15,1.1],.026);
    beam(w,m.edge,'trailing_edge',[s*1.45,.15,2.3],[s*4.55,.15,.98],.075);
    const hinge=orb(w,m.gold,'visible_hinge',[s*.15,.18,.08],[.3,.28,.4]);
    // Animated secondary hover-stabilizer with a separate pivot.
    const fin=group('wingtip_airbrake',w);fin.position.set(s*4.43,.07,.62);
    add(fin,slab([[0,-.25],[.72,.0],[.68,.75],[0,.55]],.12,s),m.hull,'wingtip_airbrake_panel');
    beam(w,m.edge,'aether_capacitor',[s*2.55,.02,.58],[s*3.46,-.08,1.00],.14);
    panels.push({fin,s}); wingPivots.push({group:w,s});
    // Hover vanes nested under the wings.
    const hover=group('grav_lift_vane',w);hover.position.set(s*3.48,-.22,-.22);
    add(hover,new THREE.CylinderGeometry(.7,.7,.12,16),m.vent,'lift_recess',null,null,[Math.PI/2,0,0]);
    ring(hover,m.blue,'lift_iris',[0,-.015,0],.52,.07,[Math.PI/2,0,0]);
    orb(hover,m.cyan,'lift_center',[0,-.06,0],[.2,.07,.2]);
  }
  // ----- paired engine nacelles -----
  const engineGlows=[];
  const nozzles=[];
  for(const s of [-1,1]){
    const p=group((s<0?'left':'right')+'_engine_pod');p.position.set(s*1.2,-.16,1.69);
    add(p,new THREE.CylinderGeometry(.57,.76,2.86,16,1),m.edge,'nacelle_shell',null,null,[Math.PI/2,0,0]);
    add(p,new THREE.CylinderGeometry(.43,.59,2.8,16,1),m.shadow,'engine_recess',null,null,[Math.PI/2,0,0]);
    for(const z of [-1.1,-.15,.95])ring(p,m.armor,'locking_ring',[0,0,z],.71,.085);
    ring(p,m.gold,'exit_bezel',[0,0,1.48],.66,.09);
    ring(p,m.blue,'nozzle_torus',[0,0,1.57],.49,.1);
    const g=orb(p,m.thruster,'ion_exhaust',[0,0,1.68],[.39,.39,.10]);
    const bloom=orb(p,m.glow,'exhaust_halo',[0,0,1.74],[.65,.65,.18]);
    engineGlows.push({g,bloom});nozzles.push({x:s*1.2,y:-.16,z:3.36});
    for(const a of [-1,1])box(p,m.gold,'nacelle_mount',[a*.55,.01,-.42],[.15,.35,1.92]);
    for(let i=0;i<4;i++){
      const z=-.75+i*.54;
      box(p,m.blue,'nacelle_cell',[s*.63,.25,z],[.065,.065,.27]);
    }
  }
  // Central ancient drive halo, counter-rotating rings.
  const drive=group('ancient_aether_drive');drive.position.set(0,-.10,4.18);
  orb(drive,m.vent,'axial_mana_chamber',[0,0,.5],[.66,.66,1.35]);
  const rotorA=group('gyro_ring_one',drive),rotorB=group('gyro_ring_two',drive);
  ring(rotorA,m.gold,'outer_grav_ring',[0,0,.94],1.27,.095);
  ring(rotorA,m.cyan,'inner_grav_ring',[0,0,.94],1.1,.04);
  ring(rotorB,m.armor,'runic_ring',[0,0,1.05],.77,.065);
  ring(rotorB,m.blue,'blue_subring',[0,0,1.06],.61,.04);
  orb(drive,m.blue,'reactor_heart',[0,0,1.12],[.39,.39,.48]);
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4;
    box(rotorA,m.warm,'orbital_rune',[Math.sin(a)*1.25,Math.cos(a)*1.25,.97],[.13,.29,.08],[0,0,-a]);
  }
  // ----- retractable landing pylons -----
  const legs=[];
  for(const x of [-.92,.92]){
    const g=group('landing_gear');g.position.set(x,-.66,1.23);
    beam(g,m.edge,'telescoping_strut',[0,0,0],[x*.1,-1.08,.27],.13);
    box(g,m.armor,'landing_foot',[x*.1,-1.09,.47],[.45,.12,1.05]);
    orb(g,m.warm,'hydraulic_lock',[0,-.16,.04],[.17,.15,.17]);
    legs.push(g);
  }
  // ----- optional artisan detail (quality=high only) -----
  for(const s of [-1,1]){
    for(let i=0;i<7;i++){
      const z=-3.7+i*.75;
      box(high,m.gold,'etched_hull_mark',[s*(1.04+Math.sin(i*.4)*.22),.08,z],[.042,.04,.30],[0,s*.12,0]);
    }
    for(let i=0;i<5;i++){
      const z=-1.7+i*.67;
      box(high,m.vent,'maintenance_grille',[s*.61,-.72,z],[.28,.038,.29]);
    }
    const grp=group('gold_glyph_cluster',high);grp.position.set(s*.80,.64,-1.02);
    ring(grp,m.gold,'shield_seal',[0,0,0],.19,.022);
    beam(grp,m.warm,'glyph_line',[0,-.14,0],[0,.14,0],.026);
  }
  const antenna=group('trailing_survey_fins',high);
  for(const s of [-1,1]){
    add(antenna,slab([[.72,2.4],[1.1,2.95],[1.08,4.2],[.82,4.72]],.17,s),m.armor,'vertical_rune_stabilizer',[0,.70,0],[1,1,1],[s*.43,0,0]);
    beam(antenna,m.cyan,'fin_etherline',[s*.96,1.00,3],[s*.90,1.10,4.25],.035);
  }
  // Cheap single-drawcall ion stream, with fixed particles in model space.
  const count=40, pts=new Float32Array(count*3), phases=new Float32Array(count);
  for(let i=0;i<count;i++){
    phases[i]=(i*0.61803398875)%1;
    pts[3*i]= (i%2===0?-1.2:1.2);
    pts[3*i+1]=-.16;
    pts[3*i+2]=3.4+phases[i]*6;
  }
  const particleGeo=new THREE.BufferGeometry();particleGeo.setAttribute('position',new THREE.BufferAttribute(pts,3));
  const particleMat=new THREE.PointsMaterial({color:0x64dfff,size:.19,transparent:true,opacity:.67,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true});
  const particles=new THREE.Points(particleGeo,particleMat);particles.name='ion_exhaust_particles';visual.add(particles);
  let quality='high',clock=0,disposed=false;
  const out={throttle:.35,speed:0,boost:false,landing:false,steer:0,vertical:0};
  function setFlightState(state={}) {for(const k in out)if(state[k]!==undefined)out[k]=state[k];}
  function setQuality(mode='high') {
    quality=(mode==='low'||mode==='lite')?'low':'high';
    high.visible=quality==='high';
    particleGeo.setDrawRange(0,quality==='high'?40:12);
    particleMat.size=quality==='high'?.21:.14;
    m.glow.opacity=quality==='high'?.20:.11;
    return quality;
  }
  function update(dt, context={}) {
    if(disposed)return;
    const t=Math.min(Math.max(Number(dt)||0,0),.10);clock+=t;
    if(context.flight)setFlightState(context.flight);
    else if(context.throttle!==undefined)setFlightState(context);
    const throttle=THREE.MathUtils.clamp(out.throttle||0,0,1);
    const power=throttle+(out.boost?.4:0);
    const flying=THREE.MathUtils.clamp(out.speed/28,0,1);
    visual.position.y=Math.sin(clock*1.7)*(.025+.043*flying);
    for(const {group:w,s} of wingPivots)w.rotation.z=s*(.045+.16*(1-flying)+Math.sin(clock*2.5)*.009);
    for(const {fin,s} of panels)fin.rotation.z=s*(.12+.27*(out.boost?1:0)+.05*Math.sin(clock*4.5));
    for(const leg of legs){leg.rotation.x=THREE.MathUtils.lerp(leg.rotation.x,out.landing?0:-1.1,Math.min(1,t*3.5));}
    rotorA.rotation.z=clock*(.45+power*.6);
    rotorB.rotation.z=-clock*(.75+power*1.1);
    const pulse=1+.11*Math.sin(clock*13)+.30*power;
    engineGlows.forEach(({g,bloom})=>{g.scale.z=.12+pulse*.10;bloom.scale.setScalar(.55+.18*power);bloom.scale.z=.25+.3*power;});
    m.blue.emissiveIntensity=1.5+1.1*power;
    m.cyan.emissiveIntensity=1.1+.7*power;
    m.thruster.opacity=.54+.25*power;
    particles.visible=power>.1;
    const a=particleGeo.attributes.position;
    for(let i=0;i<count;i++){
      const phase=(phases[i]+clock*(.31+.19*power))%1;
      const j=3*i;
      pts[j]=(i%2===0?-1.2:1.2)+Math.sin(phase*21+i*3)*phase*.19;
      pts[j+1]=-.16+Math.sin(phase*8+i)*phase*.17;
      pts[j+2]=3.4+phase*(3.0+power*6.7);
    }
    a.needsUpdate=true;
    particleMat.opacity=.35+.37*power;
  }
  function dispose() {
    if(disposed)return;disposed=true;
    const geometries=new Set(),materials=new Set();
    root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material){const a=Array.isArray(o.material)?o.material:[o.material];a.forEach(m=>materials.add(m));}});
    Object.values(geom).forEach(g=>geometries.add(g));
    Object.values(m).forEach(v=>materials.add(v));
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());root.clear();
  }
  setQuality(options.quality||'high');
  return {
    root,update,setQuality,dispose,setFlightState,
    get quality(){return quality;},
    // Local-space anchors: parent application computes world transforms as needed.
    anchors: {cockpit:[0,1.25,-2.3],chase:[0,4.4,16],engine:[0,0,5.4]},
    dimensions: {length:12.6,width:12.5,height:3.6},
    id:'AF08_LUMEN_KESTREL',
    getSpecs(){return {id:'AF08_LUMEN_KESTREL',quality,axes:'+Y up / -Z forward',units:'meters',bounds:[12.5,3.6,12.6]};}
  };
}
