import * as THREE from 'three';
import {makeRockMaterial} from './rockMaterials';
import {fractureGeometry} from './caveScenery';
import {roomFloor,type RoomType} from './roomTypes';
/** Cosmetic terrain only. Never register these meshes in movement colliders. */
export function addRockyCaveFloor(group:THREE.Group,width:number,length:number,type:RoomType,seed:number,clearPoints:THREE.Vector3[]){
 let state=(seed*1931+17)>>>0;const rand=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const detail=new THREE.Group();detail.name='cave-floor-decoration';detail.userData.cosmeticOnly=true;
 const isClear=(x:number,z:number,radius:number)=>clearPoints.some(p=>Math.hypot(p.x-x,p.z-z)<Math.max(1.15,radius+.5));
 // The optical surface is uneven; roomFloor remains the sole walking surface.
 const skin=new THREE.PlaneGeometry(width-.9,length-.9,Math.ceil(width*2),Math.ceil(length*2));
 const positions=skin.attributes.position;
 for(let i=0;i<positions.count;i++){
  const x=positions.getX(i),z=-positions.getY(i);
  const fade=isClear(x,z,.1)||Math.abs(z)>length/2-3?.28:1;
  positions.setZ(i,roomFloor(type,length,z)+.018+fade*(.16+rand()*.25 + .20*Math.abs(Math.sin(x*1.6+z*.7))+.10*Math.cos(z*3.1+x*.8)));
 }
 skin.rotateX(-Math.PI/2);skin.computeVertexNormals();
 const surface=new THREE.Mesh(skin,makeRockMaterial('ground'));surface.receiveShadow=true;surface.name='uneven-cave-skin';detail.add(surface);
 // Two instanced draws cover loose gravel and larger broken slabs.
 for(const large of [false,true]){
  const matrices:THREE.Matrix4[]=[],colours:THREE.Color[]=[];
  const attempts=Math.min(large?280:900,Math.ceil(width*length*(large?.35:1.4)));
  for(let i=0;i<attempts;i++){
   const x=(rand()-.5)*(width-1.8),z=(rand()-.5)*(length-2);
   const radius=large?.38+rand()*.65:.10+rand()*.26;
   if(Math.abs(z)>length/2-3||isClear(x,z,radius))continue;
   const central=Math.abs(x)<1.1;
   const sy=(large?.28+rand()*.48:.09+rand()*.18)*(central?.65:1);
   const q=new THREE.Quaternion().setFromEuler(new THREE.Euler((rand()-.5)*.35,rand()*Math.PI*2,(rand()-.5)*.35));
   matrices.push(new THREE.Matrix4().compose(new THREE.Vector3(x,roomFloor(type,length,z)+sy*.5,z),q,new THREE.Vector3(radius,sy,radius*(.7+rand()*.8))));
   colours.push(new THREE.Color().setHSL(.55+rand()*.04,.07+rand()*.08,.6+rand()*.22));
  }
  if(!matrices.length)continue;
  const rubble=new THREE.InstancedMesh(fractureGeometry(large?1:0),makeRockMaterial('slab'),matrices.length);
  matrices.forEach((matrix,i)=>{rubble.setMatrixAt(i,matrix);rubble.setColorAt(i,colours[i]);});
  rubble.name=large?'cave-rock-slabs':'cave-loose-gravel';rubble.receiveShadow=true;rubble.castShadow=large;rubble.computeBoundingSphere();detail.add(rubble);
 }
 group.add(detail);return detail;
}
