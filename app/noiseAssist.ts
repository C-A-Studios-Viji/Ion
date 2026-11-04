import * as THREE from 'three';

export type CapsuleTarget={object:THREE.Object3D;kind:'deposit'|'cabinet'|'offering'|'capsule'};
/** Emergency capsule silhouettes use ordinary unlit geometry, even through walls. */
export function updateNoiseAssist(room:THREE.Group,targets:CapsuleTarget[],active:boolean,seconds:number){
 let root=room.getObjectByName('noise-emergency-xray') as THREE.Group|undefined;
 const enabled=active&&seconds>0&&seconds<=10;
 if(!root&&!enabled)return;
 if(!root){root=new THREE.Group();root.name='noise-emergency-xray';root.userData.layoutGeometry=true;room.add(root);}
 root.visible=enabled;
 const wanted=new Set(enabled?targets.map(t=>t.object.uuid):[]);
 for(const marker of [...root.children])if(!wanted.has(marker.userData.target)){
  root.remove(marker);marker.traverse(n=>{if(n instanceof THREE.Mesh){n.geometry.dispose();(n.material as THREE.Material).dispose();}});
 }
 if(!enabled)return;
 for(const target of targets){
  let marker=root.children.find(c=>c.userData.target===target.object.uuid);
  if(!marker){
   marker=new THREE.Group();marker.name='red-capsule-xray';marker.userData.target=target.object.uuid;marker.userData.kind=target.kind;
   const material=new THREE.MeshBasicMaterial({color:0xff193c,transparent:true,opacity:.95,depthTest:false,depthWrite:false,toneMapped:false});
   const capsule=new THREE.Mesh(new THREE.CapsuleGeometry(.18,.45,4,8),material);capsule.renderOrder=10000;
   const ring=new THREE.Mesh(new THREE.TorusGeometry(.48,.035,4,20),material.clone());ring.rotation.x=Math.PI/2;ring.renderOrder=10001;
   marker.add(capsule,ring);root.add(marker);
  }
  marker.position.copy(target.object.position);
  marker.scale.setScalar(1+.1*Math.sin(seconds*6));
 }
}
