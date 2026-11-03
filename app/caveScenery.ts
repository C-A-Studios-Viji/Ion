import * as THREE from 'three';
import {makeRockMaterial,makeAgedMetal} from './rockMaterials';
import {roomFloor,type RoomType} from './roomTypes';
import {caveFloorRelief} from './caveFloor';
import {makeCaveGroundMaterial} from './caveGroundMaterial';
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
/** A continuous rounded rock envelope. Decorative geometry never enters the
 * collision list; the player retains the original smooth movement profile. */
export function addCaveScenery(group:THREE.Group,w:number,l:number,h:number,type:RoomType,seed:number,clearPoints:THREE.Vector3[]=[]){
 const root=new THREE.Group();root.name='cinematic-cave-shell';root.userData.cosmeticOnly=true;root.userData.layoutGeometry=true;
 const material=makeCaveGroundMaterial(),cols=Math.ceil(l/.45),rows=28;
 const lower=.95,upper=Math.min(1.7,h*.23),half=w/2-.26;
 const wave=(a:number,z:number)=>.16+.16*Math.sin(a*2.2+z*.83+seed*.31)+.09*Math.sin(a*5.1-z*2.3);
 const wallPoint=(side:number,t:number,z:number)=>{
  const base=roomFloor(type,l,z),ceiling=h+Math.min(0,base);
  let x:number,y:number,weight:number;
  if(t<=.25){
   const a=t/.25*Math.PI/2;x=half-lower+lower*Math.sin(a);
   const foot=caveFloorRelief(side*(half-lower),z,w,l,clearPoints);
   y=base+foot+(lower-foot)*(1-Math.cos(a));weight=Math.sin(a);
  }else if(t<=.72){
   const f=(t-.25)/.47;x=half;y=THREE.MathUtils.lerp(base+lower,ceiling-upper,f);weight=1;
  }else{
   const a=(t-.72)/.28*Math.PI/2;x=half-upper+upper*Math.cos(a);
   y=ceiling-upper+upper*Math.sin(a);weight=Math.cos(a);
  }
  x-=wave(y,z)*weight;
  return new THREE.Vector3(side*x,y,z);
 };
 // Unfold the same ground UVs along each rounded side. Both UV axes now
 // continue at floor/wall and wall/vault seams, including on ramped floors.
 const wallUV=new Map<string,number[]>();
 const wallU=(side:number,row:number,z:number)=>{
  const key=`${side}:${z}`;
  let values=wallUV.get(key);
  if(!values){
   values=[side*(half-lower)/2.4];let distance=0,previous=wallPoint(side,0,z);
   for(let r=1;r<=rows;r++){const next=wallPoint(side,r/rows,z);distance+=next.distanceTo(previous);previous=next;values.push(side*(half-lower+distance)/2.4);}
   wallUV.set(key,values);
  }
  return values[row];
 };
 function mesh(name:string,points:number[],indices:number[],uvs:number[],colors:number[]){
  const g=uvGeometry(points,indices);g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeBoundingBox();g.computeBoundingSphere();
  const m=new THREE.Mesh(g,material);m.name=name;m.castShadow=true;m.receiveShadow=true;root.add(m);return m;
 }
 for(const side of [-1,1]){
  const p:number[]=[],idx:number[]=[],uv:number[]=[],col:number[]=[];
  for(let row=0;row<=rows;row++)for(let z=0;z<=cols;z++){
   const zz=-l/2+z*l/cols,v=wallPoint(side,row/rows,zz);p.push(v.x,v.y,v.z);uv.push(wallU(side,row,zz),zz/2.4);
   const shade=.64+wave(v.y,zz)*.4;col.push(shade,shade,shade*.98);
  }
  for(let y=0;y<rows;y++)for(let z=0;z<cols;z++){const a=y*(cols+1)+z,b=a+1,c=a+cols+1,d=c+1;if(side<0)idx.push(a,c,b,b,c,d);else idx.push(a,b,c,b,d,c);}
  mesh('folded-rock-wall',p,idx,uv,col);
 }
 // The crown shares its first and last vertices with the upper wall curves.
 const p:number[]=[],idx:number[]=[],uv:number[]=[],col:number[]=[],across=Math.ceil(w/.45);
 const crownX=half-upper;
 for(let x=0;x<=across;x++)for(let z=0;z<=cols;z++){
  const t=x/across,xx=THREE.MathUtils.lerp(-crownX,crownX,t),zz=-l/2+z*l/cols;
  const arch=Math.sin(t*Math.PI),relief=arch*(.28+wave(xx,zz)*1.7);
  p.push(xx,h+Math.min(0,roomFloor(type,l,zz))-relief,zz);uv.push(THREE.MathUtils.lerp(wallU(-1,rows,zz),wallU(1,rows,zz),t),zz/2.4);
  const shade=.69-relief*.12;col.push(shade,shade,shade*.98);
 }
 for(let x=0;x<across;x++)for(let z=0;z<cols;z++){const a=x*(cols+1)+z,b=a+1,c=a+cols+1,d=c+1;idx.push(a,c,b,b,c,d);}
 mesh('broken-cave-vault',p,idx,uv,col);
 // End caps carry the same uneven rock. The exit aperture remains completely
 // empty, including above ramps and in the larger multi-floor layouts.
 for(const side of [-1,1]){
  const p:number[]=[],idx:number[]=[],uv:number[]=[],col:number[]=[],nx=Math.ceil(w/.45),ny=Math.ceil(h/.4);
  for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++){
   const xx=-w/2+x*w/nx,yy=y*h/ny,edge=THREE.MathUtils.smoothstep(Math.abs(xx),w*.25,w*.5);
   const inset=(.26+wave(xx+yy,side*l/2)*.8)*(1-edge);
   p.push(xx,yy,side*(l/2-.24-inset));uv.push(xx/2.4,(side*l/2-side*yy)/2.4);const shade=.68+wave(xx,yy)*.3;col.push(shade,shade,shade*.98);
  }
  for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
   const x0=-w/2+x*w/nx,x1=x0+w/nx,y0=y*h/ny;
   if(side<0&&x0<2.65&&x1> -2.65&&y0<4.6)continue;
   const a=y*(nx+1)+x,b=a+1,c=a+nx+1,d=c+1;
   if(side<0)idx.push(a,b,c,b,d,c);else idx.push(a,c,b,b,c,d);
  }
  mesh(side<0?'cave-exit-rock':'cave-entry-rock',p,idx,uv,col);
 }
 // Broad strata in a few baked meshes provide silhouette relief without
 // instancing or shader hooks, including in mobile Performance mode.
 for(let sideIndex=0;sideIndex<2;sideIndex++){
  const side=sideIndex?1:-1,points:number[]=[],normals:number[]=[],uvs:number[]=[],colors:number[]=[];
  const source=fractureGeometry(1),sp=source.attributes.position,sn=source.attributes.normal;
  const rand=rng(seed*41+sideIndex+17),v=new THREE.Vector3(),n=new THREE.Vector3(),matrix=new THREE.Matrix4(),normal=new THREE.Matrix3();
  let count=0;
  for(let z=-l/2+1.5;z<l/2-1.5;z+=1.7)for(let y=1.6;y<h-upper-.3;y+=1.55){
   const base=roomFloor(type,l,z);if(y<base+1.2)continue;
   const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(rand()*.3,rand()*.3,(rand()-.5)*.5));
   matrix.compose(new THREE.Vector3(side*(half+.13),y,z+(rand()-.5)*.5),q,new THREE.Vector3(.42,.45+rand()*.3,.7+rand()*.35));normal.getNormalMatrix(matrix);
   const shade=.6+rand()*.18;count++;
   for(let i=0;i<sp.count;i++){v.fromBufferAttribute(sp,i).applyMatrix4(matrix);n.fromBufferAttribute(sn,i).applyNormalMatrix(normal);points.push(v.x,v.y,v.z);normals.push(n.x,n.y,n.z);const wallRow=Math.round(THREE.MathUtils.clamp((v.y-roomFloor(type,l,v.z)-lower)/(h+Math.min(0,roomFloor(type,l,v.z))-upper-roomFloor(type,l,v.z)-lower),0,1)*(.72-.25)*rows+.25*rows);
    uvs.push(wallU(side,wallRow,v.z),v.z/2.4);colors.push(shade,shade,shade*.98);}
  }
  source.dispose();const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeBoundingSphere();
  const m=new THREE.Mesh(g,material);m.name='layered-wall-fragments';m.userData.rockCount=count;m.castShadow=true;m.receiveShadow=true;root.add(m);
 }
 addIndustrialScenery(root,w,l,h,seed,true);group.add(root);return root;
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
