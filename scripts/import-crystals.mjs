// Convert iPoly3D's CC0 original STL meshes to normalized, portable ASCII STL.
// Usage: node scripts/import-crystals.mjs /path/to/extracted-pack/STL
import fs from 'node:fs';
import path from 'node:path';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { Mesh,MeshBasicMaterial } from 'three';
const selected={malachite:24,amethyst:4,quartz:22,obsidian:1,citrine:21,fluorite:23,corrupted:2};
if(!process.argv[2])throw Error('Pass the extracted source STL directory');
for(const [name,index] of Object.entries(selected)){
 const bytes=fs.readFileSync(path.join(process.argv[2],`cristalscrystal_${index}.stl`));
 const geometry=new STLLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 geometry.rotateX(-Math.PI/2);geometry.computeBoundingBox();const b=geometry.boundingBox;
 geometry.translate(-(b.max.x+b.min.x)/2,-b.min.y,-(b.max.z+b.min.z)/2);
 geometry.scale(1/(b.max.y-b.min.y),1/(b.max.y-b.min.y),1/(b.max.y-b.min.y));geometry.computeVertexNormals();
 const mesh=new Mesh(geometry,new MeshBasicMaterial());
 const output=new STLExporter().parse(mesh).replace(/-?\d+\.\d+(?:e[+-]?\d+)?/gi,n=>String(Number(Number(n).toFixed(6))));
 fs.writeFileSync(`app/assets/minerals/${name}.stl`,output);console.log(name,geometry.attributes.position.count/3,'triangles');geometry.dispose();mesh.material.dispose();
}
