import * as THREE from 'three';
import {makeRockMaterial,makeAgedMetal} from './rockMaterials';
import {roomFloor,type RoomType} from './roomTypes';
function rng(seed:number){let n=seed>>>0;return ()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);}
function ripple(x:number,y:number,z:number){return Math.sin(x*1.7+y*.7+z*1.9)*.16+Math.sin(x*4.1-z*3.8+y*2.3)*.075;}
function uvGeometry(points:number[],indices:number[]){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));g.setIndex(indices);g.computeVertexNormals();return g;}
export function fractureGeometry(detail=1){
 const g=new THREE.IcosahedronGeometry(1,detail),p=g.attributes.position;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=1+ripple(x*2,y*2,z*2);
  p.setXYZ(i,x*r,y*r,z*r);
 }
 g.computeVertexNormals();return g;
}
/** Visual shell stays behind the playable wall boundary. No gameplay colliders. */
export function addCaveScenery(group:THREE.Group,w:number,l:number,h:number,type:RoomType,seed:number){
 const root=new THREE.Group();root.name='cinematic-cave-shell';root.userData.cosmeticOnly=true;root.userData.layoutGeometry=true;
 const rand=rng(seed*41+17),cols=Math.ceil(l/.7),rows=Math.ceil(h/.65);
 for(const side of [-1,1]){
  const p:number[]=[],idx:number[]=[];
  for(let y=0;y<=rows;y++)for(let z=0;z<=cols;z++){
   const zz=-l/2+z*l/cols,yy=y*h/rows+Math.min(0,roomFloor(type,l,zz));
   p.push(side*(w/2-.12-ripple(0,yy,zz)),yy,zz);
  }
  for(let y=0;y<rows;y++)for(let z=0;z<cols;z++){const a=y*(cols+1)+z,b=a+1,c=a+cols+1,d=c+1;if(side<0)idx.push(a,c,b,b,c,d);else idx.push(a,b,c,b,d,c);}
  const wall=new THREE.Mesh(uvGeometry(p,idx),makeRockMaterial());wall.name='folded-rock-wall';wall.receiveShadow=true;wall.castShadow=true;root.add(wall);
 }
 // A broken vault replaces the flat ceiling silhouette without lowering clearance.
 const p:number[]=[],idx:number[]=[],across=Math.ceil(w/.7);
 for(let x=0;x<=across;x++)for(let z=0;z<=cols;z++){
  const xx=-w/2+x*w/across,zz=-l/2+z*l/cols;
  p.push(xx,h-.08+ripple(xx,0,zz)*.6-Math.pow(Math.abs(xx)/(w/2),4)*.3,zz);
 }
 for(let x=0;x<across;x++)for(let z=0;z<cols;z++){const a=x*(cols+1)+z,b=a+1,c=a+cols+1,d=c+1;idx.push(a,c,b,b,c,d);}
 const vault=new THREE.Mesh(uvGeometry(p,idx),makeRockMaterial());vault.name='broken-cave-vault';vault.castShadow=true;vault.receiveShadow=true;root.add(vault);
 // Three independent fragment shapes; instanced surfaces keep draw calls bounded.
 for(let shape=0;shape<3;shape++){
  const matrices:THREE.Matrix4[]=[],colors:THREE.Color[]=[];
  for(const side of [-1,1])for(let z=-l/2+1.2;z<l/2-1.2;z+=1.35)for(let y=.55;y<h-.2;y+=1.15){
   if(Math.floor(rand()*3)!==shape)continue;
   const pos=new THREE.Vector3(side*(w/2+.48),y+(rand()-.5)*.4,z+(rand()-.5)*.6);
   const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(rand()*.5,rand()*Math.PI,(rand()-.5)*.7));
   // Their inner edge remains outside the player's x boundary.
   matrices.push(new THREE.Matrix4().compose(pos,q,new THREE.Vector3(.37+rand()*.18,.55+rand()*.6,.65+rand()*.5)));
   colors.push(new THREE.Color().setRGB(.78+rand()*.15,.76+rand()*.12,.7+rand()*.12));
  }
  const m=new THREE.InstancedMesh(fractureGeometry(1),makeRockMaterial('slab'),matrices.length);
  matrices.forEach((matrix,i)=>{m.setMatrixAt(i,matrix);m.setColorAt(i,colors[i]);});m.name='layered-wall-fragments';m.castShadow=true;m.receiveShadow=true;m.computeBoundingSphere();root.add(m);
 }
 addIndustrialScenery(root,w,l,h,seed,true);
 group.add(root);return root;
}
export function addIndustrialScenery(group:THREE.Group,w:number,l:number,h:number,seed:number,cave=false){
 const root=new THREE.Group();root.name='industrial-service-details';root.userData.cosmeticOnly=true;root.userData.layoutGeometry=true;
 const steel=makeAgedMetal(),rubber=new THREE.MeshStandardMaterial({color:0x171a16,roughness:.86});
 // Suspended service cables and wall brackets frame the same door as the reference.
 for(const side of [-1,1])for(let wire=0;wire<3;wire++){
  const x=side*(w/2-.4-wire*.11),y=Math.min(h-.4,5.4)-wire*.08;
  const points=Array.from({length:9},(_,i)=>new THREE.Vector3(x+Math.sin(i+seed)*.05,y-Math.sin(i/8*Math.PI)*(.3+wire*.1),l/2-1-i*(l-2)/8));
  const cable=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),Math.ceil(l*2),.025+wire*.012,5,false),rubber);root.add(cable);
  if(wire===0)for(let z=-l/2+2;z<l/2-2;z+=4){const bracket=new THREE.Mesh(new THREE.BoxGeometry(.5,.08,.08),steel);bracket.position.set(side*(w/2-.2),y,z);root.add(bracket);}
 }
 // Rusted braces and inset bolt heads stay clear of the 4.8m exit aperture.
 for(const side of [-1,1]){
  const post=new THREE.Mesh(new THREE.BoxGeometry(.16,4.6,.24),steel);post.position.set(side*2.78,2.3,-l/2+.33);root.add(post);
  for(let y=.4;y<4.5;y+=.7){const bolt=new THREE.Mesh(new THREE.CylinderGeometry(.046,.046,.04,6),steel);bolt.rotation.x=Math.PI/2;bolt.position.set(side*2.78,y,-l/2+.48);root.add(bolt);}
 }
 if(cave){const lintel=new THREE.Mesh(fractureGeometry(1),makeRockMaterial());lintel.position.set(0,Math.max(5.2,h-.3),-l/2+.18);lintel.scale.set(2.5,.3,.3);root.add(lintel);}
 group.add(root);return root;
}
