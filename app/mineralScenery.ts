import * as THREE from 'three';
import {fractureGeometry} from './caveScenery';
import {makeRockMaterial} from './rockMaterials';

/** Cut hexagonal sides and a pointed termination, with separate face normals. */
export function crystalGeometry(color:number){
 const p:number[]=[],c:number[]=[],low=new THREE.Color(color).multiplyScalar(.16),tip=new THREE.Color(color).lerp(new THREE.Color(0xd6e7dc),.38);
 const vertex=(angle:number,y:number,r:number)=>[Math.cos(angle)*r,y,Math.sin(angle)*r];
 const tri=(a:number[],b:number[],d:number[],face:number)=>{for(const v of [a,b,d]){p.push(...v);const t=THREE.MathUtils.smoothstep(v[1],0,1);const co=v[1]<.16?new THREE.Color(0x4b463b):low.clone().lerp(tip,t).multiplyScalar(.86+face*.035);c.push(co.r,co.g,co.b);}};
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
 const mineral=new THREE.MeshPhysicalMaterial({color:0xffffff,vertexColors:true,roughness:.17,metalness:0,clearcoat:.5,clearcoatRoughness:.13,ior:1.47,reflectivity:.6,envMapIntensity:.55,emissive:color,emissiveIntensity:.018,flatShading:true});
 const count=collectible?15:25,crystals=new THREE.InstancedMesh(crystalGeometry(color),mineral,count);
 for(let i=0;i<count;i++){
  const a=rand()*Math.PI*2,r=Math.sqrt(rand())*.4,height=(.22+rand()*.7)*(1-r*.8);
  transform.position.set(Math.cos(a)*r,.15,Math.sin(a)*r*.8);transform.rotation.set(Math.cos(a)*r*.9,rand()*Math.PI*2,-Math.sin(a)*r*.9);transform.scale.set(.65+rand()*.6,height,.65+rand()*.6);transform.updateMatrix();crystals.setMatrixAt(i,transform.matrix);
 }
 crystals.name='faceted-mineral-growth';crystals.castShadow=true;crystals.receiveShadow=true;crystals.computeBoundingSphere();g.add(crystals);
 // Keep the seven distinct original STL silhouettes within their new host rock.
 if(specimen){specimen.position.set(0,.16,0);specimen.scale.multiplyScalar(.62);g.add(specimen);}
 g.scale.setScalar(size*(collectible?.95:1.4));return g;
}
