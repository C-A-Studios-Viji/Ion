import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

function rippleNormal(){
 const size=64,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size*Math.PI*2,v=y/size*Math.PI*2;
  const n=new THREE.Vector3(.3*Math.cos(u*3+v*2)+.15*Math.cos(u*7-v*4),.3*Math.cos(v*4-u*2),1).normalize();
  data.set([(n.x*.5+.5)*255,(n.y*.5+.5)*255,(n.z*.5+.5)*255,255],(y*size+x)*4);
 }
 const t=new THREE.DataTexture(data,size,size);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.needsUpdate=true;t.magFilter=THREE.LinearFilter;return t;
}
export function addFloodedScenery(group:THREE.Group,width:number,length:number){
 const root=new THREE.Group();root.name='flooded-cistern';root.userData.layoutGeometry=true;root.userData.cosmeticOnly=true;
 const normal=rippleNormal();normal.repeat.set(width/4,length/4);
 const material=new THREE.MeshPhysicalMaterial({color:0x0c3a35,roughness:.18,metalness:.18,clearcoat:1,clearcoatRoughness:.12,transparent:true,opacity:.76,normalMap:normal,normalScale:new THREE.Vector2(.4,.4),envMapIntensity:.9});
 const geometry=new THREE.PlaneGeometry(width-.6,length-.6,24,48);geometry.rotateX(-Math.PI/2);
 const base=new Float32Array(geometry.attributes.position.array);geometry.userData.basePositions=base;
 const water=new THREE.Mesh(geometry,material);water.name='rippled-floodwater';water.position.y=.16;water.receiveShadow=true;water.userData.water=true;root.add(water);
 const steel=new THREE.MeshStandardMaterial({color:0x344742,metalness:.7,roughness:.36});
 const grate:THREE.BufferGeometry[]=[];
 const plank=(w:number,h:number,d:number,x:number,y:number,z:number)=>{const g=new THREE.BoxGeometry(w,h,d);g.translate(x,y,z);grate.push(g);};
 // Visible perforations, solid edge beams and rivets replace an unbroken slab.
 for(let z=-length/2+.25;z<length/2;z+=.38)plank(2.8,.055,.09,0,.345,z);
 for(const x of [-1.42,-.7,0,.7,1.42])plank(.075,.07,length,x,.345,0);
 for(const z of [-length*.25,0,length*.25]){
  for(let x=-width/2+.25;x<width/2;x+=.38)plank(.09,.055,1.8,x,.345,z);
  for(const dz of [-.92,0,.92])plank(width,.07,.075,0,.345,z+dz);
 }
 const merged=mergeGeometries(grate);grate.forEach(g=>g.dispose());
 const deck=new THREE.Mesh(merged,steel);deck.name='wet-metal-grating';deck.castShadow=true;deck.receiveShadow=true;root.add(deck);
 const tideMaterial=new THREE.MeshStandardMaterial({color:0x142f24,roughness:.85,transparent:true,opacity:.8});
 for(const side of [-1,1]){
  const tide=new THREE.Mesh(new THREE.PlaneGeometry(length,.46),tideMaterial);tide.rotation.y=side<0?Math.PI/2:-Math.PI/2;tide.position.set(side*(width/2-.65),.35,0);root.add(tide);
  for(let z=-length/2+3;z<length/2-2;z+=4){
   const lamp=new THREE.Mesh(new THREE.BoxGeometry(.13,.06,.55),new THREE.MeshBasicMaterial({color:0x5abf94,toneMapped:false}));lamp.position.set(side*1.42,.41,z);root.add(lamp);
  }
 }
 const debris=new THREE.MeshStandardMaterial({color:0x4c4634,roughness:.74});
 for(let i=0;i<16;i++){
  const x=(i%2?1:-1)*(2.3+((i*7)%11)/11*(width/2-3.2)),z=-length/2+3+((i*13)%31)/31*(length-6);
  if(Math.min(...[-length*.25,0,length*.25].map(c=>Math.abs(z-c)))<1.5)continue;
  const piece=new THREE.Mesh(new THREE.BoxGeometry(.35+(i%3)*.13,.08,.2+(i%4)*.15),debris);piece.position.set(x,.21,z);piece.rotation.y=i*1.8;piece.userData.floatPhase=i;root.add(piece);
 }
 group.add(root);return root;
}
export function animateFloodedScenery(group:THREE.Group,time:number){
 const root=group.getObjectByName('flooded-cistern');if(!root)return;
 const water=root.getObjectByName('rippled-floodwater') as THREE.Mesh<THREE.PlaneGeometry,THREE.MeshPhysicalMaterial>;
 const p=water.geometry.attributes.position,base=water.geometry.userData.basePositions as Float32Array;
 for(let i=0;i<p.count;i++){const x=base[i*3],z=base[i*3+2];p.setY(i,.018*Math.sin(x*1.8+time*.8)+.012*Math.sin(z*2.2-time*.6));}
 p.needsUpdate=true;water.material.normalMap!.offset.set(time*.008,time*.004);
 root.children.forEach(c=>{if(c.userData.floatPhase!==undefined)c.position.y=.21+Math.sin(time*.7+c.userData.floatPhase)*.025;});
}
