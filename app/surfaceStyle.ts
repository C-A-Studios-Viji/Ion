import * as THREE from "three";

// Smooth shared-position normals without changing UVs, weights, or animation rigs.
export function smoothNormals(geometry: THREE.BufferGeometry) {
  const positions = geometry.getAttribute("position");
  if (!positions) return;
  geometry.computeVertexNormals();
  const normals = geometry.getAttribute("normal");
  const bins = new Map<string, THREE.Vector3>();
  const keys: string[] = [];
  for (let i = 0; i < positions.count; i++) {
    const key = [positions.getX(i),positions.getY(i),positions.getZ(i)].map(v=>Math.round(v*10000)).join(",");
    keys.push(key);
    const sum = bins.get(key) ?? new THREE.Vector3();
    sum.add(new THREE.Vector3().fromBufferAttribute(normals,i)); bins.set(key,sum);
  }
  bins.forEach(n=>n.normalize());
  for (let i=0;i<positions.count;i++) { const n=bins.get(keys[i])!; normals.setXYZ(i,n.x,n.y,n.z); }
  normals.needsUpdate=true;
}

// One midpoint subdivision and gentle Laplacian relaxation rounds static props.
// UVs are retained by interpolation; this is deliberately never applied to rigs.
export function roundStaticGeometry(source: THREE.BufferGeometry) {
  if (source.getAttribute("position").count > 16000) { const g=source.clone(); smoothNormals(g); return g; }
  const raw=source.index ? source.toNonIndexed() : source.clone();
  const attributes = Object.entries(raw.attributes).filter(([name])=>name!=="normal");
  const out=new THREE.BufferGeometry();
  for (const [name,attr] of attributes) {
    const data:number[]=[];
    for(let i=0;i<attr.count;i+=3) {
      const a=Array.from({length:attr.itemSize},(_,j)=>attr.getComponent(i,j));
      const b=Array.from({length:attr.itemSize},(_,j)=>attr.getComponent(i+1,j));
      const c=Array.from({length:attr.itemSize},(_,j)=>attr.getComponent(i+2,j));
      const ab=a.map((v,j)=>(v+b[j])/2),bc=b.map((v,j)=>(v+c[j])/2),ca=c.map((v,j)=>(v+a[j])/2);
      for(const v of [a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca])data.push(...v);
    }
    out.setAttribute(name,new THREE.Float32BufferAttribute(data,attr.itemSize));
  }
  // Preserve material ranges while each original triangle becomes four.
  source.groups.forEach(g=>out.addGroup(g.start*4,g.count*4,g.materialIndex));
  const p=out.getAttribute("position"); const ids:number[]=[]; const index=new Map<string,number>();
  const verts:THREE.Vector3[]=[]; const neighbours:Set<number>[]=[];
  for(let i=0;i<p.count;i++) {
    const v=new THREE.Vector3().fromBufferAttribute(p,i); const k=v.toArray().map(x=>Math.round(x*100000)).join(",");
    let id=index.get(k);if(id===undefined){id=verts.length;index.set(k,id);verts.push(v);neighbours.push(new Set());}ids.push(id);
  }
  for(let i=0;i<ids.length;i+=3)for(let j=0;j<3;j++) {neighbours[ids[i+j]].add(ids[i+(j+1)%3]);neighbours[ids[i+j]].add(ids[i+(j+2)%3]);}
  const rounded=verts.map((v,i)=>{const mean=new THREE.Vector3();neighbours[i].forEach(n=>mean.add(verts[n]));return v.clone().lerp(mean.divideScalar(Math.max(1,neighbours[i].size)),0.14);});
  ids.forEach((id,i)=>p.setXYZ(i,rounded[id].x,rounded[id].y,rounded[id].z));
  smoothNormals(out);raw.dispose();
  return out;
}

export function gradientMaterial(bottom:number,top:number,emission=0.08,stripes=false) {
  const material=new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:0.32,metalness:0.22,clearcoat:0.65,clearcoatRoughness:0.2,emissive:top,emissiveIntensity:emission});
  applyGradient(material,bottom,top,stripes);return material;
}
export function applyGradient(material:THREE.MeshStandardMaterial,bottom:number,top:number,stripes=false) {
  material.onBeforeCompile=shader=>{
    shader.uniforms.ionLow={value:new THREE.Color(bottom)};shader.uniforms.ionHigh={value:new THREE.Color(top)};
    shader.vertexShader=shader.vertexShader.replace("#include <common>","#include <common>\nvarying vec3 ionPoint;").replace("#include <begin_vertex>","#include <begin_vertex>\nionPoint = position;");
    shader.fragmentShader=shader.fragmentShader.replace("#include <common>","#include <common>\nvarying vec3 ionPoint; uniform vec3 ionLow; uniform vec3 ionHigh;");
    shader.fragmentShader=shader.fragmentShader.replace("#include <color_fragment>",`#include <color_fragment>\nfloat ionBlend = 0.5 + 0.5 * sin(ionPoint.y * 1.35 + ionPoint.x * 0.7);\ndiffuseColor.rgb *= mix(ionLow,ionHigh,ionBlend);\n${stripes ? "float bands = sin(ionPoint.x*21.0 + ionPoint.y*3.0 + sin(ionPoint.z*7.0)); diffuseColor.rgb *= mix(0.06,1.0,smoothstep(-0.15,0.15,bands));" : ""}`);
  };
  material.customProgramCacheKey=()=>`ion-gradient-${bottom}-${top}-${stripes}`;
}
