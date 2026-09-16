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
      localStorage:{getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v)},
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
    runtime.checkpoint=null;saved.set('ion-checkpoint',JSON.stringify({room,chaseState,ammo:6,battery:100,crystals:{malachite:0,amethyst:0,quartz:0,obsidian:0,citrine:0,fluorite:0,corrupted:0},discovered:[],gunInfusion:null,lightInfusion:null,accessKeys:10,maxAmmo:8}));act.restartCheckpoint();
  };
  const useAt=object=>{runtime.player.copy(object.position).add(new THREE.Vector3(0,1.65,0));step();act.interact();};
  return {runtime,act,step,enter,useAt,load};
}

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
