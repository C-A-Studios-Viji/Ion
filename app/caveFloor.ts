import * as THREE from 'three';
import {fractureGeometry} from './caveScenery';
import {roomFloor,type RoomType} from './roomTypes';
/** Stock materials and baked vertices: no custom shader, instancing or postprocess required. */
function floorStone(){return new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.88,metalness:0,flatShading:true,emissive:0x171b13,emissiveIntensity:.24,envMapIntensity:.25});}
export function addRockyCaveFloor(group:THREE.Group,width:number,length:number,type:RoomType,seed:number,clearPoints:THREE.Vector3[]){
 let state=(seed*1931+17)>>>0;const rand=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const detail=new THREE.Group();detail.name='cave-floor-decoration';detail.userData.cosmeticOnly=true;detail.userData.layoutGeometry=true;
 const isClear=(x:number,z:number,radius:number)=>clearPoints.some(p=>Math.hypot(p.x-x,p.z-z)<Math.max(1.15,radius+.5));
 const skin=new THREE.PlaneGeometry(width-.9,length-.9,Math.ceil(width*2),Math.ceil(length*2)),positions=skin.attributes.position,colors=new Float32Array(positions.count*3);
 for(let i=0;i<positions.count;i++){
  const x=positions.getX(i),z=-positions.getY(i),fade=isClear(x,z,.1)||Math.abs(z)>length/2-3?.28:1;
  const relief=fade*(.16+rand()*.25+.20*Math.abs(Math.sin(x*1.6+z*.7))+.10*Math.cos(z*3.1+x*.8));
  positions.setZ(i,roomFloor(type,length,z)+.035+relief);
  const shade=.25+Math.max(0,relief)*.21+rand()*.07;colors.set([shade,shade*.96,shade*.84],i*3);
 }
 skin.setAttribute('color',new THREE.BufferAttribute(colors,3));skin.rotateX(-Math.PI/2);skin.computeVertexNormals();skin.computeBoundingSphere();
 const surface=new THREE.Mesh(skin,floorStone());surface.receiveShadow=true;surface.name='uneven-cave-skin';detail.add(surface);
 // Bake each rock into one of two ordinary meshes. Portable across WebGL 2
 // drivers, with the same two rubble draw calls as the instanced version.
 for(const large of [false,true]){
  const shape=fractureGeometry(large?1:0),source=shape.index?shape.toNonIndexed():shape;
  const points=source.attributes.position,normals=source.attributes.normal,out:number[]=[],outNormals:number[]=[],outColors:number[]=[],centers:number[][]=[];
  const attempts=Math.min(large?230:650,Math.ceil(width*length*(large?.35:1.4))),matrix=new THREE.Matrix4(),normalMatrix=new THREE.Matrix3(),v=new THREE.Vector3(),n=new THREE.Vector3();
  for(let i=0;i<attempts;i++){
   const x=(rand()-.5)*(width-1.8),z=(rand()-.5)*(length-2),radius=large?.38+rand()*.65:.10+rand()*.26;
   if(Math.abs(z)>length/2-3||isClear(x,z,radius))continue;
   const sy=(large?.28+rand()*.48:.09+rand()*.18)*(Math.abs(x)<1.1?.65:1),y=roomFloor(type,length,z)+sy*.5;
   const q=new THREE.Quaternion().setFromEuler(new THREE.Euler((rand()-.5)*.35,rand()*Math.PI*2,(rand()-.5)*.35));
   matrix.compose(new THREE.Vector3(x,y,z),q,new THREE.Vector3(radius,sy,radius*(.7+rand()*.8)));normalMatrix.getNormalMatrix(matrix);centers.push([x,y,z]);
   const shade=.27+rand()*.18;
   for(let j=0;j<points.count;j++){
    v.fromBufferAttribute(points,j).applyMatrix4(matrix);out.push(v.x,v.y,v.z);
    n.fromBufferAttribute(normals,j).applyNormalMatrix(normalMatrix);outNormals.push(n.x,n.y,n.z);
    const facet=.88+Math.max(0,n.y)*.16;outColors.push(shade*facet,shade*.95*facet,shade*.83*facet);
   }
  }
  source.dispose();if(source!==shape)shape.dispose();if(!centers.length)continue;
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(out,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(outNormals,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(outColors,3));geo.computeBoundingBox();geo.computeBoundingSphere();
  const rubble=new THREE.Mesh(geo,floorStone());rubble.name=large?'cave-rock-slabs':'cave-loose-gravel';rubble.userData.rockCount=centers.length;rubble.userData.rockCenters=centers;rubble.receiveShadow=true;rubble.castShadow=large;detail.add(rubble);
 }
 group.add(detail);return detail;
}
