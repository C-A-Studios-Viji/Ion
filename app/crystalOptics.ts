import * as THREE from 'three';
/** Refraction is rendered by Three's transmission pass; opacity remains one. */
export function configureCrystalOptics(material:THREE.MeshPhysicalMaterial,color:number){
 material.color.setHex(0xffffff);material.metalness=0;material.roughness=.055;
 material.transmission=.88;material.thickness=.22;material.ior=1.48;
 material.attenuationColor.setHex(color).lerp(new THREE.Color(0xffffff),.25);material.attenuationDistance=1.8;
 material.clearcoat=1;material.clearcoatRoughness=.035;
 material.dispersion=.12;material.envMapIntensity=1.15;
 material.emissive.setHex(color);material.emissiveIntensity=.006;
 material.transparent=false;material.opacity=1;material.depthWrite=true;
 material.userData.crystalOptics=true;return material;
}
export function crystalMaterial(color:number){return configureCrystalOptics(new THREE.MeshPhysicalMaterial({vertexColors:true,flatShading:true}),color);}
