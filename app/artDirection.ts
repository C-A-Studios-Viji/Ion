import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { roomFloor, type RoomType } from './roomTypes';
export function createFacilitySurfaces(){
 const size=128,data=new Uint8Array(size*size*4);
 let seed=1283;for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const seam=x<2||y<2,grain=seed%16;
  const c=seam?45:150+grain;const i=(y*size+x)*4;
  data[i]=c;data[i+1]=c+3;data[i+2]=c+6;data[i+3]=255;
 }
 const texture=new THREE.DataTexture(data,size,size);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(6,10);texture.needsUpdate=true;
 return {texture,metal:new THREE.MeshStandardMaterial({color:0x36414a,map:texture,roughness:.72,metalness:.48}),stone:new THREE.MeshStandardMaterial({color:0x2a3239,map:texture,roughness:.92,metalness:.06})};
}
export function studioEnvironment(renderer:THREE.WebGLRenderer,scene:THREE.Scene){
 // Renderer-free encounter tests do not expose GPU capabilities.
 if(!renderer.capabilities)return ()=>{};
 const generator=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();
 const environment=generator.fromScene(room,.04);scene.environment=environment.texture;scene.environmentIntensity=.28;room.dispose();generator.dispose();
 return ()=>{scene.environment=null;environment.dispose();};
}
export function dressFacility(group:THREE.Group,width:number,length:number,height:number,type:RoomType,door:number){
 const amber=new THREE.MeshStandardMaterial({color:0xffbc62,emissive:0xffad44,emissiveIntensity:2.2,roughness:.5});
 const metal=new THREE.MeshStandardMaterial({color:0x28333d,metalness:.65,roughness:.5});
 const cyan=new THREE.MeshStandardMaterial({color:0x8df7ef,emissive:0x37b7c5,emissiveIntensity:1.6});
 const count=Math.max(4,Math.floor(length/5));const matrix=new THREE.Matrix4();
 const ribs=new THREE.InstancedMesh(new THREE.BoxGeometry(.14,height,.24),metal,count*2);
 const panels=new THREE.InstancedMesh(new THREE.BoxGeometry(.12,1.15,2.5),metal.clone(),count*2);
 const guides=new THREE.InstancedMesh(new THREE.BoxGeometry(.12,.08,1.8),cyan,count*2);
 let index=0;for(let i=0;i<count;i++)for(const side of [-1,1]){
  const z=length/2-3-i*(length-6)/(count-1),y=roomFloor(type,length,z);
  ribs.setMatrixAt(index,matrix.makeTranslation(side*(width/2-.4),height/2,z));
  panels.setMatrixAt(index,matrix.makeTranslation(side*(width/2-.43),y+.8,z));
  guides.setMatrixAt(index,matrix.makeTranslation(side*(width/2-.65),y+.18,z));index++;
 }
 ribs.name='facility-structural-ribs';panels.name='facility-wall-insets';guides.name='facility-path-lights';
 group.add(ribs,panels,guides);
 const pipes=new THREE.InstancedMesh(new THREE.CylinderGeometry(.11,.11,length-1,8),metal.clone(),3);
 for(let i=0;i<3;i++){matrix.makeRotationX(Math.PI/2);matrix.setPosition(-width/2+1+i*.38,height-.55,0);pipes.setMatrixAt(i,matrix);}group.add(pipes);
 function box(w:number,h:number,d:number,x:number,y:number,z:number,mat:THREE.Material){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);mesh.userData.layoutGeometry=true;group.add(mesh);return mesh;}
 for(const side of [-1,1])for(let i=0;i<6;i++){const stripe=box(.24,.5,.025,side*2.7,1+i*.47,-length/2+.3,i%2?metal.clone():amber.clone());stripe.rotation.z=-.35;}
 // Physical seven-segment door numbers: no font download or canvas dependency.
 const digits=String(door).padStart(3,'0');const patterns=['abcdef','bc','abged','abgcd','fgbc','afgcd','afgecd','abc','abcdefg','abfgcd'];
 for(let i=0;i<digits.length;i++)for(const segment of patterns[Number(digits[i])]){
  const x=(i-(digits.length-1)/2)*.38;
  const pos:Record<string,[number,number,boolean]>={a:[x,5.45,true],g:[x,5.2,true],d:[x,4.95,true],f:[x-.13,5.33,false],b:[x+.13,5.33,false],e:[x-.13,5.07,false],c:[x+.13,5.07,false]};
  const [px,py,horizontal]=pos[segment];box(horizontal?.23:.04,horizontal?.04:.19,.04,px,py+Math.min(0,height-5.9),-length/2+.31,amber.clone());
 }
 const dustData=new Float32Array(100*3);for(let i=0;i<100;i++){dustData[i*3]=(Math.sin(i*71+door)*.5)*width;dustData[i*3+1]=1+(i%7)/7*(height-1);dustData[i*3+2]=Math.cos(i*19+door)*length*.48;}
 const dust=new THREE.BufferGeometry();dust.setAttribute('position',new THREE.BufferAttribute(dustData,3));
 const points=new THREE.Points(dust,new THREE.PointsMaterial({color:0x83b8bc,size:.025,transparent:true,opacity:.3,depthWrite:false}));points.name='facility-dust';group.add(points);
}
