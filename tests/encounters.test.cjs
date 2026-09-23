const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const ts=require('typescript');const THREE=require('three');
const root=path.resolve(__dirname,'..');

// Runs the actual game closures with a renderer stub: no GPU or browser needed.
function gameHarness(){
  const refs=[];let effect,frame,now=0;const saved=new Map();const cache=new Map();
  const canvas={dataset:{},addEventListener(){},requestPointerLock(){return Promise.resolve();}};
  const react={useRef(value){const ref={current:refs.length===0?canvas:value};refs.push(ref);return ref;},useState(value){return [value,()=>{}];},useEffect(fn){effect=fn;}};
  class Renderer{shadowMap={};setPixelRatio(){}setSize(){}render(){}dispose(){}}
  class Assets{load(){return Promise.resolve();}create(){return null;}dispose(){}}
  const audio={resume(){},pulse(){},creak(){},jumpscare(){},setListener(){},setEntity(){},context:{close(){return Promise.resolve();}}};
  function load(file){
    file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;
    const module={exports:{}};cache.set(file,module);
    const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
    const context={module,exports:module.exports,console,URL,Map,Set,Math:Object.assign(Object.create(Math),{random:()=>.5}),
      performance:{now:()=>now},requestAnimationFrame(fn){frame=fn;return 1;},cancelAnimationFrame(){},
      localStorage:{getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},
      window:{innerWidth:1280,innerHeight:720,devicePixelRatio:1,matchMedia:()=>({matches:true}),addEventListener(){},removeEventListener(){},setTimeout(){return 1;}},
      document:{body:{dataset:{}},pointerLockElement:null,addEventListener(){},removeEventListener(){},exitPointerLock(){}},
      require(id){
        if(id==='react')return react;if(id==='three')return {...THREE,WebGLRenderer:Renderer};
        if(id==='./modelAssets')return {ModelAssets:Assets,animateModel(){},disposeModel(){}};
        if(id==='./horrorAudio')return {HorrorAudio:class{play(){return false;}}};
        if(id.startsWith('.')){const p=path.resolve(path.dirname(file),id);return load(fs.existsSync(p)?p:p+'.ts');}
        return require(id);
      }};
    vm.runInNewContext(code,context,{filename:file});return module.exports;
  }
  const Component=load(path.join(root,'app/IonGame.tsx')).default;Component();effect();
  const runtime=refs[1].current,act=refs[2].current;runtime.audio=audio;
  const step=(seconds=.05)=>{for(let t=0;t<seconds;t+=.05){now+=50;frame(now);}};
  const enter=(room,chaseState=null)=>{
    runtime.room=room;runtime.checkpoint=null;saved.set('ion-checkpoint',JSON.stringify({room,chaseState,ammo:6,battery:100,crystals:{malachite:0,amethyst:0,quartz:0,obsidian:0,citrine:0,fluorite:0,corrupted:0},discovered:[],gunInfusion:null,lightInfusion:null,accessKeys:10,maxAmmo:8}));act.restartCheckpoint();
  };
  const useAt=object=>{runtime.player.copy(object.position).add(new THREE.Vector3(0,1.65,0));step();act.interact();};
  return {runtime,act,step,enter,useAt,load,saved};
}

test('two Fluorite per Infusionsmith batch, up to four rarer crawlers, 100 persistent badges and three save slots',async()=>{
  const h=gameHarness();await Promise.resolve();await Promise.resolve();
  const progression=h.load(path.join(root,'app/progression.ts'));
  assert.equal(progression.BADGES.length,100);
  assert.equal(new Set(progression.BADGES.map(b=>b.id)).size,100);
  const allRolls=(...values)=>{let i=0;return()=>values[i++]};
  assert.equal(progression.rollCrawlerPack(allRolls(.99),0),0);
  assert.equal(progression.rollCrawlerPack(allRolls(0,.99),0),1);
  assert.equal(progression.rollCrawlerPack(allRolls(0,0,.99),0),2);
  assert.equal(progression.rollCrawlerPack(allRolls(0,0,0,.99),0),3);
  assert.equal(progression.rollCrawlerPack(allRolls(0,0,0,0),0),4);
  h.runtime.crystals={malachite:2,amethyst:2,quartz:2,corrupted:2,fluorite:0,obsidian:0,citrine:0};
  h.act.synthesizeFluorite();assert.equal(h.runtime.crystals.fluorite,2);
  assert.equal(h.runtime.crystals.malachite,1);
  h.act.synthesizeFluorite();assert.equal(h.runtime.crystals.fluorite,4);
  assert(progression.BADGES.some(b=>b.id==='forge-2'));
  h.act.startNewSlot(0);h.act.start(true);h.act.saveRun();
  const slots=progression.readRunSlots({getItem:key=>h.saved.get(key)??null});
  assert.equal(slots.length,3);assert.equal(slots[0].state.room,1);assert.equal(slots[1],null);
  const progress=JSON.parse(h.saved.get('ion-badges-v1'));assert(progress.unlocked.includes('saved-run'));
  h.runtime.crystals.malachite=7;h.runtime.ammo=3;
  h.act.saveRun();h.act.startNewSlot(1);h.act.start(true);
  assert.equal(h.runtime.crystals.malachite,0);
  h.act.loadSlot(0);
  assert.equal(h.runtime.crystals.malachite,7);assert.equal(h.runtime.ammo,3);
});

test('seven five-room scheduled chases and exact 2% Remetons boundary',()=>{
  const h=gameHarness();const rules=h.load(path.join(root,'app/encounters.ts'));
  const rooms=[];for(let r=1;r<=200;r++)if(rules.scheduledChase(r))rooms.push(r);
  assert.equal(rooms.length,35);assert.equal(rooms[0],25);assert.equal(rooms.at(-1),179);
  assert.equal(rules.chaseForRoom(10,null,.019999).type,'remetons');assert.equal(rules.chaseForRoom(10,null,.02),null);
  for(let r=1;r<=200;r++)if(rules.canRollRemetons(r))for(let next=r;next<r+5;next++){assert.notEqual(next,32);assert.equal(rules.scheduledChase(next),null);assert(next<200);}
  const state={start:10,type:'remetons'};assert.equal(rules.chaseForRoom(14,state,.5).start,10);assert.equal(rules.chaseForRoom(15,state,.5),null);
});

test('actual chase rooms contain reachable specimens and four resonators; keys cannot bypass them',async()=>{
  const h=gameHarness();await Promise.resolve();await Promise.resolve();
  for(const room of [25,26,28,50,75,179]){
    h.enter(room);const r=h.runtime;r.enemies.forEach(e=>{if(e.kind!=='noise')e.alive=false;});
    assert.equal(r.chaseRoom,true);assert.equal(r.requiredResonators,4);assert.equal(r.pickups.filter(p=>p.kind==='specimen').length,5);
    const stations=r.stations.filter(s=>s.kind==='resonator');assert.equal(stations.length,4);
    for(const p of [...stations,...r.pickups.filter(p=>p.kind==='specimen'||p.mandatory)]){
      const box=new THREE.Box3().setFromCenterAndSize(p.object.position.clone().setY(1.2),new THREE.Vector3(.68,1.5,.68));
      assert(!r.obstacles.some(o=>o.intersectsBox(box)),`blocked task in room ${room}`);
    }
    r.nearest={kind:'door'};h.act.interact();assert.equal(r.doorUnlocked,false);assert.equal(r.accessKeys,10);
    for(const p of [...r.pickups.filter(p=>p.kind==='specimen')])h.useAt(p.object);
    assert.equal(r.noiseCount,5);assert.equal(r.noiseActive,false);assert.equal(r.doorUnlocked,false);
    for(const s of stations)h.useAt(s.object);
    for(const p of [...r.pickups.filter(p=>p.mandatory)])h.useAt(p.object);
    assert.equal(r.activeResonators,4);assert.equal(r.doorUnlocked,true);assert.equal(r.doorOpening,true);
  }
});

test('Noise expiration is fatal even in a trapdoor; collection stops the deadline',async()=>{
  const h=gameHarness();await Promise.resolve();await Promise.resolve();h.enter(25);
  const r=h.runtime;r.enemies.forEach(e=>e.alive=false);r.hiding=true;r.noiseTime=.01;r.wardCharges=2;r.basdinos=2;h.step();
  assert.equal(r.dead,true);assert.equal(r.deathKind,'noise');assert(r.scareActor);assert.equal(r.wardCharges,2);
  h.enter(25);r.enemies.forEach(e=>e.alive=false);
  for(const p of [...r.pickups.filter(p=>p.kind==='specimen')])h.useAt(p.object);
  r.noiseTime=.01;h.step(.5);assert.equal(r.dead,false);
});

test('Remetons cutscene holds timers, transforms Pers, then starts pursuit',async()=>{
  const h=gameHarness();await Promise.resolve();await Promise.resolve();h.enter(10,{start:10,type:'remetons'});
  const r=h.runtime;assert.equal(r.infectionTime,0);const time=r.noiseTime;
  h.step(4);assert.equal(r.noiseTime,time);assert(r.infectionActors.getObjectByName('infected-pers'));
  h.step(5);assert.equal(r.infectionTime,-1);assert.equal(r.infectionActors,null);assert(r.enemies.some(e=>e.kind==='remetons'&&e.alive));
  assert.equal(r.chaseState.start,10);assert.equal(r.requiredResonators,4);
});

test('every monster has a distinct smooth 3D silhouette and valid animation',()=>{
  const h=gameHarness();const {createMonster,animateMonster,MONSTER_NAMES}=h.load(path.join(root,'app/monsterModels.ts'));
  const signatures=new Set();
  for(const kind of Object.keys(MONSTER_NAMES)){
    const model=createMonster(kind);let vertices=0;model.traverse(n=>{if(n.isMesh){vertices+=n.geometry.getAttribute('position').count;assert(n.geometry.getAttribute('normal'));}});
    assert(vertices>1000,kind);animateMonster(model,1);const box=new THREE.Box3().setFromObject(model);assert(Number.isFinite(box.max.y));assert(model.userData.focusY>0);
    signatures.add(vertices+':'+box.max.y.toFixed(3));
  }
  assert(signatures.size>=9);
});

test('rounded props retain finite dimensions, smooth normals and interleaved UVs',()=>{
  const h=gameHarness();const {roundStaticGeometry,gradientMaterial}=h.load(path.join(root,'app/surfaceStyle.ts'));
  const box=new THREE.BoxGeometry(2,3,1);const rounded=roundStaticGeometry(box);
  assert(rounded.getAttribute('position').count>box.getAttribute('position').count);
  const bounds=new THREE.Box3().setFromBufferAttribute(rounded.getAttribute('position'));
  assert(bounds.max.y>1.2&&bounds.max.y<=1.5);assert(bounds.min.y>=-1.5);
  for(const a of Object.values(rounded.attributes))for(const n of a.array)assert(Number.isFinite(n));
  const geometry=new THREE.BufferGeometry();const data=new THREE.InterleavedBuffer(new Float32Array([0,0,0,0,0,1,0,0,1,0,0,1,0,0,1]),5);
  geometry.setAttribute('position',new THREE.InterleavedBufferAttribute(data,3,0));geometry.setAttribute('uv',new THREE.InterleavedBufferAttribute(data,2,3));
  const result=roundStaticGeometry(geometry);assert.equal(result.getAttribute('uv').getX(1),.5);assert.equal(result.getAttribute('uv').getY(2),.5);
  const m=gradientMaterial(0x112244,0x3399ee,.2,true);const shader={uniforms:{},vertexShader:'#include <common>\n#include <begin_vertex>',fragmentShader:'#include <common>\n#include <color_fragment>'};
  m.onBeforeCompile(shader);assert(shader.fragmentShader.includes('float bands'));assert(shader.uniforms.ionLow);assert(!shader.fragmentShader.includes('undefined'));
});

test('Blob speed rises gently and matches sprint speed in the fifth room',async()=>{
  const h=gameHarness();const {blobChaseSpeed}=h.load(path.join(root,'app/encounters.ts'));const chase={start:25,type:'blob'};
  assert(Math.abs(blobChaseSpeed(25,chase,5.1)-5.1*.72)<1e-9);
  assert(Math.abs(blobChaseSpeed(26,chase,5.1)-5.1*.79)<1e-9);
  assert(Math.abs(blobChaseSpeed(27,chase,5.1)-5.1*.86)<1e-9);
  assert(Math.abs(blobChaseSpeed(28,chase,5.1)-5.1*.93)<1e-9);
  assert(Math.abs(blobChaseSpeed(29,chase,5.1)-5.1)<1e-9);
  await Promise.resolve();await Promise.resolve();h.enter(29);
  const blob=h.runtime.enemies.find(e=>e.kind==='blob');assert(blob);assert.equal(blob.speed,5.1);assert.equal(h.runtime.spawnGrace,2);
});

test('a fresh descent cannot load an unreached stale Room 25 checkpoint',async()=>{
  const h=gameHarness();await Promise.resolve();await Promise.resolve();h.enter(25);assert.equal(h.runtime.room,25);
  h.act.start(true);assert.equal(h.runtime.room,1);h.act.restartCheckpoint();assert.equal(h.runtime.room,1);
});

test('Paradox jar, whirlpool Essence, Pers rift, reversed saves and *200 ending are playable',async()=>{
  const h=gameHarness();await Promise.resolve();await Promise.resolve();
  const rules=h.load(path.join(root,'app/paradox.ts'));
  assert.equal(rules.paradoxEncounter(25,.99),'grin');
  assert.equal(rules.paradoxEncounter(50,0),'grin');
  assert.equal(rules.paradoxEncounter(26,.06999),'blob');
  assert.equal(rules.paradoxEncounter(26,.07),null);
  assert.equal(rules.canEnterParadox(true,true,1),true);
  h.enter(1);let r=h.runtime;
  const jar=r.pickups.find(p=>p.kind==='jar');assert(jar);h.useAt(jar.object);
  assert.equal(r.paradoxJar,true);assert.equal(r.paradoxJarEquipped,true);
  const jarBadge=JSON.parse(h.saved.get('ion-badges-v1'));
  assert(!jarBadge.unlocked.includes('paradox-maker'));
  h.enter(32);r.paradoxJar=true;r.paradoxJarEquipped=true;r.crystals.malachite=1;
  assert(r.persActor?.visible);
  r.player.set(0,1.65,1.8);r.yaw=0;r.pitch=0;h.step();r.camera.updateMatrixWorld(true);r.roomGroup.updateMatrixWorld(true);
  const debugRay=new THREE.Raycaster();debugRay.setFromCamera(new THREE.Vector2(),r.camera);const persTargets=[];r.persActor.traverse(child=>{if(child.isMesh)persTargets.push(child);});
  assert(debugRay.intersectObjects(persTargets,false).length>0,JSON.stringify({camera:r.camera.position.toArray(),direction:debugRay.ray.direction.toArray(),pers:new THREE.Box3().setFromObject(r.persActor).getCenter(new THREE.Vector3()).toArray(),meshes:persTargets.length}));
  h.act.fire();assert.equal(r.paradoxRift,true);
  assert.equal(r.stations.some(s=>s.kind==='pershub'),false);
  const whirlpool=r.hazards[0];assert(whirlpool);
  r.player.copy(whirlpool.object.position).add(new THREE.Vector3(.2,2.1,0));r.grounded=false;r.verticalVelocity=2;
  h.step();assert.equal(r.paradoxEssence,true,JSON.stringify({player:r.player.toArray(),hazard:whirlpool.object.position.toArray(),grounded:r.grounded,cooldown:whirlpool.cooldown,jar:r.paradoxJarEquipped}));
  assert(JSON.parse(h.saved.get('ion-badges-v1')).unlocked.includes('essence-bearer'));
  const rift=r.stations.find(s=>s.kind==='rift');assert(rift);
  h.useAt(rift.object);
  assert.equal(r.paradoxWorld,true);assert.equal(r.room,32);
  assert.equal(r.paradoxEssence,false);assert.equal(r.crystals.malachite,0);
  assert.equal(r.persHubActive,false);assert(r.roomName.startsWith('*032'));
  r.paradoxJar=true;r.paradoxGrinEncountered=true;
  const savedState={room:200,chaseState:null,ammo:r.ammo,battery:100,
    crystals:{...r.crystals},discovered:[...r.discovered],gunInfusion:null,lightInfusion:null,
    accessKeys:10,maxAmmo:8,paradoxWorld:true,paradoxJar:true,paradoxGrinEncountered:true};
  h.saved.set('ion-checkpoint',JSON.stringify(savedState));r.room=200;r.checkpoint=null;h.act.restartCheckpoint();
  assert.equal(r.room,200);assert.equal(r.paradoxWorld,true);
  assert.equal(r.grinIncoming,true);assert.equal(r.doorUnlocked,false);
  assert(r.stations.some(s=>s.kind==='rift'));
  let progress=JSON.parse(h.saved.get('ion-badges-v1'));
  assert(progress.unlocked.includes('paradox-maker'));
  assert(!progress.unlocked.includes('impossible-return'));
  r.nearest={kind:'door'};h.act.interact();assert.equal(r.doorOpening,false);
});
