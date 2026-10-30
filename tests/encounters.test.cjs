const test=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const ts=require('typescript');const THREE=require('three');
const root=path.resolve(__dirname,'..');

// Runs the actual game closures with a renderer stub: no GPU or browser needed.
function gameHarness(authorized=true,network=null){
  const refs=[];let effect,frame,now=0,randomRoll=.5;const listeners=new Map();const saved=new Map();const cache=new Map();
  const canvas={dataset:{},addEventListener(){},requestPointerLock(){return Promise.resolve();}};
  const react={useRef(value){const ref={current:refs.length===0?canvas:value};refs.push(ref);return ref;},useState(value){return [value,()=>{}];},useEffect(fn){effect=fn;}};
  class Renderer{shadowMap={};setPixelRatio(){}setSize(){}render(){}dispose(){}}
  class Assets{load(){return Promise.resolve();}create(){return null;}dispose(){}}
  const audio={resume(){},pulse(){},creak(){},jumpscare(){},setListener(){},setEntity(){},context:{close(){return Promise.resolve();}}};
  function load(file){
    file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;
    const module={exports:{}};cache.set(file,module);
    const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
    const context={module,exports:module.exports,console,URL,Map,Set,Math:Object.assign(Object.create(Math),{random:()=>randomRoll}),
      crypto:require('node:crypto').webcrypto,TextEncoder,Intl,Date,performance:{now:()=>now},requestAnimationFrame(fn){frame=fn;return 1;},cancelAnimationFrame(){},
      localStorage:{getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},
      window:{location:{href:'https://c-a-studios-viji.github.io/Ion/'},innerWidth:1280,innerHeight:720,devicePixelRatio:1,matchMedia:()=>({matches:true}),addEventListener(name,fn){listeners.set(name,fn);},removeEventListener(){},setTimeout(){return 1;}},
      document:{body:{dataset:{}},pointerLockElement:null,addEventListener(){},removeEventListener(){},exitPointerLock(){}},
      require(id){
        if(id==='./multiplayer'&&network){const actual=load(path.join(root,'app/multiplayer.ts'));return {...actual,PartyLink:network};}
        if(id==='react')return react;if(id==='three')return {...THREE,WebGLRenderer:Renderer};
        if(id==='./modelAssets')return {ModelAssets:Assets,animateModel(){},disposeModel(){}};
        if(id==='./horrorAudio')return {HorrorAudio:class{play(){return false;}}};
        if(id.startsWith('.')){const p=path.resolve(path.dirname(file),id);return load(fs.existsSync(p)?p:p+'.ts');}
        return require(id);
      }};
    vm.runInNewContext(code,context,{filename:file});return module.exports;
  }
  const Component=load(path.join(root,'app/IonGame.tsx')).default;Component();if(authorized)refs[4].current=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());effect();
  const runtime=refs[1].current,act=refs[2].current;runtime.audio=audio;
  const step=(seconds=.05)=>{for(let t=0;t<seconds;t+=.05){now+=50;frame(now);}};
  const enter=(room,chaseState=null)=>{
    runtime.room=room;runtime.checkpoint=null;saved.set('ion-checkpoint',JSON.stringify({room,chaseState,paradoxWorld:runtime.paradoxWorld,ammo:6,battery:100,crystals:{malachite:0,amethyst:0,quartz:0,obsidian:0,citrine:0,fluorite:0,corrupted:0},discovered:[],gunInfusion:null,lightInfusion:null,accessKeys:10,maxAmmo:8}));act.restartCheckpoint();act.confirmBoons();
  };
  const useAt=object=>{
    runtime.player.copy(object.position).add(new THREE.Vector3(0,1.65,0));step(.3);act.interact();
    // Interact through the actual pickaxe animation until a deposit breaks.
    for(let i=0;i<3;i++){
      const pickup=runtime.pickups.find(p=>p.object===object),station=runtime.stations.find(v=>v.object===object);
      if(!(pickup&&(pickup.kind==='crystal'||object.userData.sealedCapsule))&&!(station?.kind==='resonator'&&!station.activated))break;
      step(.3);act.interact();
    }
  };
  return {runtime,act,step,enter,useAt,load,saved,listeners,screen:()=>refs[3].current,setRandom:value=>{randomRoll=value;}};
}

test('two Fluorite per Infusionsmith batch, up to four rarer crawlers, 250 persistent badges and three save slots',async()=>{
  const h=gameHarness();await Promise.resolve();await Promise.resolve();
  const progression=h.load(path.join(root,'app/progression.ts'));
  assert.equal(progression.BADGES.length,250);
  assert.equal(new Set(progression.BADGES.map(b=>b.id)).size,250);
  assert.equal(progression.TUTORIALLESS_BADGE_COUNT,100);
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
  h.act.startNewSlot(0);h.act.start(true);h.act.confirmBoons();h.act.saveRun();
  const slots=progression.readRunSlots({getItem:key=>h.saved.get(key)??null});
  assert.equal(slots.length,3);assert.equal(slots[0].state.room,1);assert.equal(slots[1],null);
  const progress=JSON.parse(h.saved.get('ion-badges-v1'));assert(progress.unlocked.includes('saved-run'));
  h.runtime.crystals.malachite=7;h.runtime.ammo=3;
  h.act.saveRun();h.act.startNewSlot(1);h.act.start(true);h.act.confirmBoons();
  assert.equal(h.runtime.crystals.malachite,0);
  h.act.loadSlot(0);h.act.confirmBoons();
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
    assert.equal(r.chaseRoom,true);assert.equal(r.requiredResonators,4);assert.equal(r.pickups.filter(p=>p.kind==='specimen').length,3);
    assert(r.pickups.filter(p=>p.kind==='specimen').every(p=>p.object.userData.sealedCapsule));
    const stations=r.stations.filter(s=>s.kind==='resonator');assert.equal(stations.length,4);
    assert(stations.every(s=>s.object.userData.sealedResonator));
    for(const p of [...stations,...r.pickups.filter(p=>p.kind==='specimen'||p.mandatory)]){
      const box=new THREE.Box3().setFromCenterAndSize(p.object.position.clone().setY(1.2),new THREE.Vector3(.68,1.5,.68));
      assert(!r.obstacles.some(o=>o.intersectsBox(box)),`blocked task in room ${room}`);
    }
    r.nearest={kind:'door'};h.act.interact();assert.equal(r.doorUnlocked,false);assert.equal(r.accessKeys,10);
    for(const p of [...r.pickups.filter(p=>p.kind==='specimen')])h.useAt(p.object);
    h.useAt(r.stations.find(s=>s.kind==='cabinet').object);
    assert.equal(r.noiseCount,4);
    const quartz=r.pickups.find(p=>p.kind==='crystal'&&p.crystal==='quartz');assert(quartz);h.useAt(quartz.object);
    h.useAt(r.stations.find(s=>s.kind==='noiseCore').object);
    assert.equal(r.noiseCount,5);assert.equal(r.noiseActive,false);assert.equal(r.doorUnlocked,false);
    for(const s of stations)h.useAt(s.object);
    for(const p of [...r.pickups.filter(p=>p.mandatory)])h.useAt(p.object);
    assert.equal(r.activeResonators,4,`resonators in ${room}`);assert.equal(r.doorUnlocked,true,`door in ${room}`);assert.equal(r.doorOpening,true,`opening in ${room}`);
  }
});

test('Noise expiration is fatal even in a trapdoor; collection stops the deadline',async()=>{
  const h=gameHarness();await Promise.resolve();await Promise.resolve();h.enter(25);
  const r=h.runtime;r.enemies.forEach(e=>e.alive=false);r.hiding=true;r.noiseTime=.01;r.wardCharges=2;r.basdinos=2;h.step();
  assert.equal(r.dead,true);assert.equal(r.deathKind,'noise');assert(r.scareActor);assert.equal(r.wardCharges,2);
  h.enter(25);r.enemies.forEach(e=>e.alive=false);
  for(const p of [...r.pickups.filter(p=>p.kind==='specimen')])h.useAt(p.object);
  h.useAt(r.stations.find(s=>s.kind==='cabinet').object);
  h.useAt(r.pickups.find(p=>p.kind==='crystal'&&p.crystal==='quartz').object);
  h.useAt(r.stations.find(s=>s.kind==='noiseCore').object);
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
  h.act.start(true);h.act.confirmBoons();assert.equal(h.runtime.room,1);h.act.restartCheckpoint();h.act.confirmBoons();assert.equal(h.runtime.room,1);
});

test('Pers tear, prime-door Gold, Ascendidox and the 20-door shortcut are playable',async()=>{
  const h=gameHarness();await Promise.resolve();await Promise.resolve();
  const rules=h.load(path.join(root,'app/paradox.ts'));
  assert.equal(rules.paradoxEncounter(25,.99),'grin');
  assert.equal(rules.paradoxEncounter(50,0),'grin');
  assert.equal(rules.paradoxEncounter(26,.02999),'blob');
  assert.equal(rules.paradoxEncounter(26,.03),null);
  assert.equal(rules.isPrimeDoor(2),true);assert.equal(rules.isPrimeDoor(97),true);
  assert.equal(rules.isPrimeDoor(1),false);assert.equal(rules.isPrimeDoor(99),false);
  assert.equal(rules.goldBarSpawns(97,.013999),true);assert.equal(rules.goldBarSpawns(97,.014),false);
  assert.equal(rules.goldBarSpawns(99,0),false);
  h.enter(32);let r=h.runtime;
  assert(r.persActor?.visible);
  r.player.set(0,1.65,1.8);r.yaw=0;r.pitch=0;h.step();r.camera.updateMatrixWorld(true);r.roomGroup.updateMatrixWorld(true);
  const debugRay=new THREE.Raycaster();debugRay.setFromCamera(new THREE.Vector2(),r.camera);const persTargets=[];r.persActor.traverse(child=>{if(child.isMesh)persTargets.push(child);});
  assert(debugRay.intersectObjects(persTargets,false).length>0,JSON.stringify({camera:r.camera.position.toArray(),direction:debugRay.ray.direction.toArray(),pers:new THREE.Box3().setFromObject(r.persActor).getCenter(new THREE.Vector3()).toArray(),meshes:persTargets.length}));
  h.act.fire();assert.equal(r.paradoxRift,true);
  assert.equal(r.stations.some(s=>s.kind==='pershub'),false);
  const rift=r.stations.find(s=>s.kind==='rift');assert(rift);
  h.useAt(rift.object);
  assert.equal(r.paradoxWorld,true);assert.equal(r.room,1);assert(r.roomName.startsWith('*001'));
  let progress=JSON.parse(h.saved.get('ion-badges-v1'));assert(progress.unlocked.includes('paradox-echo'));
  const goldState={room:2,chaseState:null,ammo:r.ammo,battery:100,
    crystals:{...r.crystals},discovered:[...r.discovered],gunInfusion:null,lightInfusion:null,
    accessKeys:10,maxAmmo:8,paradoxWorld:true,goldBarPresent:true};
  h.saved.set('ion-checkpoint',JSON.stringify(goldState));r.room=2;r.checkpoint=null;h.act.restartCheckpoint();h.act.confirmBoons();
  const gold=r.pickups.find(p=>p.kind==='gold');assert(gold);h.useAt(gold.object);
  assert.equal(r.ascendedWorld,true);assert.equal(r.paradoxWorld,false);assert.equal(r.room,1);assert.equal(r.ascendedDoor,1);
  progress=JSON.parse(h.saved.get('ion-badges-v1'));
  assert(progress.unlocked.includes('gold-ascent'));assert(progress.unlocked.includes('ascendidox'));
  const ascendedEnd={...goldState,room:20,paradoxWorld:false,ascendedWorld:true,ascendedDoor:20,ascendedOriginRoom:2,ascendedFromParadox:true,goldBarPresent:false};
  h.saved.set('ion-checkpoint',JSON.stringify(ascendedEnd));r.room=20;r.checkpoint=null;h.act.restartCheckpoint();h.act.confirmBoons();
  assert.equal(r.ascendedWorld,true);r.transition=.01;h.step(.1);
  assert.equal(r.ascendedWorld,false);assert.equal(r.room,200);
  progress=JSON.parse(h.saved.get('ion-badges-v1'));assert(progress.unlocked.includes('paradox-conqueror'));
  const catalog=h.load(path.join(root,'app/progression.ts')).BADGES;
  const progression=h.load(path.join(root,'app/progression.ts'));
  assert.equal(catalog.length,250);assert.equal(catalog.find(b=>b.id==='ascendidox').tutorial,undefined);
  assert.equal(catalog.find(b=>b.id==='ascendidox').rarity,'xtraultra');
  const codeProgress=progression.emptyBadgeProgress();
  assert(progression.awardBadges(codeProgress,'multiplayer','triple-code').some(b=>b.id==='triple-signal'));
});

test('*+* Win requires cleared Ascended 20, Pers, the Paradox Blob and the neon drop',async()=>{
  const h=gameHarness();await Promise.resolve();await Promise.resolve();const r=h.runtime;
  const state={room:20,chaseState:null,ammo:6,battery:100,
    crystals:{malachite:0,amethyst:0,quartz:0,obsidian:0,citrine:0,fluorite:0,corrupted:0},
    discovered:[],gunInfusion:null,lightInfusion:null,accessKeys:10,maxAmmo:8,
    paradoxWorld:false,ascendedWorld:true,ascendedDoor:20,ascendedOriginRoom:2,ascendedFromParadox:true,goldBarPresent:false};
  h.saved.set('ion-checkpoint',JSON.stringify(state));r.room=20;r.checkpoint=null;h.act.restartCheckpoint();h.act.confirmBoons();
  r.noiseActive=false;r.doorUnlocked=true;r.nearest={kind:'door'};h.act.interact();assert.equal(r.ascendedCleared,true);h.step(.1);
  assert(r.doorPers?.visible);
  r.roomGroup.updateMatrixWorld(true);const persCenter=new THREE.Box3().setFromObject(r.doorPers).getCenter(new THREE.Vector3());
  r.camera.position.copy(persCenter).add(new THREE.Vector3(0,.1,4));r.camera.lookAt(persCenter);r.camera.updateMatrixWorld(true);
  h.act.fire();assert.equal(r.winQuestArmed,true);assert.equal(r.paradoxRift,true);
  const rift=r.stations.find(s=>s.kind==='rift');assert(rift);h.useAt(rift.object);
  assert.equal(r.paradoxWorld,true);assert.equal(r.winQuestBlob,true);assert.equal(r.room,1);
  const blob=r.enemies.find(e=>e.kind==='blob'&&e.alive);assert(blob);r.roomGroup.updateMatrixWorld(true);
  const blobCenter=new THREE.Box3().setFromObject(blob.object).getCenter(new THREE.Vector3());
  r.camera.position.copy(blobCenter).add(new THREE.Vector3(0,.2,4));r.camera.lookAt(blobCenter);r.camera.updateMatrixWorld(true);
  h.act.fire();assert.equal(blob.alive,false);const medal=r.pickups.find(p=>p.kind==='neonBadge');assert(medal);
  h.useAt(medal.object);const progress=JSON.parse(h.saved.get('ion-badges-v1'));
  assert(progress.unlocked.includes('win'));assert.equal(r.winQuestArmed,false);assert.equal(r.winBadgeSpawned,false);
});

test('legacy codes cannot grant badges and permission gates direct selection',async()=>{
 const h=gameHarness(false);await Promise.resolve();await Promise.resolve();
 await h.act.joinParty('XXOOP');await h.act.joinParty('1DEV1');
 h.act.grantBadge('room-2');h.enter(10);
 assert.equal(h.saved.get('ion-badges-v1'),undefined);
 const authorized=gameHarness();await Promise.resolve();await Promise.resolve();
 authorized.act.grantBadge('win');
 assert(JSON.parse(authorized.saved.get('ion-badges-v1')).unlocked.includes('win'));
 const p=h.load(path.join(root,'app/progression.ts'));
 assert.equal(p.badgeFromCode,undefined);assert.equal(p.badgeCode,undefined);
 assert.equal(p.BADGES.filter(b=>b.event==='boon').length,115);
});

test('Pers Hub guarantees Citrine and Obsidian specimens',async()=>{
  const h=gameHarness();await Promise.resolve();await Promise.resolve();h.enter(32);
  const crystals=h.runtime.pickups.filter(p=>p.kind==='crystal').map(p=>p.crystal);
  assert(crystals.includes('citrine'));assert(crystals.includes('obsidian'));
});

test('cabinet loot is collected once, persists, and bottles scoop blood and four Sáng vials are required for a fifty-door skip',async()=>{
 const h=gameHarness();await Promise.resolve();await Promise.resolve();h.act.startNewSlot(0);h.enter(10);
 const r=h.runtime;r.enemies.forEach(e=>e.alive=false);
 const cabinet=r.stations.find(s=>s.kind==='cabinet');assert(cabinet);
 cabinet.object.userData.loot={bottle:1,pearl:1,resonationShield:1,goldBar:0};
 h.useAt(cabinet.object);assert.equal(r.inventory.bottle,1);assert.equal(r.inventory.pearl,1);
 r.nearest={kind:'station',index:r.stations.indexOf(cabinet)};h.act.interact();assert.equal(r.inventory.bottle,1);
 h.act.saveRun();assert.equal(h.load(path.join(root,'app/progression.ts')).readRunSlots({getItem:k=>h.saved.get(k)??null})[0].state.openedCabinets.length,1);
 const pool=r.stations.find(s=>s.kind==='blood');assert(pool);r.player.copy(pool.object.position).setY(1.65);
 h.act.useItem('bottle');assert.equal(r.inventory.bottle,0);assert.equal(r.inventory.sang,1);
 h.act.useItem('sang');assert.equal(r.room,10);assert.equal(r.inventory.sang,1);r.inventory.sang=4;h.act.useItem('sang');assert.equal(r.room,60);assert.equal(r.inventory.sang,0);
 r.inventory.sang=4;r.paradoxWorld=true;h.act.useItem('sang');assert.equal(r.room,110);assert.equal(r.paradoxWorld,true);
 r.ascendedWorld=true;r.ascendedDoor=3;r.ascendedFromParadox=false;r.ascendedOriginRoom=10;r.paradoxWorld=false;r.inventory.sang=4;
 h.act.useItem('sang');assert.equal(r.ascendedWorld,false);assert.equal(r.room,30);
});

test('shielded resonators require reusable protection and their room cabinet supplies it',async()=>{
 const h=gameHarness();await Promise.resolve();await Promise.resolve();
 let shielded;
 for(let room=7;room<200&&!shielded;room+=7){h.enter(room);shielded=h.runtime.stations.find(s=>s.needsShield);}
 assert(shielded);const r=h.runtime;r.enemies.forEach(e=>e.alive=false);
 r.nearest={kind:'station',index:r.stations.indexOf(shielded)};h.act.interact();assert.equal(shielded.activated,false);
 const cabinet=r.stations.find(s=>s.kind==='cabinet');assert.equal(cabinet.object.userData.loot.resonationShield,1);
 h.useAt(cabinet.object);h.useAt(shielded.object);
 assert.equal(shielded.activated,true);assert.equal(r.inventory.resonationShield,1);
});

 test('daily codes verify digest, date, invalid input and midnight expiry',async()=>{
 const h=gameHarness();const permission=h.load(path.join(root,'app/badgePermission.ts'));
 const code='A1'.repeat(16),crypto=require('node:crypto');
 const record={date:'2026-10-26',sha256:crypto.createHash('sha256').update(code).digest('hex')};
 assert.equal(await permission.verifyPermission(code.toLowerCase(),record,new Date('2026-10-26T12:00:00Z')),true);
 assert.equal(await permission.verifyPermission('B2'.repeat(16),record,new Date('2026-10-26T12:00:00Z')),false);
 assert.equal(await permission.verifyPermission(code,record,new Date('2026-10-26T18:30:00Z')),false);
 assert.equal(await permission.verifyPermission('ION001',record,new Date('2026-10-26T12:00:00Z')),false);
 });
 test('Boons persist, Infused unlocks records, Archive summons Boonie, Resonator is optional',async()=>{
 const h=gameHarness();await Promise.resolve();await Promise.resolve();
 h.act.startNewSlot(0);h.act.toggleBoon('infused');h.act.toggleBoon('sugar');h.act.start(true);h.act.confirmBoons();
 const r=h.runtime;assert.equal(r.discovered.size,7);assert(r.boons.includes('sugar'));
 assert.equal(r.pickups.filter(p=>p.kind==='candy').length,4);h.act.saveRun();h.act.loadSlot(0);h.act.confirmBoons();assert(r.boons.includes('infused'));
 h.enter(17);const THREE=require('three');const archive={kind:'archive',object:new THREE.Group()};r.stations.push(archive);
 r.discovered=new Set(['malachite','amethyst','quartz','obsidian','citrine','fluorite','corrupted']);
 h.act.completeArchive();assert.equal(r.boonieMet,true);assert(r.enemies.some(e=>e.kind==='boonie'));
 const rainbow={kind:'rainbow',object:new THREE.Group()};r.stations.push(rainbow);assert.equal(r.resonatorWorld,false);
 r.nearest={kind:'station',index:r.stations.indexOf(rainbow)};h.act.interact();
 assert.equal(r.room,300);assert.equal(r.resonatorWorld,true);assert(r.platforms.length>20);assert.equal(r.pickups.filter(p=>p.kind==='specimen').length,5);
 assert(r.enemies.some(e=>e.kind==='blob'));assert(r.enemies.some(e=>e.kind==='haidini'));
 h.act.saveRun();h.act.loadSlot(0);h.act.confirmBoons();assert.equal(r.room,300);assert.equal(r.resonatorWorld,true);
 });
 test('Paradox excludes ambient facility mobs and ammo rolls at fifty percent',async()=>{
 const h=gameHarness();await Promise.resolve();await Promise.resolve();const r=h.runtime;
 for(const room of [24,70,120,199]){r.paradoxWorld=true;h.enter(room);assert.equal(r.noiseActive,false);assert(r.enemies.every(e=>['entity','blob'].includes(e.kind)));}
 const source=fs.readFileSync(path.join(root,'app/IonGame.tsx'),'utf8');assert(source.includes('if (rand() < 0.50) makePickup("ammo"'));
 const rules=h.load(path.join(root,'app/paradox.ts'));assert.equal(rules.paradoxEncounter(26,.029999),'blob');assert.equal(rules.paradoxEncounter(26,.03),null);
 });

test('new and resumed runs wait on Boon confirmation; supplies apply once and I toggles inventory',async()=>{
 const h=gameHarness();await Promise.resolve();await Promise.resolve();const r=h.runtime;
 const catalog=h.load(path.join(root,'app/boons.ts')).BOONS;
 assert.equal(catalog.length,42);assert.equal(new Set(catalog.map(b=>b.id)).size,42);
 h.act.startNewSlot(0);assert.equal(h.screen(),'boons');assert.equal(r.running,false);
 for(const id of ['reserve','pockets','wardborn','locksmith','infused','stocked','recharge'])h.act.toggleBoon(id);
 h.act.confirmBoons();assert.equal(h.screen(),null);assert.equal(r.running,true);
 assert.equal(r.maxAmmo,16);assert.equal(r.crystals.quartz,3);assert.equal(r.wardCharges,3);assert.equal(r.accessKeys,3);assert.equal(r.discovered.size,7);
 h.act.saveRun();h.act.loadSlot(0);assert.equal(h.screen(),'boons');assert.equal(r.running,false);
 h.act.confirmBoons();assert.equal(r.maxAmmo,16);assert.equal(r.crystals.quartz,3);assert.equal(r.wardCharges,3);
 const key=h.listeners.get('keydown');assert(key);const event={code:'KeyI',repeat:false,preventDefault(){},target:{tagName:'CANVAS'}};
 key(event);assert.equal(h.screen(),'inventory');assert.equal(r.running,false);
 key(event);assert.equal(h.screen(),null);assert.equal(r.running,true);
 key({...event,target:{tagName:'INPUT'}});assert.equal(h.screen(),null);
 r.ammo=0;r.battery=10;r.transition=.01;h.step(.1);assert.equal(r.room,2);assert.equal(r.ammo,3);assert(r.battery>29);
});

test('Void creates five real passages, accepts mixed crystals, persists and enforces its twenty-door deadline',async()=>{
 const h=gameHarness();await Promise.resolve();await Promise.resolve();h.act.startNewSlot(0);h.act.confirmBoons();h.enter(4);
 const r=h.runtime;h.setRandom(.01);r.transition=.01;h.step(.1);h.setRandom(.5);
 assert.equal(r.room,5);assert(r.encounters.voidDebt);assert.equal(r.encounters.voidDebt.doorsLeft,20);
 assert.equal(r.stations.filter(s=>s.kind==='voiddoor').length,5);assert(r.enemies.some(e=>e.kind==='void'));
 r.crystals.malachite=20;r.crystals.quartz=10;const ammo=r.ammo;h.act.fire();assert.equal(r.ammo,ammo);
 h.act.offerVoid();assert.equal(r.encounters.voidDebt.paid,30);assert.equal(r.crystals.quartz,0);
 h.act.saveRun();h.act.loadSlot(0);h.act.confirmBoons();assert.equal(r.encounters.voidDebt.paid,30);assert.equal(r.stations.filter(s=>s.kind==='voiddoor').length,5);
 const door=r.stations.find(s=>s.kind==='voiddoor');r.nearest={kind:'station',index:r.stations.indexOf(door)};h.act.interact();h.step(.6);
 assert.equal(r.room,6);assert.equal(r.encounters.voidDebt.doorsLeft,19);
 r.crystals.amethyst=22;h.act.offerVoid();assert.equal(r.encounters.voidDebt,null);assert.equal(r.crystals.amethyst,2);assert.equal(r.stations.filter(s=>s.kind==='voiddoor').length,0);
 r.encounters.voidDebt={paid:0,doorsLeft:1,lastRoom:r.room};r.encounters.voidSeen=true;r.wardCharges=5;r.basdinos=2;r.transition=.01;h.step(.1);assert.equal(r.dead,true);assert.equal(r.deathKind,'void');
});

test('RamYraM remembers one-to-five digits, quizzes at a future prime and applies only wrong-answer penalties',async()=>{
 const h=gameHarness();await Promise.resolve();await Promise.resolve();h.act.startNewSlot(0);h.act.confirmBoons();h.enter(4);
 const r=h.runtime;h.setRandom(.06);r.transition=.01;h.step(.1);h.setRandom(.5);
 assert.equal(h.screen(),'memory');assert.equal(r.encounters.memory.phase,'reveal');assert.match(r.encounters.memory.number,/^\d{1,5}$/);
 const trial={...r.encounters.memory};assert(h.load(path.join(root,'app/paradox.ts')).isPrimeDoor(trial.quizRoom));
 assert.equal(new Set(trial.choices).size,4);assert(trial.choices.includes(trial.number));
 h.act.rememberNumber();assert.equal(r.running,true);assert.equal(r.encounters.memory.phase,'waiting');h.act.saveRun();h.act.loadSlot(0);h.act.confirmBoons();assert.equal(r.encounters.memory.number,trial.number);
 for(let i=0;r.room<trial.quizRoom&&i<20;i++){r.transition=.01;h.step(.1);}
 assert.equal(h.screen(),'memory');assert.equal(r.encounters.memory.phase,'quiz');assert(h.load(path.join(root,'app/paradox.ts')).isPrimeDoor(r.room));
 const before=r.boons.length;h.act.answerMemory(trial.choices.find(c=>c!==trial.number));assert.equal(r.encounters.memory,null);assert.equal(r.boons.length,before+1);assert(h.load(path.join(root,'app/boons.ts')).BOONS.find(b=>b.id===r.boons.at(-1)).negative);
 r.encounters.memory={...trial,phase:'quiz'};h.act.answerMemory(trial.number);assert.equal(r.boons.length,before+1);assert.equal(r.encounters.memory,null);
 const events=h.load(path.join(root,'app/entityEvents.ts'));
 for(const roll of [0,.1,.5,.999999]){const t=events.createMemoryTrial(40,()=>roll);assert.match(t.number,/^\d{1,5}$/);assert.equal(new Set(t.choices).size,4);assert(t.quizRoom>40);}
});

test('LORE route offers the blood vial, saves ReDox, reaches Ascended 50, reveals ten nightmares and awards + badge',async()=>{
 const h=gameHarness();await Promise.resolve();await Promise.resolve();h.act.startNewSlot(0);h.act.confirmBoons();h.enter(17);
 const r=h.runtime,p=h.load(path.join(root,'app/progression.ts'));
 const lore=h.load(path.join(root,'app/loreRoute.ts'));
 assert.equal(lore.LORE_NIGHTMARES.length,10);
 assert.equal(lore.serpAdvice('void',16,7,'dormant').percent,8);
 assert.match(lore.serpAdvice('void',16,7,'dormant').next,/Offer carried crystals/);
 const archive=r.stations.find(s=>s.kind==='archive')||{kind:'archive',object:new THREE.Group()};r.stations.push(archive);
 r.inventory.sang=1;const offer={kind:'lore',object:new THREE.Group()};r.stations.push(offer);r.nearest={kind:'station',index:r.stations.indexOf(offer)};h.act.interact();
 assert.equal(r.inventory.sang,0);assert.equal(r.loreRoute.phase,'armed');
 const rainbow={kind:'rainbow',object:new THREE.Group()};r.stations.push(rainbow);r.nearest={kind:'station',index:r.stations.indexOf(rainbow)};h.act.interact();
 assert.equal(r.room,300);assert.equal(r.loreRoute.phase,'redox');assert.equal(r.resonatorWorld,false);
 h.act.saveRun();h.act.loadSlot(0);h.act.confirmBoons();assert.equal(r.room,300);assert.equal(r.loreRoute.phase,'redox');
 const slot=JSON.parse(h.saved.get('ion-saves-v1'))[0].state;
 h.saved.set('ion-checkpoint',JSON.stringify({...slot,room:400,loreRoute:{phase:'redox',door:400,scene:0}}));r.room=400;r.checkpoint=null;h.act.restartCheckpoint();h.act.confirmBoons();
 r.transition=.01;h.step(.1);assert.equal(r.loreRoute.phase,'ascended');assert.equal(r.room,1);
 h.saved.set('ion-checkpoint',JSON.stringify({...slot,room:50,ascendedWorld:true,ascendedDoor:50,loreRoute:{phase:'ascended',door:50,scene:0}}));r.room=50;r.checkpoint=null;h.act.restartCheckpoint();h.act.confirmBoons();
 r.transition=.01;h.step(.1);assert.equal(r.room,201);assert.equal(r.loreRoute.phase,'reveal');assert.equal(h.screen(),'lore');
 for(let i=0;i<10;i++)h.act.nextLoreScene();assert.equal(r.loreRoute.phase,'mega');assert.equal(r.room,300);assert.equal(r.resonatorWorld,true);
 r.enemies.forEach(e=>e.alive=false);r.noiseActive=false;r.noiseCount=5;r.doorUnlocked=true;r.nearest={kind:'door'};h.act.interact();r.transition=.01;h.step(.1);
 assert.equal(r.loreRoute.phase,'complete');assert(JSON.parse(h.saved.get('ion-badges-v1')).unlocked.includes('ten-souls-one-heartbeat'));
 assert.equal(p.BADGES.find(b=>b.id==='ten-souls-one-heartbeat').rarity,'plus');
});


test('all room layouts are reachable, deterministic and respect special-room reservations',()=>{
 const h=gameHarness(),types=h.load(path.join(root,'app/roomTypes.ts'));
 const seen=new Set();
 for(let room=5;room<200;room++){
  const type=types.roomTypeFor(room);seen.add(type);
  assert.equal(types.roomTypeFor(room,true),'standard');
  assert.equal(types.roomTypeFor(room),type);
 }
 types.ROOM_TYPES.forEach(type=>assert(seen.has(type)));
 for(const type of ['duplex','multifloor','basement','collapsed']){
  const p=types.floorProfile(type,44);assert.equal(p[0][1],0);assert.equal(p.at(-1)[1],0);
  for(let z=-22;z<22;z+=.1)assert(Math.abs(types.roomFloor(type,44,z+.1)-types.roomFloor(type,44,z))<.2);
 }
 for(const type of types.ROOM_TYPES){
  const room=Array.from({length:190},(_,i)=>i+5).find(r=>types.roomTypeFor(r)===type&&r%25!==0);
  h.enter(room);assert.equal(h.runtime.layout,type);
  assert(h.runtime.stations.some(s=>s.kind==='cabinet'));
  h.runtime.pickups.forEach(p=>assert(Number.isFinite(p.object.position.y)));
 }
});

test('INVERSION reverses keys, seals anchors against keys, resumes and awards Ultra only on escape',async()=>{
 const h=gameHarness();await Promise.resolve();await Promise.resolve();h.act.startNewSlot(0);h.act.confirmBoons();h.enter(17);const r=h.runtime;
 assert.equal(r.layout,'inversion');assert.equal(r.requiredResonators,3);assert.equal(r.noiseActive,false);
 const z=r.player.z;r.keysDown.add('KeyW');h.step(.3);r.keysDown.clear();assert(r.player.z>z);
 const z2=r.player.z;r.keysDown.add('KeyS');h.step(.3);r.keysDown.clear();assert(r.player.z<z2);
 r.player.set(0,1.65,-r.roomLength/2+1.5);h.step();h.act.interact();assert.equal(r.doorOpening,false);
 const anchors=r.stations.filter(s=>s.kind==='resonator');assert.equal(anchors.length,3);
 anchors.forEach(s=>h.useAt(s.object));assert.equal(r.activeResonators,3);assert.equal(r.doorUnlocked,true);
 h.act.saveRun();const save=JSON.parse(h.saved.get('ion-saves-v1'))[0].state;
 assert(Number.isFinite(save.inversionTime));h.act.loadSlot(0);h.act.confirmBoons();assert.equal(r.activeResonators,3);assert.equal(r.layout,'inversion');
 const badge=h.load(path.join(root,'app/progression.ts')).BADGES.find(b=>b.id==='layout-inversion');assert.equal(badge.rarity,'ultra');
 r.inversionActor.position.set(0,0,20);r.doorProgress=1;r.player.set(0,1.65,-r.roomLength/2-1);h.step(2);
 const progress=JSON.parse(h.saved.get('ion-badges-v1'));assert(progress.unlocked.includes('layout-inversion'));
});

test('badge migration preserves retired awards and reduces display to 250 unique records',()=>{
 const h=gameHarness(),p=h.load(path.join(root,'app/progression.ts'));
 const trial=p.BADGES.find(b=>b.id.startsWith('boon-')&&b.id.endsWith('-5'));
 const old=trial.id.replace(/-5$/,'-25');
 const result=p.migrateBadgeProgress({unlocked:['room-2',old,'room-2'],counts:{room:12},detailCounts:{}});
 assert.equal(result.unlocked.length,2);assert(result.unlocked.includes(trial.id));assert(result.retiredUnlocked.includes(old));assert.equal(result.counts.room,12);
 assert.equal(p.BADGES.length,250);assert.equal(p.TUTORIALLESS_BADGE_COUNT,100);
});


test('terraced floors support walking and INVERSION strikes respect cover',async()=>{
 const h=gameHarness();await Promise.resolve();await Promise.resolve();
 const types=h.load(path.join(root,'app/roomTypes.ts'));
 for(const type of ['duplex','multifloor','basement','collapsed']){
  const room=Array.from({length:180},(_,i)=>i+5).find(r=>types.roomTypeFor(r)===type);
  h.enter(room);const r=h.runtime;r.enemies=[];r.hazards=[];r.noiseActive=false;r.grinIncoming=false;
  r.keysDown.add('KeyW');let high=-99,low=99;
  for(let i=0;i<240;i++){h.step(.05);high=Math.max(high,r.player.y);low=Math.min(low,r.player.y);assert(Math.abs(r.player.y-1.65-types.roomFloor(type,r.roomLength,r.player.z))<.65);}
  r.keysDown.clear();assert(high-low>1.5);
 }
 h.enter(17);h.runtime.player.set(0,1.65,15);h.runtime.spawnGrace=0;h.runtime.inversionTime=7.95;h.step(.1);assert.equal(h.runtime.dead,true);
 h.enter(17);h.runtime.player.set(3,1.65,11);h.runtime.spawnGrace=0;h.runtime.inversionTime=7.95;h.step(.1);assert.equal(h.runtime.dead,false);
});

test('room geometry has a traversable route to the exit and each required objective',()=>{
 const h=gameHarness(),types=h.load(path.join(root,'app/roomTypes.ts'));
 for(const type of types.ROOM_TYPES){
  const room=Array.from({length:190},(_,i)=>i+5).find(r=>types.roomTypeFor(r)===type);h.enter(room);const r=h.runtime;
  const spacing=.5,w=Math.floor((r.roomWidth-1.5)/spacing),l=Math.floor((r.roomLength-1.5)/spacing);
  const position=(x,z)=>new THREE.Vector3(-r.roomWidth/2+.75+x*spacing,1.2+types.roomFloor(type,r.roomLength,-r.roomLength/2+.75+z*spacing),-r.roomLength/2+.75+z*spacing);
  const start=[Math.round((r.player.x+r.roomWidth/2-.75)/spacing),Math.round((r.player.z+r.roomLength/2-.75)/spacing)];
  const seen=new Set(),queue=[start],reachable=[];
  for(let i=0;i<queue.length;i++){
   const [x,z]=queue[i],id=x+':'+z;if(x<0||z<0||x>w||z>l||seen.has(id))continue;seen.add(id);
   const p=position(x,z),box=new THREE.Box3().setFromCenterAndSize(p,new THREE.Vector3(.68,1.5,.68));if(r.obstacles.some(b=>b.intersectsBox(box)))continue;
   reachable.push(p);queue.push([x+1,z],[x-1,z],[x,z+1],[x,z-1]);
  }
  assert(reachable.some(p=>Math.abs(p.x)<1&&p.z< -r.roomLength/2+2),type+' exit blocked');
  const objectives=[...r.pickups.filter(p=>p.mandatory||p.kind==='specimen').map(p=>p.object),...r.stations.filter(s=>s.kind==='resonator'||s.kind==='noiseCore'||s.kind==='cabinet').map(s=>s.object)];
  for(const object of objectives)assert(reachable.some(p=>p.distanceTo(object.position)<2.25),type+' objective blocked at '+object.position.toArray());
 }
});


test('cave floors have dense uneven cosmetic rocks without adding movement collisions',async()=>{
 const h=gameHarness();await Promise.resolve();await Promise.resolve();
 const {addRockyCaveFloor}=h.load(path.join(root,'app/caveFloor.ts'));
 const types=h.load(path.join(root,'app/roomTypes.ts'));
 const group=new THREE.Group(),clear=[new THREE.Vector3(4,0,3)];
 const detail=addRockyCaveFloor(group,24,44,'standard',12,clear);
 assert.equal(detail.userData.cosmeticOnly,true);
 const skin=detail.getObjectByName('uneven-cave-skin');let low=99,high=-99;
 for(let i=0;i<skin.geometry.attributes.position.count;i++){const y=skin.geometry.attributes.position.getY(i);low=Math.min(low,y);high=Math.max(high,y);}
 assert(high-low>.45);
 const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();let rocks=0;
 detail.children.filter(o=>o instanceof THREE.InstancedMesh).forEach(o=>{
  rocks+=o.count;
  for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);matrix.decompose(position,rotation,scale);assert(position.distanceTo(clear[0])>1.15);}
 });assert(rocks>250);
 const obstacles=h.runtime.obstacles.length;
 addRockyCaveFloor(h.runtime.roomGroup,18,25,'standard',1,[]);
 assert.equal(h.runtime.obstacles.length,obstacles);
 h.enter(2);assert(h.runtime.roomGroup.getObjectByName('cave-floor-decoration'));
 h.runtime.enemies=[];h.runtime.hazards=[];h.runtime.grinIncoming=false;h.runtime.noiseActive=false;
 h.runtime.keysDown.add('KeyW');
 for(let i=0;i<80;i++){h.step(.05);assert(Math.abs(h.runtime.player.y-(types.roomFloor(h.runtime.layout,h.runtime.roomLength,h.runtime.player.z)+1.65))<.001);}
});

test('pickaxe strikes mine deposits without ammo, Sáng upgrades it, and partial mining survives saves',async()=>{
 const h=gameHarness();await Promise.resolve();await Promise.resolve();h.act.startNewSlot(0);h.act.confirmBoons();h.enter(2);const r=h.runtime;r.enemies=[];r.hazards=[];r.noiseActive=false;
 const p=r.pickups.find(p=>p.kind==='crystal');assert(p);const count=r.crystals[p.crystal],ammo=r.ammo;
 r.player.copy(p.object.position).add(new THREE.Vector3(0,1.65,0));h.step(.3);r.nearest={kind:'pickup',index:r.pickups.indexOf(p)};h.act.fire();
 assert.equal(r.crystals[p.crystal],count);assert.equal(p.object.userData.mineHits,1);assert.equal(r.ammo,ammo);
 h.act.saveRun();h.act.loadSlot(0);h.act.confirmBoons();const restored=r.pickups.find(v=>v.object.userData.pickupId===p.object.userData.pickupId);assert.equal(restored.object.userData.mineHits,1);
 h.useAt(restored.object);assert.equal(r.crystals[p.crystal],count+1);assert.equal(r.ammo,ammo);
 r.inventory.sang=2;h.act.upgradePickaxe();h.act.upgradePickaxe();assert.equal(r.pickaxeLevel,2);assert.equal(r.inventory.sang,0);h.act.upgradePickaxe();assert.equal(r.pickaxeLevel,2);
 const other=r.pickups.find(p=>p.kind==='crystal');assert(other);r.player.copy(other.object.position).add(new THREE.Vector3(0,1.65,0));h.step(.3);r.nearest={kind:'pickup',index:r.pickups.indexOf(other)};h.act.fire();assert(!r.pickups.includes(other));assert.equal(r.ammo,ammo);
 h.act.saveRun();h.act.loadSlot(0);h.act.confirmBoons();assert.equal(r.pickaxeLevel,2);
});

test('each Ascended door supplies one shard, rare glue repairs it once, and four vials cap at the route exit',async()=>{
 const h=gameHarness();await Promise.resolve();await Promise.resolve();h.enter(10);const r=h.runtime;r.inventory.goldBar=1;h.act.useItem('goldBar');
 assert(r.ascendedWorld);assert.equal(r.pickups.filter(p=>p.kind==='glassShard').length,1);
 h.useAt(r.pickups.find(p=>p.kind==='glassShard').object);assert.equal(r.inventory.glassShard,1);
 h.act.repairJar();assert.equal(r.inventory.bottle,0);r.inventory.glue=1;h.act.repairJar();assert.equal(r.inventory.glue,0);assert.equal(r.inventory.glassShard,0);assert.equal(r.inventory.bottle,1);h.act.repairJar();assert.equal(r.inventory.bottle,1);
 r.enemies=[];r.hazards=[];r.noiseActive=false;r.doorProgress=1;r.player.set(0,1.65,-r.roomLength/2-1);h.step(1);assert.equal(r.ascendedDoor,2);assert.equal(r.pickups.filter(p=>p.kind==='glassShard').length,1);
 const rules=h.load(path.join(root,'app/mining.ts'));assert.equal(rules.GLUE_CHANCE,.04);assert.equal(rules.sangSkipTarget(370,0,false,'redox'),400);assert.equal(rules.sangSkipTarget(180,0,false,'none'),200);assert.equal(rules.sangSkipTarget(1,10,true,'ascended'),50);
 r.inventory.sang=3;h.act.useItem('sang');assert.equal(r.ascendedDoor,2);assert.equal(r.inventory.sang,3);r.inventory.sang=4;h.act.useItem('sang');assert.equal(r.ascendedWorld,false);assert.equal(r.inventory.sang,0);
});

test('third person uses an articulated customised survivor, saves appearance, and preserves walking height',async()=>{
 const h=gameHarness();await Promise.resolve();await Promise.resolve();h.enter(2);const r=h.runtime;r.enemies=[];r.hazards=[];r.noiseActive=false;
 const appearance={suit:'#643f37',trim:'#b5dd77',skin:'#6b3827',visor:'#a9d7ee',helmet:'open',build:'broad',backpack:false,pattern:'hazard'};
 h.act.customize(appearance);assert.equal(JSON.parse(h.saved.get('ion-appearance-v1')).suit,appearance.suit);assert.equal(r.localAvatar.userData.limbs.length,4);
 h.listeners.get('keydown')({code:'KeyV',repeat:false,target:null});h.step();assert(r.thirdPerson);assert(r.localAvatar.visible);assert(r.camera.position.distanceTo(r.player)>1);assert.equal(r.gunModel.visible,false);
 r.keysDown.add('KeyW');h.step(.4);r.keysDown.clear();assert.equal(r.player.y,1.65);assert(r.localAvatar.position.distanceTo(r.player)<.01);
 h.act.toggleView();h.step();assert.equal(r.localAvatar.visible,false);assert(r.camera.position.distanceTo(r.player)<.1);
 const {cleanAppearance}=h.load(path.join(root,'app/playerModel.ts'));assert.equal(cleanAppearance({suit:'invalid',helmet:'x'}).suit,'#223b38');
});


test('an invite guest enters the host run directly, exchanges appearance, and follows room changes',async()=>{
 const hosts=new Map();let next=0;
 class Link {
  role=null;code='';playerName='Survivor'+(++next);connection=null;other=null;
  onMessage=()=>{};onStatus=()=>{};onConnect=()=>{};onDisconnect=()=>{};
  async host(){this.code='a'.repeat(32);this.role='host';hosts.set(this.code,this);return this.code;}
  async join(token){const h=hosts.get(token);assert(h);this.role='guest';this.code=token;this.other=h;h.other=this;this.connection=h.connection={open:true};h.onConnect();this.onConnect();}
  send(message){if(this.connection?.open)queueMicrotask(()=>this.other.onMessage(structuredClone(message)));}
  close(){if(this.role==='host')hosts.delete(this.code);this.role=null;this.code='';this.connection=null;}
 }
 const host=gameHarness(true,Link),guest=gameHarness(true,Link);await Promise.resolve();await Promise.resolve();
 host.enter(42);host.runtime.enemies=[];host.runtime.hazards=[];host.runtime.noiseActive=false;
 host.act.customize({...host.runtime.appearance,suit:'#123456'});await host.act.hostParty();
 await guest.act.joinParty('https://c-a-studios-viji.github.io/Ion/?join='+ 'a'.repeat(32));await new Promise(resolve=>setImmediate(resolve));
 assert.equal(guest.runtime.room,42);assert.equal(guest.runtime.running,true);assert.equal(guest.screen(),null);assert.equal(guest.runtime.remotePose.appearance.suit,'#123456');
 host.enter(43);await new Promise(resolve=>setImmediate(resolve));assert.equal(guest.runtime.room,43);assert.equal(guest.screen(),null);assert.equal(guest.runtime.running,true);
});
