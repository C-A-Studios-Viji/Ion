import * as THREE from 'three';
export type Appearance={suit:string;trim:string;skin:string;visor:string;helmet:'sealed'|'open'|'hood';build:'slim'|'regular'|'broad';backpack:boolean;pattern:'plain'|'rescue'|'hazard'};
export const DEFAULT_APPEARANCE:Appearance={suit:'#223b38',trim:'#65efad',skin:'#b77955',visor:'#86e2df',helmet:'sealed',build:'regular',backpack:true,pattern:'rescue'};
export function cleanAppearance(value:Partial<Appearance>|null|undefined):Appearance {
 const v=value??{},out={...DEFAULT_APPEARANCE};
 for(const key of ['suit','trim','skin','visor'] as const)if(/^#[0-9a-f]{6}$/i.test(v[key]??''))out[key]=v[key]!;
 if(['sealed','open','hood'].includes(v.helmet??''))out.helmet=v.helmet!;
 if(['slim','regular','broad'].includes(v.build??''))out.build=v.build!;
 if(['plain','rescue','hazard'].includes(v.pattern??''))out.pattern=v.pattern!;
 if(typeof v.backpack==='boolean')out.backpack=v.backpack;
 return out;
}
export function createPickaxe(){
 const group=new THREE.Group();group.name='sang-pickaxe';
 const haft=new THREE.Mesh(new THREE.CylinderGeometry(.035,.045,.78,12),new THREE.MeshStandardMaterial({color:0x433729,roughness:.85}));group.add(haft);
 const steel=new THREE.MeshStandardMaterial({color:0x9ba8a5,metalness:.85,roughness:.3});
 const head=new THREE.Mesh(new THREE.BoxGeometry(.53,.09,.09),steel);head.position.y=.31;head.rotation.z=-.12;group.add(head);
 const tip=new THREE.Mesh(new THREE.ConeGeometry(.065,.3,5),steel);tip.position.set(.35,.27,0);tip.rotation.z=-Math.PI/2-.2;group.add(tip);
 const wrap=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.24,12),new THREE.MeshStandardMaterial({color:0x18211d}));wrap.position.y=-.2;group.add(wrap);return group;
}
/** Human proportions, articulated suit, boots and helmet. Origin is eye height. */
export function createPlayerModel(input:Appearance){
 const a=cleanAppearance(input),g=new THREE.Group();g.name='survivor';g.userData.appearance=JSON.stringify(a);
 const suit=new THREE.MeshStandardMaterial({color:a.suit,roughness:.86}),trim=new THREE.MeshStandardMaterial({color:a.trim,emissive:a.trim,emissiveIntensity:.12,roughness:.65});
 const dark=new THREE.MeshStandardMaterial({color:0x101713,roughness:.86}),skin=new THREE.MeshStandardMaterial({color:a.skin,roughness:.9});
 function mesh(geo:THREE.BufferGeometry,mat:THREE.Material,x:number,y:number,z:number,parent:THREE.Group=g){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 const w=a.build==='slim'?.88:a.build==='broad'?1.16:1;
 const chest=mesh(new THREE.CapsuleGeometry(.23,.36,6,16),suit,0,-.62,0);chest.scale.set(w,1,.67);
 mesh(new THREE.BoxGeometry(.43*w,.055,.3),dark,0,-.94,0);
 if(a.pattern!=='plain'){
  mesh(new THREE.BoxGeometry(.36*w,.045,.015),trim,0,-.57,-.169);
  for(const x of [-.13,.13]){const stripe=mesh(new THREE.BoxGeometry(.04,.35,.016),trim,x*w,-.65,-.17);if(a.pattern==='hazard')stripe.rotation.z=.35;}
 }
 const head=mesh(new THREE.SphereGeometry(.17,24,18),skin,0,-.035,0);head.scale.set(.86,1.1,.95);
 for(const x of [-.055,.055])mesh(new THREE.SphereGeometry(.012,8,8),dark,x,-.018,-.15);
 mesh(new THREE.BoxGeometry(.055,.025,.04),skin,0,-.06,-.158);
 if(a.helmet!=='open'){
  const helmet=mesh(new THREE.SphereGeometry(.205,24,18),a.helmet==='hood'?suit:dark,0,-.02,.018);helmet.scale.set(1,1.12,1);
  const glass=new THREE.MeshPhysicalMaterial({color:a.visor,metalness:.45,roughness:.13,transparent:true,opacity:.83});
  const visor=mesh(new THREE.SphereGeometry(.211,24,12,Math.PI*.76,Math.PI*.48,Math.PI*.26,Math.PI*.48),glass,0,-.015,.009);visor.rotation.y=Math.PI;
  mesh(new THREE.BoxGeometry(.045,.04,.06),trim,.19,.02,-.04);
 }
 const limbs:THREE.Group[]=[];
 for(const side of [-1,1]){
  const leg=new THREE.Group();leg.position.set(side*.13*w,-.98,0);g.add(leg);limbs.push(leg);
  mesh(new THREE.CapsuleGeometry(.095,.34,6,12),suit,0,-.24,0,leg);
  mesh(new THREE.BoxGeometry(.17,.16,.16),dark,0,-.25,-.065,leg);
  mesh(new THREE.BoxGeometry(.19,.18,.31),dark,0,-.58,-.055,leg);
  const arm=new THREE.Group();arm.position.set(side*.29*w,-.4,0);g.add(arm);limbs.push(arm);
  mesh(new THREE.CapsuleGeometry(.078,.36,6,12),suit,0,-.22,0,arm);
  mesh(new THREE.CapsuleGeometry(.07,.07,4,10),dark,0,-.46,0,arm);
  mesh(new THREE.BoxGeometry(.12,.04,.13),trim,0,-.12,0,arm);
  if(side===1){const pick=createPickaxe();pick.position.set(0,-.45,-.18);pick.rotation.x=-.5;pick.visible=false;arm.add(pick);g.userData.pickaxe=pick;g.userData.miningArm=arm;}
 }
 if(a.backpack){mesh(new THREE.BoxGeometry(.34,.48,.18),dark,0,-.65,.2);mesh(new THREE.BoxGeometry(.12,.24,.02),trim,0,-.65,.3);}
 const lamp=new THREE.PointLight(0xb5edcc,2,3);lamp.position.set(.16,.03,-.1);g.add(lamp);
 g.userData.limbs=limbs;g.userData.lamp=lamp;return g;
}
export function animatePlayer(g:THREE.Group,time:number,moving:boolean,swing=0){
 const limbs=g.userData.limbs as THREE.Group[];limbs.forEach((l,i)=>l.rotation.x=moving?Math.sin(time*9+(i<2?0:Math.PI)+(i%2)*Math.PI)*.42:0);
 if(swing>0){g.userData.miningArm.rotation.x=-1.1-Math.sin(swing*Math.PI)*.8;g.userData.pickaxe.visible=true;}else g.userData.pickaxe.visible=false;
}
