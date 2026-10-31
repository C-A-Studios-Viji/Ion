import * as THREE from 'three';

// Shared, baked mineral maps. Stock Three materials sample byte textures; there
// are no shader substitutions, network texture requests, or float-buffer needs.
let maps: {map:THREE.DataTexture;normalMap:THREE.DataTexture;roughnessMap:THREE.DataTexture}|undefined;
function groundMaps(){
 if(maps)return maps;
 const size=256,heights=new Float32Array(size*size),colour=new Uint8Array(size*size*4),normal=new Uint8Array(size*size*4),rough=new Uint8Array(size*size*4);
 const hash=(x:number,y:number)=>{const v=Math.sin(x*127.1+y*311.7)*43758.5453;return v-Math.floor(v);};
 const noise=(x:number,y:number,period:number)=>{
  x=x/size*period;y=y/size*period;const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
  const at=(a:number,b:number)=>hash((a+period)%period,(b+period)%period);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(at(ix,iy),at(ix+1,iy),u),THREE.MathUtils.lerp(at(ix,iy+1),at(ix+1,iy+1),u),v);
 };
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=y*size+x,broad=noise(x,y,4),grain=noise(x,y,64),fine=hash(x,y);
  const seam=Math.pow(1-Math.abs(Math.sin(x/size*Math.PI*6+y/size*Math.PI*4+noise(x,y,8)*4)),14);
  heights[i]=broad*.48+noise(x,y,16)*.25+grain*.12+fine*.035-seam*.22;
  const shade=82+broad*58+grain*28+fine*14-seam*49;
  colour.set([shade,shade*.99,shade*.94,255],i*4);
  const wet=THREE.MathUtils.smoothstep(broad,.48,.78),r=238-wet*122;
  rough.set([r,r,r,255],i*4);
 }
 const at=(x:number,y:number)=>heights[((y+size)%size)*size+(x+size)%size];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const n=new THREE.Vector3((at(x-1,y)-at(x+1,y))*3,(at(x,y-1)-at(x,y+1))*3,1).normalize();
  normal.set([(n.x*.5+.5)*255,(n.y*.5+.5)*255,(n.z*.5+.5)*255,255],(y*size+x)*4);
 }
 function texture(data:Uint8Array,srgb=false){
  const t=new THREE.DataTexture(data,size,size,THREE.RGBAFormat,THREE.UnsignedByteType);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.needsUpdate=true;return t;
 }
 maps={map:texture(colour,true),normalMap:texture(normal),roughnessMap:texture(rough)};return maps;
}
export function makeCaveGroundMaterial(){
 const m=new THREE.MeshStandardMaterial({...groundMaps(),color:0xffffff,vertexColors:true,roughness:1,metalness:.06,normalScale:new THREE.Vector2(.7,.7),envMapIntensity:.35,emissive:0x101510,emissiveIntensity:.12,flatShading:true});
 m.name='damp-fractured-bedrock';return m;
}
