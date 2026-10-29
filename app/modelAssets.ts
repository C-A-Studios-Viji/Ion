import * as THREE from "three";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { roundStaticGeometry, smoothNormals, applyGradient } from "./surfaceStyle";

// Literal URLs let Vite package every model under the GitHub Pages base path.
export const MODEL_URLS = {
  mineral_malachite: new URL("./assets/minerals/malachite.stl", import.meta.url).href,
  mineral_amethyst: new URL("./assets/minerals/amethyst.stl", import.meta.url).href,
  mineral_quartz: new URL("./assets/minerals/quartz.stl", import.meta.url).href,
  mineral_obsidian: new URL("./assets/minerals/obsidian.stl", import.meta.url).href,
  mineral_citrine: new URL("./assets/minerals/citrine.stl", import.meta.url).href,
  mineral_fluorite: new URL("./assets/minerals/fluorite.stl", import.meta.url).href,
  mineral_corrupted: new URL("./assets/minerals/corrupted.stl", import.meta.url).href,
  rock: new URL("./assets/rock.glb", import.meta.url).href,
  rockWide: new URL("./assets/rock-wide.glb", import.meta.url).href,
  generator: new URL("./assets/generator.glb", import.meta.url).href,
  barrel: new URL("./assets/barrel.glb", import.meta.url).href,
  rifle: new URL("./assets/rifle.glb", import.meta.url).href,
  magazine: new URL("./assets/magazine.glb", import.meta.url).href,
  crate: new URL("./assets/crate.glb", import.meta.url).href,
  computer: new URL("./assets/computer.glb", import.meta.url).href,
  door: new URL("./assets/door.glb", import.meta.url).href,
  hatch: new URL("./assets/hatch.glb", import.meta.url).href,
  labBed: new URL("./assets/lab-bed.glb", import.meta.url).href,
  wallPanel: new URL("./assets/wall-panel.glb", import.meta.url).href,
  infuser: new URL("./assets/infuser.glb", import.meta.url).href,
  workbench: new URL("./assets/workbench.glb", import.meta.url).href,
  basdino: new URL("./assets/basdino.glb", import.meta.url).href,
};
export type ModelKey = keyof typeof MODEL_URLS;
type Options = {
  height?: number;
  size?: [number, number, number];
  centered?: boolean;
  yaw?: number;
  tint?: number;
  emissive?: number;
  animation?: string;
};

export class ModelAssets {
  private models = new Map<ModelKey, Pick<GLTF,"scene"|"animations">>();
  private disposed = false;

  async load(onProgress: (loaded: number, total: number) => void) {
    const loader = new GLTFLoader();
    const stlLoader = new STLLoader();
    const entries = Object.entries(MODEL_URLS) as [ModelKey, string][];
    let loaded = 0;
    await Promise.all(entries.map(async ([key, url]) => {
      try {
        const mineral=key.startsWith('mineral_');
        let model: Pick<GLTF,"scene"|"animations">;
        if(mineral){
          const geometry=await stlLoader.loadAsync(url);
          const group=new THREE.Group();group.add(new THREE.Mesh(geometry,new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:.2,metalness:.06,clearcoat:1,clearcoatRoughness:.12,ior:1.54})));
          model={scene:group,animations:[]};
        }else model=await loader.loadAsync(url);
        const processed = new Map<THREE.BufferGeometry, THREE.BufferGeometry>();
        model.scene.traverse(node => {
          if (!(node instanceof THREE.Mesh)) return;
          const original = node.geometry;
          let rounded = processed.get(original);
          if (!rounded) {
            const baked: THREE.BufferGeometry = node instanceof THREE.SkinnedMesh || mineral
              ? original.clone() : roundStaticGeometry(original);
            if(!mineral)smoothNormals(baked); processed.set(original, baked); rounded = baked;
          }
          node.geometry = rounded;
        });
        processed.forEach((_, original) => original.dispose());
        if (this.disposed) disposeModel(model.scene, true);
        else this.models.set(key, model);
      } catch (error) {
        // A missing asset falls back to the existing procedural model.
        console.warn(`ION model unavailable: ${key}`, error);
      } finally { if (!this.disposed) onProgress(++loaded, entries.length); }
    }));
  }

  create(key: ModelKey, options: Options = {}): THREE.Group | null {
    const model = this.models.get(key);
    if (!model) return null;
    const root = new THREE.Group();
    root.name = `asset:${key}`;
    const content = clone(model.scene);
    // Room cleanup owns the copies; cached geometry, textures, and rigs survive.
    content.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      node.geometry = node.geometry.clone();
      const copy = (source: THREE.Material) => {
        const material = source.clone() as THREE.MeshPhysicalMaterial;
        const mineral=key.startsWith("mineral_");
        if (material.color && options.tint !== undefined) {
          material.map = null;
          material.color.setHex(0xffffff);
          const low = new THREE.Color(options.tint).multiplyScalar(0.38).getHex();
          const high = new THREE.Color(options.tint).lerp(new THREE.Color(0x8ccfff),0.22).getHex();
          if(mineral)material.color.setHex(options.tint);else applyGradient(material,low,high);
          material.roughness = mineral ? (key==="mineral_malachite"?.38:.16) : .45;
          material.metalness = mineral ? (key==="mineral_obsidian"?.28:.04) : .36;
          if(mineral){material.clearcoat=1;material.ior=1.54;material.transmission=key==="mineral_quartz"?.16:.02;material.thickness=.4;}
        }
        if (material.emissive && options.emissive !== undefined) {
          material.emissive.setHex(options.tint ?? 0x57cfc3);
          material.emissiveIntensity = options.emissive;
        }
        return material;
      };
      node.material = Array.isArray(node.material) ? node.material.map(copy) : copy(node.material);
      node.castShadow = true; node.receiveShadow = true;
      // Animated bounds can extend beyond the initial rest pose.
      if (node instanceof THREE.SkinnedMesh) node.frustumCulled = false;
    });
    const pivot = new THREE.Group();
    pivot.add(content); pivot.rotation.y = options.yaw ?? 0;
    pivot.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(pivot);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    if (options.size) pivot.scale.set(...options.size.map((n, i) => n / Math.max(size.getComponent(i), 0.001)) as [number, number, number]);
    else pivot.scale.setScalar((options.height ?? 1) / Math.max(size.y, 0.001));
    pivot.position.set(-center.x * pivot.scale.x, -(options.centered ? center.y : bounds.min.y) * pivot.scale.y, -center.z * pivot.scale.z);
    root.add(pivot);
    if (model.animations.length) {
      const mixer = new THREE.AnimationMixer(content);
      const clip = THREE.AnimationClip.findByName(model.animations, options.animation ?? "Idle") ?? model.animations[0];
      mixer.clipAction(clip).play();
      root.userData.assetMixer = mixer;
    }
    return root;
  }

  dispose() {
    this.disposed = true;
    this.models.forEach((model) => disposeModel(model.scene, true));
    this.models.clear();
  }
}

export function animateModel(root: THREE.Object3D, dt: number, speed = 1) {
  const mixer = root.userData.assetMixer as THREE.AnimationMixer | undefined;
  mixer?.update(dt * speed);
}

export function disposeModel(root: THREE.Object3D, textures = false) {
  root.traverse((node) => {
    const mixer = node.userData.assetMixer as THREE.AnimationMixer | undefined;
    if (mixer) { mixer.stopAllAction(); mixer.uncacheRoot(mixer.getRoot()); }
    if (!(node instanceof THREE.Mesh || node instanceof THREE.Points || node instanceof THREE.Line)) return;
    node.geometry.dispose();
    if (node instanceof THREE.InstancedMesh) node.dispose();
    if (node instanceof THREE.SkinnedMesh) node.skeleton.dispose();
    (Array.isArray(node.material) ? node.material : [node.material]).forEach((material) => {
      if (textures) Object.values(material).forEach((value) => { if (value instanceof THREE.Texture) value.dispose(); });
      material.dispose();
    });
  });
}
