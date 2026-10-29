import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {STLLoader} from 'three/addons/loaders/STLLoader.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
test('seven distinct CC0 STL minerals have finite facets and normalized grounded geometry',()=>{
 const hashes=new Set();
 for(const name of ['malachite','amethyst','quartz','obsidian','citrine','fluorite','corrupted']){
  const bytes=fs.readFileSync(path.join(root,'app/assets/minerals',name+'.stl'));hashes.add(createHash('sha256').update(bytes).digest('hex'));
  const geometry=new STLLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
  assert(geometry.attributes.position.count/3<1000);assert(geometry.attributes.position.count>300);
  for(const n of geometry.attributes.position.array)assert(Number.isFinite(n));
  geometry.computeBoundingBox();assert(Math.abs(geometry.boundingBox.min.y)<.00001);assert(Math.abs(geometry.boundingBox.max.y-1)<.00001);
  for(const n of geometry.attributes.normal.array)assert(Number.isFinite(n));geometry.dispose();
 }
 assert.equal(hashes.size,7);
});
test('production package includes every mineral STL and references it from the game bundle',()=>{
 const assets=fs.readdirSync(path.join(root,'dist-pages/assets'));
 const js=assets.filter(n=>n.endsWith('.js')).map(n=>fs.readFileSync(path.join(root,'dist-pages/assets',n),'utf8')).join('\n');
 for(const name of ['malachite','amethyst','quartz','obsidian','citrine','fluorite','corrupted']){
  const file=assets.find(n=>n.startsWith(name+'-')&&n.endsWith('.stl'));assert(file,name+' missing');assert(js.includes(file),name+' not referenced');
 }
});
