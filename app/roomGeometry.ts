import * as THREE from 'three';
import {floorProfile,mazeBarriers,type RoomType} from './roomTypes';
export function buildRoomGeometry(group:THREE.Group,type:RoomType,width:number,length:number,height:number){
 const obstacles:THREE.Box3[]=[];
 const metal=new THREE.MeshStandardMaterial({color:0x304859,roughness:.6,metalness:.5});
 function box(w:number,h:number,d:number,x:number,y:number,z:number,solid=false,material=metal){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.userData.layoutGeometry=true;m.castShadow=true;m.receiveShadow=true;group.add(m);if(solid)obstacles.push(new THREE.Box3().setFromObject(m));return m;}
 if(['duplex','multifloor','basement','collapsed'].includes(type)){
  group.children.filter(c=>c.userData.facilityFloor).forEach(c=>{group.remove(c);if(c instanceof THREE.Mesh)c.geometry.dispose();});
  const p=floorProfile(type,length);
  for(let i=1;i<p.length;i++){const [z1,y1]=p[i-1],[z2,y2]=p[i],dz=z1-z2,dy=y1-y2;const m=box(width,.18,Math.hypot(dz,dy),0,(y1+y2)/2-.09,(z1+z2)/2);m.rotation.x=-Math.atan2(dy,dz);
   // Side railings mark traversable ramps and floor changes.
   for(const side of [-1,1]){const rail=box(.12,1,Math.hypot(dz,dy),side*(width/2-.6),(y1+y2)/2+.6,(z1+z2)/2);rail.rotation.x=m.rotation.x;}
  }
  if(type==='basement'){for(const side of [-1,1])box(.5,4,length,side*width/2,-2,0);}
  if(type==='basement')for(let i=0;i<6;i++)box(width,.25,.25,0,1.8,-length*.25+i*length*.1);
  if(type==='multifloor')for(const side of [-1,1])box(1,height,1,side*(width/2-1),height/2,0);
 }
 if(type==='maze')for(const [i,b] of mazeBarriers(width,length).entries()){
  box(b.width,3,.65,b.side*3,1.5,b.z,true);
  box(.18,1.8,.18,b.gapX,1,b.z,false,new THREE.MeshStandardMaterial({color:0x33ffcc,emissive:0x33ffcc,emissiveIntensity:2}));
  if(i<4)box(.5,3,3,b.side*width*.2,1.5,b.z-2.2,true);
 }
 if(type==='observation'){
  const glass=new THREE.MeshStandardMaterial({color:0x80dfff,transparent:true,opacity:.28,roughness:.15,metalness:.15});
  box(.2,3.5,length-12,0,1.75,0,true,glass);for(const z of [-(length-12)/2,(length-12)/2])box(.3,3.7,.3,0,1.85,z);
 }
 if(type==='grand')for(const x of [-width*.3,width*.3])for(const z of [-length*.22,length*.22])box(1.2,height,1.2,x,height/2,z,true);
 if(type==='flooded'){
  const water=new THREE.Mesh(new THREE.PlaneGeometry(width,length),new THREE.MeshStandardMaterial({color:0x073e56,transparent:true,opacity:.8,roughness:.12}));water.userData.layoutGeometry=true;water.rotation.x=-Math.PI/2;water.position.y=.18;group.add(water);
  // Grated raised paths connect the entrance, exit and supply islands.
  box(3,.15,length,0,.24,0);for(const z of [-length*.25,0,length*.25])box(width,.15,2,0,.24,z);
 }
 if(type==='collapsed')for(let i=0;i<5;i++){const slab=box(1,.8,2,(i%2?1:-1)*(width/2-2),.5,-length/2+6+i*5);slab.rotation.z=(i%2?1:-1)*.4;}
 if(type==='inversion'){
  for(let i=0;i<5;i++){const furniture=box(2,.7,1.5,(i%2?1:-1)*3,height-.6,-length/2+5+i*5);furniture.rotation.z=Math.PI;}
  for(const x of [-3,3])for(const z of [-length*.2,length*.2])box(2,2.3,1,x,1.15,z,true);
 }
 // Emissive route markers remain visible with an empty flashlight.
 for(let i=0;i<7;i++){const m=box(.18,.08,.5,(i%2?1:-1)*(width/2-.4),.3,length/2-3-i*(length-6)/6,false,new THREE.MeshStandardMaterial({color:0x44eedd,emissive:0x44eedd,emissiveIntensity:2}));m.userData.routeMarker=true;}
 return obstacles;
}
