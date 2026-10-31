import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {MonsterKind} from './monsterModels';
import {fractureGeometry} from './caveScenery';
import {makeRockMaterial} from './rockMaterials';
import {crystalGeometry} from './mineralScenery';
import {crystalMaterial} from './crystalOptics';
type Surface='skin'|'slime'|'chitin'|'stone'|'cloth';
const SURFACES:Record<MonsterKind,Surface>={entity:'skin',blob:'slime',haidini:'skin',crawler:'chitin',watcher:'stone',sound:'skin',prism:'stone',mimic:'chitin',wraith:'cloth',noise:'skin',remetons:'stone',boonie:'cloth',void:'stone',ramyram:'stone',lore:'cloth',serp:'cloth'};
const PALETTES:Record<MonsterKind,[number,number]>={entity:[0x191a14,0x817764],blob:[0x100b0b,0x4b3530],haidini:[0x1c1710,0x665238],crawler:[0x111813,0x4b594a],watcher:[0x141a18,0x566357],sound:[0x211916,0x796559],prism:[0x151b1b,0x626e67],mimic:[0x1a1d15,0x63705a],wraith:[0x11181b,0x65716d],noise:[0x19201e,0x626c62],remetons:[0x0b0d0a,0x484c41],boonie:[0x222019,0x71674d],void:[0x080c0a,0x313b31],ramyram:[0x121918,0x596960],lore:[0x18191c,0x686675],serp:[0x1d1c15,0x7a735a]};
export function creaturePalette(kind:MonsterKind){return PALETTES[kind];}
function random(seed:number){let s=seed>>>0;return ()=>((s=(Math.imul(s,1664525)+1013904223)>>>0)/4294967296);}
export function enhanceCreature(root:THREE.Group,kind:MonsterKind,accent:number){
 const surface=SURFACES[kind],seed=[...kind].reduce((a,c)=>a+c.charCodeAt(0),0),rand=random(seed*13);
 root.userData.surfaceStyle=surface;root.userData.detailedCreature=true;
 const source:THREE.Mesh[]=[];root.traverse(n=>{if(n instanceof THREE.Mesh&&!(n instanceof THREE.InstancedMesh))source.push(n);});
 const materials=new Set<THREE.Material>();
 for(const node of source){
  if(kind==='void'&&node.geometry.type==='SphereGeometry'&&node.scale.y>1){node.material=new THREE.MeshPhysicalMaterial({color:0x19251c,roughness:.8,metalness:0});}
  const mat=node.material as THREE.MeshPhysicalMaterial;
  if(mat instanceof THREE.MeshPhysicalMaterial&&!mat.userData.eyeSurface){
   materials.add(mat);
   if(node.geometry.type==='SphereGeometry'||node.geometry.type==='TubeGeometry'){
    const g=node.geometry.clone(),p=g.attributes.position,amplitude=node.geometry.type==='SphereGeometry'?.027:.005;
    for(let i=0;i<p.count;i++){
     const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
     const fold=Math.sin(x*17+y*4+seed)*Math.sin(y*13+z*7)*Math.cos(z*11-x*5);
     const d=fold*amplitude;
     // Coordinate-based displacement keeps coincident seam vertices together.
     p.setXYZ(i,x*(1+d),y*(1+d*.65),z*(1+d));
    }
    g.computeVertexNormals();g.computeBoundingSphere();node.geometry.dispose();node.geometry=g;
   }
  }
 }
 materials.forEach(m=>{const mat=m as THREE.MeshPhysicalMaterial;mat.userData.creatureSurface=surface;mat.envMapIntensity=.35;if(surface==='slime'){mat.roughness=.16;mat.clearcoat=.9;mat.clearcoatRoughness=.09;}else if(surface==='chitin'){mat.roughness=.39;mat.clearcoat=.42;mat.clearcoatRoughness=.2;}else if(surface==='cloth'){mat.roughness=.91;mat.clearcoat=0;}else if(surface==='stone'){mat.roughness=.72;mat.clearcoat=.15;}});
 const bodies=source.filter(n=>n.geometry.type==='SphereGeometry'&&!(n.material as THREE.Material).userData.eyeSurface&&(n.material as THREE.Material) instanceof THREE.MeshPhysicalMaterial).sort((a,b)=>b.scale.x*b.scale.y*b.scale.z-a.scale.x*a.scale.y*a.scale.z).slice(0,2);
 const plateMaterial=surface==='stone'?makeRockMaterial('slab'):new THREE.MeshStandardMaterial({color:surface==='skin'?0x6f6654:surface==='chitin'?0x3f493c:0x383a30,roughness:surface==='chitin'?.42:.72,metalness:0,envMapIntensity:.4});
 for(const [bodyIndex,body] of bodies.entries()){
  const count=surface==='cloth'?8:surface==='slime'?10:20;
  const armor=new THREE.InstancedMesh(fractureGeometry(1),plateMaterial,count),matrix=new THREE.Object3D();
  for(let i=0;i<count;i++){
   const angle=Math.PI+(rand()-.5)*Math.PI*1.5,y=(rand()-.5)*1.6,r=Math.sqrt(Math.max(.05,1-y*y));
   // Back and flank plates retain the facial silhouette and readable eyes.
   matrix.position.set(Math.sin(angle)*r,y,Math.cos(angle)*r*.94);
   matrix.rotation.set((rand()-.5)*.5,angle,(rand()-.5)*.6);
   matrix.scale.set(.18+rand()*.18,.1+rand()*.2,surface==='slime'?.055:.07+rand()*.08);matrix.updateMatrix();armor.setMatrixAt(i,matrix.matrix);
  }
  armor.name=`${surface}-anatomical-ridges`;armor.castShadow=true;armor.receiveShadow=true;armor.computeBoundingSphere();body.add(armor);
  if(surface==='stone'||surface==='chitin'){
   const gems=new THREE.InstancedMesh(crystalGeometry(accent),crystalMaterial(accent),bodyIndex===0?10:6);
   for(let i=0;i<gems.count;i++){
    const x=(rand()-.5)*1.25,y=.25+rand()*.5,z=-Math.sqrt(Math.max(.1,1-x*x-y*y));
    matrix.position.set(x,y,z);matrix.rotation.set(-.7-rand()*.5,rand()*6.28,(rand()-.5)*.8);matrix.scale.set(.45+rand()*.4,.16+rand()*.65,.5+rand()*.4);matrix.updateMatrix();gems.setMatrixAt(i,matrix.matrix);
   }
   gems.name='embedded-mineral-spines';gems.castShadow=false;gems.receiveShadow=true;gems.computeBoundingSphere();body.add(gems);
  }
 }
 // Raised tendon/vein networks add actual silhouette detail to organic bodies.
 if(surface==='skin'||surface==='slime')for(const side of [-1,1])for(let i=0;i<3;i++){
  const focus=root.userData.focusY??1.8,y=.65+i*.3,x=side*(.2+i*.11);
  const points=[new THREE.Vector3(x,Math.min(y,focus-.3),-.18),new THREE.Vector3(x+side*.07,y+.25,-.24),new THREE.Vector3(x*.8,y+.55,-.17)];
  const tendon=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),9,surface==='slime'?.023:.017,5,false),new THREE.MeshStandardMaterial({color:surface==='slime'?0x543a32:0x9a8973,roughness:.5}));tendon.name='raised-tendon';tendon.castShadow=true;root.add(tendon);
 }
 if(surface==='cloth'){
  const cloth=new THREE.MeshStandardMaterial({color:PALETTES[kind][0],roughness:.96,side:THREE.DoubleSide});
  const p:number[]=[],indices:number[]=[],segments=18;
  for(let row=0;row<7;row++)for(let i=0;i<=segments;i++){
   const a=Math.PI*.25+i/segments*Math.PI*1.5,y=.12+row*.30,r=.3+(1-row/6)*.22;
   p.push(Math.sin(a)*(r+Math.sin(i*3.2)*.035),y+(row===0?rand()*.16:0),-Math.cos(a)*(r*.7));
  }
  for(let row=0;row<6;row++)for(let i=0;i<segments;i++){const a=row*(segments+1)+i,b=a+1,c=a+segments+1,d=c+1;indices.push(a,c,b,b,c,d);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(indices);g.computeVertexNormals();const shroud=new THREE.Mesh(g,cloth);shroud.name='tattered-cloth-folds';shroud.castShadow=true;shroud.receiveShadow=true;if(kind==='wraith'){cloth.transparent=true;cloth.opacity=.5;}root.add(shroud);
 }
 // Teeth, static eyes and other unanimated pieces can share a draw call. Keep
 // articulated nodes, named parts and their attached armor as independent meshes.
 const batches=new Map<THREE.Material,THREE.Mesh[]>();
 for(const n of [...root.children]){
  if(!(n instanceof THREE.Mesh)||!n.geometry.index||n instanceof THREE.InstancedMesh||n.children.length||n.name||Array.isArray(n.material)||Object.keys(n.userData).length)continue;
  const list=batches.get(n.material)??[];list.push(n);batches.set(n.material,list);
 }
 for(const [material,nodes] of batches){
  if(nodes.length<3)continue;
  const geometries=nodes.map(n=>{n.updateMatrix();return n.geometry.clone().applyMatrix4(n.matrix);});
  const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());
  if(!geometry)continue;
  const mesh=new THREE.Mesh(geometry,material);mesh.name='static-creature-anatomy';mesh.castShadow=true;mesh.receiveShadow=true;
  nodes.forEach(n=>{root.remove(n);n.geometry.dispose();});root.add(mesh);
 }
 return root;
}
