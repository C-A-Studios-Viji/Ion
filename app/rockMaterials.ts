import * as THREE from 'three';

// World-space, seamless mineral detail. No texture requests or UV seams, even on
// instanced fragments. Layers run through the geometry rather than over its UVs.
const noiseGLSL=`
float ionHash(vec3 p){p=fract(p*.3183099+vec3(.13,.71,.37));p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float ionNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(ionHash(i),ionHash(i+vec3(1,0,0)),f.x),mix(ionHash(i+vec3(0,1,0)),ionHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(ionHash(i+vec3(0,0,1)),ionHash(i+vec3(1,0,1)),f.x),mix(ionHash(i+vec3(0,1,1)),ionHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float ionStone(vec3 p){return .52*ionNoise(p)+.27*ionNoise(p*2.03)+.14*ionNoise(p*4.17)+.07*ionNoise(p*8.13);}
`;
export function makeRockMaterial(kind:'wall'|'ground'|'slab'='wall'){
 const material=new THREE.MeshStandardMaterial({color:0x918774,roughness:.91,metalness:0,envMapIntensity:.12});
 material.name=`stratified-${kind}`;material.userData.proceduralRock=true;
 material.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 ionRockPosition;');
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`vec4 ionWorld=vec4(transformed,1.0);
#ifdef USE_INSTANCING
ionWorld=instanceMatrix*ionWorld;
#endif
ionRockPosition=(modelMatrix*ionWorld).xyz;
#include <project_vertex>`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>\nvarying vec3 ionRockPosition;\n${noiseGLSL}`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
vec3 ionP=ionRockPosition;
float ionBroad=ionStone(ionP*1.1);
float ionLamina=sin(ionP.y*14.0+ionP.x*1.5+ionStone(ionP*1.8)*12.0);
float ionVein=pow(1.0-abs(ionLamina),14.0);
float ionGrain=ionNoise(ionP*73.0);
float ionCrack=smoothstep(.03,.13,abs(sin(ionP.x*6.0+ionP.z*5.0+ionBroad*15.0)));
float ionDamp=smoothstep(.47,.72,ionStone(ionP*.48));
vec3 ionDry=mix(vec3(.18,.165,.14),vec3(.65,.61,.52),smoothstep(.22,.78,ionBroad));
ionDry*=mix(.57,1.06,ionCrack)*(1.0-ionVein*.26)*(.86+ionGrain*.27);
diffuseColor.rgb*=mix(ionDry,ionDry*vec3(.45,.51,.48),ionDamp*.65);`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>\nroughnessFactor=clamp(.91-ionDamp*.48+ionGrain*.08,.37,1.0);`);
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
float ionRelief=ionStone(ionP*5.0)*.20+ionLamina*.012+ionGrain*.006;
vec3 ionDx=dFdx(-vViewPosition),ionDy=dFdy(-vViewPosition);
vec3 ionR1=cross(ionDy,normal),ionR2=cross(normal,ionDx);
float ionDet=dot(ionDx,ionR1);
vec3 ionGrad=sign(ionDet)*(dFdx(ionRelief)*ionR1+dFdy(ionRelief)*ionR2);
normal=normalize(max(abs(ionDet),.000001)*normal-ionGrad*.64);`);
 };
 material.customProgramCacheKey=()=>`ion-stratified-rock-v1-${kind}`;return material;
}
export function makeAgedMetal(){
 const m=new THREE.MeshStandardMaterial({color:0x55554c,metalness:.68,roughness:.66,envMapIntensity:.25});
 m.name='weathered-facility-steel';
 m.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 ionMetalPoint;').replace('#include <begin_vertex>','#include <begin_vertex>\nionMetalPoint=position;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 ionMetalPoint;\n'+noiseGLSL);
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
float patina=ionStone(ionMetalPoint*8.0);
float scratches=pow(abs(sin(ionMetalPoint.y*143.0+ionNoise(ionMetalPoint*19.0)*8.0)),48.0);
diffuseColor.rgb*=mix(vec3(.24,.20,.15),vec3(.9,.94,.88),smoothstep(.32,.67,patina));diffuseColor.rgb+=scratches*.025;`);
 };
 m.customProgramCacheKey=()=> 'ion-aged-metal-v1';return m;
}
