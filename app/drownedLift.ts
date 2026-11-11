import * as THREE from 'three';
export type LiftState={ power:number; started:boolean; elapsed:number; ride:number };
export const freshLift=():LiftState=>({power:0,started:false,elapsed:0,ride:0});
export function restoreLift(value?:Partial<LiftState>):LiftState{return {power:Math.max(0,Math.min(7,Math.floor(value?.power??0))),started:value?.started===true,elapsed:Math.max(0,Math.min(75,value?.elapsed??0)),ride:Math.max(0,Math.min(8,value?.ride??0))};}
export function addDrownedLift(group:THREE.Group,length:number){
 const root=new THREE.Group();root.name='drowned-lift';root.userData.layoutGeometry=true;
 const steel=new THREE.MeshStandardMaterial({color:0x304a41,roughness:.36,metalness:.8});
 const mesh=(w:number,h:number,d:number,x:number,y:number,z:number,parent:THREE.Object3D=root)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),steel);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
 const pad=new THREE.Group();pad.name='lift-platform';pad.position.z=-length/2+6;root.add(pad);
 mesh(5,.25,5,0,.4,0,pad);
 for(const x of [-2.4,2.4]){mesh(.12,1.2,4.8,x,1.05,0,pad);mesh(.14,7,.14,x,3.5,-length/2+6);}
 mesh(5, .14,.14,0,1.1,-2.4,pad);
 for(const x of [-2,2])mesh(.06,7,.06,x,3.5,-length/2+6);
 const light=new THREE.PointLight(0x45ffb4,16,12);light.position.set(0,3,-length/2+6);root.add(light);
 group.add(root);return root;
}
export function drawLift(group:THREE.Group,state:LiftState){const root=group.getObjectByName('drowned-lift'),pad=root?.getObjectByName('lift-platform');if(pad)pad.position.y=state.ride/8*3.5;const water=group.getObjectByName('rippled-floodwater');if(water)water.position.y=.16+(state.started?Math.min(1.8,state.elapsed*.03):0);}
