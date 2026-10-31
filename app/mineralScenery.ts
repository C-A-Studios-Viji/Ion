import * as THREE from 'three';
import {fractureGeometry} from './caveScenery';
import {makeRockMaterial} from './rockMaterials';
import {crystalMaterial} from './crystalOptics';
import {roomFloor,type RoomType} from './roomTypes';

/** Cut hexagonal sides and a pointed termination, with separate face normals. */
export function crystalGeometry(color:number){
 const p:number[]=[],c:number[]=[],low=new THREE.Color(color).lerp(new THREE.Color(0xffffff),.58),tip=new THREE.Color(color).lerp(new THREE.Color(0xffffff),.88);
 const vertex=(angle:number,y:number,r:number)=>[Math.cos(angle)*r,y,Math.sin(angle)*r];
 const tri=(a:number[],b:number[],d:number[],face:number)=>{for(const v of [a,b,d]){p.push(...v);const t=THREE.MathUtils.smoothstep(v[1],0,1);const co=low.clone().lerp(tip,t).multiplyScalar(.92+face*.014);c.push(co.r,co.g,co.b);}};
 for(let side=0;side<6;side++){
  const a=side/6*Math.PI*2,b=(side+1)/6*Math.PI*2;
  const a0=vertex(a,0,.14),b0=vertex(b,0,.14),a1=vertex(a,.78,.15),b1=vertex(b,.78,.15);
  tri(a0,a1,b0,side);tri(b0,a1,b1,side);tri(a1,[0,1,0],b1,side);tri(b0,[0,0,0],a0,side);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));g.computeVertexNormals();return g;
}
export function createGeode(color:number,size:number,seed:number,collectible=false,specimen?:THREE.Group|null){
 let state=(seed*7919+11)>>>0;const rand=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
 const g=new THREE.Group();g.name='mineral-geode';g.userData.geode=true;
 const stone=makeRockMaterial('slab');
 // Broken host-rock cup, with a dark cavity instead of a glowing plastic pedestal.
 const host=new THREE.Mesh(fractureGeometry(1),stone);host.scale.set(.67,.2,.53);host.position.y=.09;host.receiveShadow=true;host.castShadow=true;g.add(host);
 const cavity=new THREE.Mesh(new THREE.SphereGeometry(.44,16,8,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({color:0x101712,roughness:.95}));cavity.scale.set(1,.25,.85);cavity.position.y=.18;g.add(cavity);
 const rocklets=new THREE.InstancedMesh(fractureGeometry(0),makeRockMaterial('slab'),12);
 const transform=new THREE.Object3D();
 for(let i=0;i<12;i++){const a=i/12*Math.PI*2;transform.position.set(Math.cos(a)*.46,.14+rand()*.06,Math.sin(a)*.37);transform.scale.set(.12+rand()*.13,.1+rand()*.17,.14+rand()*.13);transform.rotation.set(rand(),rand(),rand());transform.updateMatrix();rocklets.setMatrixAt(i,transform.matrix);}
 rocklets.castShadow=true;rocklets.receiveShadow=true;rocklets.computeBoundingSphere();g.add(rocklets);
 const mineral=crystalMaterial(color);
 const count=collectible?15:25,crystals=new THREE.InstancedMesh(crystalGeometry(color),mineral,count);
 for(let i=0;i<count;i++){
  const a=rand()*Math.PI*2,r=Math.sqrt(rand())*.46;
  // Slender hero points rise above short druse rather than a uniform brush.
  const height=i===0?1.45:(.12+Math.pow(rand(),1.8)*1.24)*(1-r*.5),width=.28+Math.sqrt(height)*(.35+rand()*.4);
  transform.position.set(Math.cos(a)*r,.15,Math.sin(a)*r*.8);transform.rotation.set(Math.cos(a)*r*.8,rand()*Math.PI*2,-Math.sin(a)*r*.8);transform.scale.set(width,height,width*(.75+rand()*.35));transform.updateMatrix();crystals.setMatrixAt(i,transform.matrix);
 }
 crystals.name='faceted-mineral-growth';crystals.castShadow=false;crystals.receiveShadow=true;crystals.computeBoundingSphere();g.add(crystals);
 // Keep the seven distinct original STL silhouettes within their new host rock.
 if(specimen){specimen.position.set(0,.16,0);specimen.scale.multiplyScalar(.55);g.add(specimen);}
 g.scale.setScalar(size*(collectible?.95:1.4));return g;
}


export type MineralScatterPoint={x:number;z:number;height:number;width:number;yaw:number;lean:number};
/** Independent art seed preserves all enemy, objective and loot random rolls. */
export function planMineralScatter(w:number,l:number,seed:number,clear:THREE.Vector3[]):MineralScatterPoint[]{
 let n=(seed*6521+31)>>>0;const rand=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296),points:MineralScatterPoint[]=[];
 for(let pocket=0;pocket<18;pocket++){
  const side=rand()<.5?-1:1,px=side*(1.9+rand()*Math.max(.5,w/2-3.6)),pz=(rand()-.5)*(l-9),hero=rand()<.22;
  for(let j=0;j<4+Math.floor(rand()*5);j++){
   const x=px+(rand()-.5)*1.6,z=pz+(rand()-.5)*1.7;
   if(Math.abs(x)<1.5||Math.abs(x)>w/2-1||Math.abs(z)>l/2-4||clear.some(v=>Math.hypot(v.x-x,v.z-z)<1.5))continue;
   const height=hero&&j===0?.8+rand()*1.1:.09+Math.pow(rand(),2)*.6;
   points.push({x,z,height,width:.17+Math.sqrt(height)*.5,yaw:rand()*Math.PI*2,lean:(rand()-.5)*.5});
  }
 }
 return points;
}
export function addMineralScatter(group:THREE.Group,w:number,l:number,type:RoomType,seed:number,color:number,clear:THREE.Vector3[]){
 const points=planMineralScatter(w,l,seed,clear),root=new THREE.Group();root.name='scattered-cave-minerals';root.userData.cosmeticOnly=true;root.userData.layoutGeometry=true;
 if(!points.length)return root;
 const shards=new THREE.InstancedMesh(crystalGeometry(color),crystalMaterial(color),points.length),transform=new THREE.Object3D();
 const host=new THREE.InstancedMesh(fractureGeometry(0),makeRockMaterial('slab'),points.length);
 points.forEach((p,i)=>{
  const floor=roomFloor(type,l,p.z);transform.position.set(p.x,floor+.1,p.z);transform.rotation.set(p.lean,p.yaw,p.lean*.7);transform.scale.set(p.width,p.height,p.width*.8);transform.updateMatrix();shards.setMatrixAt(i,transform.matrix);
  transform.position.y=floor+.04;transform.rotation.set(0,p.yaw,.06);transform.scale.set(p.width*.3,.065,p.width*.28);transform.updateMatrix();host.setMatrixAt(i,transform.matrix);
 });
 shards.name='scattered-clear-crystals';shards.castShadow=false;shards.receiveShadow=true;shards.computeBoundingSphere();host.castShadow=true;host.receiveShadow=true;host.computeBoundingSphere();root.add(shards,host);group.add(root);return root;
}
