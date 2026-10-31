import * as THREE from 'three';
import {makeCaveGroundMaterial} from './caveGroundMaterial';
import {roomFloor,type RoomType} from './roomTypes';

// Broad, bevelled layers rather than rounded boulders or random spiky terrain.
function slabGeometry(){
 const points:number[]=[],indices:number[]=[],sides=8;
 for(let ring=0;ring<3;ring++)for(let i=0;i<sides;i++){
  const a=i/sides*Math.PI*2,r=(1+Math.sin(i*7.3)*.16)*(ring===2?.77:1);
  points.push(Math.cos(a)*r,ring===0?-.15:ring===1?.5:.85+Math.sin(i*2.7)*.12,Math.sin(a)*r);
 }
 points.push(0,.88,0);
 for(let i=0;i<sides;i++){
  const j=(i+1)%sides;
  for(let ring=0;ring<2;ring++){const a=ring*sides+i,b=ring*sides+j,c=a+sides,d=b+sides;indices.push(a,c,b,b,c,d);}
  indices.push(16+i,24,16+j);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));g.setIndex(indices);g.computeVertexNormals();return g.toNonIndexed();
}
export function addRockyCaveFloor(group:THREE.Group,width:number,length:number,type:RoomType,seed:number,clearPoints:THREE.Vector3[]){
 let state=(seed*1931+17)>>>0;const rand=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const detail=new THREE.Group();detail.name='cave-floor-decoration';detail.userData.cosmeticOnly=true;detail.userData.layoutGeometry=true;
 const isClear=(x:number,z:number,radius:number)=>clearPoints.some(p=>Math.hypot(p.x-x,p.z-z)<Math.max(1.15,radius+.5));
 const reliefAt=(x:number,z:number)=>{
  const edge=THREE.MathUtils.smoothstep(Math.abs(x),width*.22,width*.46);
  const ridge=Math.pow(.5+.5*Math.sin(x*1.3+z*.54+Math.sin(z*.31)),3);
  const bed=.045+ridge*(.19+edge*.42)+Math.abs(Math.sin(x*2.8-z*1.7))*.045;
  const clearance=isClear(x,z,.1)?.22:1;
  const threshold=THREE.MathUtils.smoothstep(length/2-Math.abs(z),.4,3.2);
  return .012+bed*clearance*threshold;
 };
 // Full-width rock shell covers the old plane. Slow broad strata stay readable
 // at eye height; only small relief is used underneath interactable objects.
 const indexed=new THREE.PlaneGeometry(width,length,Math.ceil(width*2.5),Math.ceil(length*2.5)),p=indexed.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),z=-p.getY(i);p.setXYZ(i,x,roomFloor(type,length,z)+reliefAt(x,z),z);}
 // (x, y) -> (x, height, -y) preserves the plane's upward-facing winding.
 const skin=indexed.toNonIndexed();indexed.dispose();skin.computeVertexNormals();
 const positions=skin.attributes.position,colours=new Float32Array(positions.count*3),uvs=new Float32Array(positions.count*2);
 for(let i=0;i<positions.count;i++){
  const x=positions.getX(i),z=positions.getZ(i),h=positions.getY(i)-roomFloor(type,length,z),shade=.58+Math.min(.28,h*.6);
  colours.set([shade,shade,shade*.98],i*3);uvs.set([x/2.4,z/2.4],i*2);
 }
 skin.setAttribute('color',new THREE.BufferAttribute(colours,3));skin.setAttribute('uv',new THREE.BufferAttribute(uvs,2));skin.computeBoundingBox();skin.computeBoundingSphere();
 const material=makeCaveGroundMaterial(),surface=new THREE.Mesh(skin,material);surface.receiveShadow=true;surface.name='uneven-cave-skin';detail.add(surface);
 // Two baked batches: chips in the cracks, and overlapping thin rock plates.
 for(const large of [false,true]){
  const source=slabGeometry(),points=source.attributes.position,normals=source.attributes.normal;
  const out:number[]=[],outNormals:number[]=[],outColors:number[]=[],outUVs:number[]=[],centers:number[][]=[];
  const attempts=Math.min(large?180:600,Math.ceil(width*length*(large?.26:1.25))),matrix=new THREE.Matrix4(),normalMatrix=new THREE.Matrix3(),v=new THREE.Vector3(),n=new THREE.Vector3();
  for(let i=0;i<attempts;i++){
   // A jittered field avoids the previous gravel-pile distribution.
   const x=(rand()-.5)*(width-1),z=(rand()-.5)*(length-2),radius=large?.42+rand()*.65:.055+rand()*.13;
   if(Math.abs(z)>length/2-2.6||isClear(x,z,radius))continue;
   const side=THREE.MathUtils.smoothstep(Math.abs(x),width*.18,width*.45);
   const sy=large?.09+rand()*.12+side*(.14+rand()*.22):.035+rand()*.065;
   const y=roomFloor(type,length,z)+reliefAt(x,z)*.55;
   const q=new THREE.Quaternion().setFromEuler(new THREE.Euler((rand()-.5)*.12,rand()*Math.PI*2,(rand()-.5)*.1));
   matrix.compose(new THREE.Vector3(x,y,z),q,new THREE.Vector3(radius,sy,radius*(.6+rand()*.6)));normalMatrix.getNormalMatrix(matrix);centers.push([x,y,z]);
   const shade=.55+rand()*.25;
   for(let j=0;j<points.count;j++){
    v.fromBufferAttribute(points,j).applyMatrix4(matrix);out.push(v.x,v.y,v.z);outUVs.push(v.x/2.4,v.z/2.4);
    n.fromBufferAttribute(normals,j).applyNormalMatrix(normalMatrix);outNormals.push(n.x,n.y,n.z);
    const facet=.5+Math.max(0,n.y)*.5;outColors.push(shade*facet,shade*facet,shade*.98*facet);
   }
  }
  source.dispose();if(!centers.length)continue;
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(out,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(outNormals,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(outColors,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(outUVs,2));geo.computeBoundingBox();geo.computeBoundingSphere();
  const rubble=new THREE.Mesh(geo,material);rubble.name=large?'cave-rock-slabs':'cave-loose-gravel';rubble.userData.rockCount=centers.length;rubble.userData.rockCenters=centers;rubble.receiveShadow=true;rubble.castShadow=large;detail.add(rubble);
 }
 group.add(detail);return detail;
}
