import * as THREE from 'three';
import {FINALE_ROOMS,type RoomType} from './roomTypes';

export const EXPERIMENTAL_ROOMS = ['fungal','archive','refinery','pressure','mirror','greenhouse','faultline','dormitory',...FINALE_ROOMS] as const;
export type ExperimentalRoom = typeof EXPERIMENTAL_ROOMS[number];
export const isExperimentalRoom = (type:RoomType):type is ExperimentalRoom => (EXPERIMENTAL_ROOMS as readonly string[]).includes(type);
export const ROOM_TASKS:Record<ExperimentalRoom,string> = {
 fungal:'VENT SPORES · GLOWING CAPS MARK SPORE PATCHES',
 archive:'RESTORE THREE ARCHIVE BRIDGES · SIDE AISLES STAY OPEN',
 refinery:'REVERSE THREE BELTS · CROSS WHEN CRUSHERS RISE',
 pressure:'RELEASE AIRLOCKS IN ORDER 1 → 2 → 3 · AVOID AMBER STEAM',
 mirror:'DRAIN THREE BASINS · FOLLOW THE CYAN REFLECTIONS, AVOID RED',
 greenhouse:'CUT THREE ROOT NODES · NEW ROOTS GROW IN THE NEXT BED',
 faultline:'STABILIZE THREE FAULTS · AMBER BRIDGES ARE ABOUT TO DROP',
 powerexchange:'LIGHT THREE EMERGENCY BEACONS · OPENING THE EXIT CUTS MAIN POWER',
 carousel:'ROTATE THREE BULKHEADS IN ORDER · FOLLOW EACH OPEN SIDE',
 crystallung:'STABILIZE THREE CRYSTAL VALVES · CROSS WHEN THE RIBS OPEN',
 dormitory:'SEARCH THREE BUNK LOCKERS · WALK AND LET THE NOISE FALL',
};
// Traversal effects use normalized room coordinates, so every variant scales
// with the enclosing facility and leaves both side aisles accessible.
export function roomTraversal(type:RoomType,x:number,z:number,length:number,time:number,cleared:number){
 const band=Math.floor((length/2-z-7)/10),nearBand=band>=0&&band<3;
 const local=((length/2-z-7)%10+10)%10;
 const lane=band%2===0?-1:1;
 let slow=1,push=0,warning='';
 if(type==='fungal'&&nearBand&&Math.abs(x-lane*3)<2&&local<4&&cleared<=band){slow=.58;warning='SPORES · YOUR GLOWING TRAIL ATTRACTS NEARBY ENTITIES';}
 if(type==='archive'&&nearBand&&Math.abs(x)<5&&local<3&&cleared<=band){slow=.4;warning='BRIDGE OFFLINE · USE THE SIDE AISLE OR RESTORE ITS RELAY';}
 if(type==='refinery'&&nearBand&&Math.abs(x)<5){push=cleared>band?-1.5:1.5;if(local<2&&(time+band*2)%8>4){slow=.35;warning='CRUSHER DOWN · CROSS VIA THE SIDE AISLE';}}
 if(type==='pressure'&&nearBand&&cleared<=band&&local<3&&Math.sign(x)===lane){slow=.35;warning='STEAM VENTING · CROSS ON THE OTHER SIDE';}
 if(type==='mirror'&&Math.abs(z)<length/2-6&&Math.abs(x-Math.sin(z*.22)*3)>1.4&&cleared<3){slow=.42;warning='DEEP WATER · CYAN MARKERS SHOW THE SHALLOW ROUTE';}
 if(type==='greenhouse'&&nearBand&&local<3&&Math.abs(x-lane*3)<3&&cleared<=band){slow=.4;warning='ROOT BED · CUT ITS NODE OR GO AROUND';}
 if(type==='faultline'&&nearBand&&local<3&&Math.abs(x)<5&&cleared<=band&&(time+band*3)%10>6){slow=.35;warning='BRIDGE DROPPED · USE THE EDGE LEDGE';}
 return {slow,push,warning};
}

export function addExperimentalRoom(group:THREE.Group,type:ExperimentalRoom,width:number,length:number,height:number){
 const root=new THREE.Group();root.name='experimental-room';root.userData.layoutGeometry=true;
 root.userData.obstacles=[] as THREE.Box3[];
 root.userData.noise=0;root.userData.time=0;root.userData.warning='';
 const mat=(color:number,glow=0)=>new THREE.MeshStandardMaterial({color,emissive:glow,emissiveIntensity:glow?1.2:0,roughness:.65,metalness:.25});
 const steel=mat(0x263f45),cyan=mat(0x3effcd,0x23ac86),amber=mat(0xf5ac40,0xad5610),violet=mat(0x854ec8,0x562d91),red=mat(0xad334b,0x8f172f);
 const mesh=(geometry:THREE.BufferGeometry,material:THREE.Material,x:number,y:number,z:number)=>{const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;root.add(m);return m;};
 const box=(w:number,h:number,d:number,x:number,y:number,z:number,material=steel)=>mesh(new THREE.BoxGeometry(w,h,d),material,x,y,z);
 const solid=(m:THREE.Mesh)=>{m.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(m);root.userData.obstacles.push(bounds);m.userData.bounds=bounds;return m;};
 for(let i=0;i<3;i++){
  const z=length/2-8-i*10,side=i%2===0?-1:1;
  if(type==='fungal')for(let j=0;j<8;j++){
   const x=side*3+(j%3-1)*1.4,zz=z-Math.floor(j/3)*1.3;
   mesh(new THREE.CylinderGeometry(.14,.23,1.8,6),steel,x,.9,zz);
   mesh(new THREE.SphereGeometry(.9,10,6,0,Math.PI*2,0,Math.PI/2),violet,x,1.8,zz);
   const spores=mesh(new THREE.SphereGeometry(.12,5,4),cyan,x,.7+j*.16,zz);spores.userData.spore=i;
  }
  if(type==='archive'){
   for(const x of [-6,6]){solid(box(2,height-1,7,x,(height-1)/2,z));for(let shelf=1;shelf<5;shelf++){box(2.2,.12,7,x,shelf*1.3,z,cyan);for(let j=0;j<5;j++)box(.3,.7,.5,x+(j%2)*.4,shelf*1.3+.4,z-2+j,violet);}}
   const bridge=box(10,.18,2.8,0,-.2,z);bridge.userData.bridge=i;
   for(const x of [-4.8,4.8])box(.12,1,2.8,x,.5,z,cyan);
  }
  if(type==='refinery'){
   box(10,.12,7,0,.07,z);
   for(let j=0;j<10;j++){const stripe=box(9,.03,.14,0,.15,z-3+j*.65,j%2?amber:steel);stripe.userData.belt=i;stripe.userData.baseZ=stripe.position.z;}
   const crusher=solid(box(9,1.5,1.6,0,5,z));crusher.userData.crusher=i;
   for(const x of [-5.5,5.5])box(.3,height,.3,x,height/2,z,amber);
  }
  if(type==='pressure'){
   for(const x of [-6,6]){box(.6,height,.6,x,height/2,z);box(5,.15,.7,x,2.5,z,amber);}
   const steam=box(width/2-3,2,2,side*(width/4-1),1,z,amber.clone());
   (steam.material as THREE.MeshStandardMaterial).transparent=true;(steam.material as THREE.MeshStandardMaterial).opacity=.24;steam.userData.steam=i;
  }
  if(type==='mirror'){
   const water=box(width-3,.03,8,0,.12,z,new THREE.MeshStandardMaterial({color:0x144f62,metalness:.95,roughness:.06,transparent:true,opacity:.65}));water.userData.basin=i;
   for(let j=0;j<8;j++){const zz=z+3-j;const x=Math.sin(zz*.22)*3;box(2.6,.08,.8,x,.18,zz);box(.2,.02,.7,x,.23,zz,cyan);if(i===1&&j===3)box(.2,.03,.7,-x-5,.24,zz,red);}
   for(const x of [-width/2+.4,width/2-.4])box(.08,3,7,x,2,z,new THREE.MeshStandardMaterial({color:0x73afba,metalness:1,roughness:.03}));
  }
  if(type==='greenhouse'){
   box(6,.3,6,side*3,.15,z);for(let j=0;j<7;j++){
    const rootMesh=box(.35,2.5,.35,side*3+(j%3-1)*1.5,1.25,z-2+Math.floor(j/3)*1.5,cyan);rootMesh.rotation.z=side*.4;rootMesh.userData.rootNode=i;
   }
   for(const x of [-width/2+1,width/2-1])box(.15,height,.15,x,height/2,z,cyan);
   box(width-2,.15,.15,0,height-.4,z,cyan);
  }
  if(type==='faultline'){
   const bridge=box(10,.2,2.8,0,.05,z);bridge.userData.fault=i;
   for(const x of [-width/2+1.5,width/2-1.5])box(2,.12,8,x,.03,z,cyan);
   for(let j=0;j<8;j++){const crack=box(.12,.02,2,(j-3.5)*1.2,.16,z,amber);crack.rotation.y=(j%2?1:-1)*.5;crack.userData.faultGlow=i;}
  }
  if(type==='powerexchange'){
   const cable=box(.16,.08,9,side*3,.12,z,steel);
   cable.rotation.y=side*.65;
   for(let j=0;j<5;j++){
    const light=box(.35,.08,.5,side*6*(1-j/4),.16,z-j*1.7,cyan);
    light.userData.beacon=i;
   }
   const lamp=new THREE.PointLight(0xff9e4a,9,7);
   lamp.position.set(side*4,1.2,z);lamp.userData.emergency=true;lamp.userData.beacon=i;
   root.add(lamp);
  }
  if(type==='carousel'){
   const panelWidth=width-7;
   const wall=solid(box(panelWidth,3.5,.65,-side*3.5,1.75,z));
   wall.userData.carousel=i;wall.userData.initialX=wall.position.x;wall.userData.initialZ=z;
   const indicator=box(width-1,.1,.7,0,3.8,z,amber);
   indicator.name='bulkhead-rotation-track';
  }
  if(type==='crystallung'){
   for(const side of [-1,1]){
    const rib=solid(box(4,3.5,1.5,side*6,1.75,z,violet));
    rib.userData.lungBand=i;rib.userData.side=side;
    mesh(new THREE.TorusGeometry(1.3,.16,8,16),amber,side*6,4.1,z);
   }
  }
  if(type==='dormitory')for(const x of [-width/2+2,width/2-2]){
   for(const y of [.55,2.15]){solid(box(3,.5,5,x,y+.1,z));box(2.7,.3,4.5,x,y+.25,z,violet);box(2,.2,.8,x,y+.45,z+1.6,steel);}
   for(const xx of [x-1.4,x+1.4])box(.12,3,.12,xx,1.5,z+2.4);
  }
 }
 if(type==='fungal'){for(let i=0;i<16;i++){const trace=mesh(new THREE.SphereGeometry(.12,6,4),cyan,0,.25,0);trace.visible=false;trace.userData.trail=true;}}
 group.add(root);return root;
}

export function animateExperimentalRoom(group:THREE.Group,type:ExperimentalRoom,dt:number,cleared:number,moving:boolean,sprinting:boolean,blackout=false,player?:THREE.Vector3){
 const root=group.getObjectByName('experimental-room');if(!root)return;
 root.userData.time+=dt;
 if(type==='dormitory')root.userData.noise=THREE.MathUtils.clamp((root.userData.noise??0)+dt*(moving?(sprinting?24:2):-18),0,100);
 const time=root.userData.time as number;
 root.traverse(o=>{
  if(o.userData.spore!==undefined){o.visible=cleared<=o.userData.spore;o.position.y=.9+Math.sin(time*1.4+o.position.z)*.35;}
  if(o.userData.bridge!==undefined)o.position.y=cleared>o.userData.bridge ? .04 : -.28;
  if(o.userData.crusher!==undefined)o.position.y=(time+o.userData.crusher*2)%8>4?1.8:5;
  if(o.userData.belt!==undefined)o.position.z=o.userData.baseZ+((time*(cleared>o.userData.belt?-1:1))% .65);
  if(o.userData.steam!==undefined)o.visible=cleared<=o.userData.steam;
  if(o.userData.rootNode!==undefined)o.scale.y=cleared>o.userData.rootNode ? .08 : 1+(cleared===o.userData.rootNode ? .35 : 0);
  if(o.userData.basin!==undefined)o.visible=cleared<=o.userData.basin;
  if(o.userData.beacon!==undefined)o.visible=cleared>o.userData.beacon;
  if(o.userData.carousel!==undefined){
   const engaged=cleared>o.userData.carousel;
   const target=engaged?Math.PI:0;
   const angle=dt===0?target:Math.min(target,(o.userData.angle??0)+dt*Math.PI*1.5);
   o.userData.angle=angle;
   o.position.x=o.userData.initialX*Math.cos(angle);
   o.position.z=o.userData.initialZ+o.userData.initialX*Math.sin(angle);
   o.rotation.y=-angle;
  }
  if(o.userData.lungBand!==undefined){
   const phase=(time+o.userData.lungBand*2)%8;
   const reach=cleared>o.userData.lungBand?0:(1-Math.cos(phase*Math.PI/4))/2;
   const target=o.userData.side*(6-4.1*reach);
   // Hold a growing rib if the player is in its sweep. The side aisles stay open.
   if(!player || Math.abs(o.position.z-player.z)>1.15 || Math.abs(target-player.x)>2.4 ||
      Math.abs(target-player.x)>Math.abs(o.position.x-player.x))o.position.x=target;
  }
  if(o.userData.bounds){o.updateWorldMatrix(true,false);o.userData.bounds.setFromObject(o);}
  if(o instanceof THREE.PointLight&&o.userData.emergency)o.intensity=blackout?12:3;
  if(o.userData.fault!==undefined)o.position.y=cleared<=o.userData.fault&&(time+o.userData.fault*3)%10>6?-.5:.05;
 });
}

export function leaveSporeTrail(group:THREE.Group,player:THREE.Vector3){
 const root=group.getObjectByName('experimental-room');if(!root||root.userData.time-(root.userData.lastTrail??-1)<.3)return;
 root.userData.lastTrail=root.userData.time;
 const traces=root.children.filter(o=>o.userData.trail);if(!traces.length)return;
 const index=(root.userData.traceIndex??0)%traces.length;root.userData.traceIndex=index+1;
 traces[index].position.set(player.x,.25,player.z);traces[index].visible=true;
}
