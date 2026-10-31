import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
export class CinematicRenderer{
 private composer:EffectComposer|null=null;
 private ao:SSAOPass|null=null;
 private environment:THREE.WebGLRenderTarget|null=null;
 enabled=true;
 constructor(private renderer:THREE.WebGLRenderer,private scene:THREE.Scene,private camera:THREE.PerspectiveCamera,width:number,height:number){
  // Renderer stubs and devices without a GPU keep the standard render path.
  if(!renderer.capabilities?.isWebGL2)return;
  if(!renderer.extensions.has('EXT_color_buffer_float'))return;
  const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();
  this.environment=pmrem.fromScene(room,.06);scene.environment=this.environment.texture;room.dispose();pmrem.dispose();
  scene.environmentIntensity=.38;
  this.composer=new EffectComposer(renderer);this.composer.addPass(new RenderPass(scene,camera));
  this.ao=new SSAOPass(scene,camera,width,height,12);this.ao.kernelRadius=.75;this.ao.minDistance=.001;this.ao.maxDistance=.035;
  this.composer.addPass(this.ao);this.composer.addPass(new OutputPass());this.resize(width,height);
 }
 resize(w:number,h:number){this.composer?.setSize(w,h);}
 setEnabled(enabled:boolean){this.enabled=enabled;}
 render(){if(this.composer&&this.enabled)this.composer.render();else this.renderer.render(this.scene,this.camera);}
 dispose(){this.composer?.passes.forEach(p=>p.dispose());this.composer?.dispose();this.environment?.dispose();this.scene.environment=null;}
}
export function cinematicExposure(ascended:boolean,paradox:boolean,chase:boolean,tier:number){return ascended?.95:paradox?.76:chase?.94:Math.max(.76,.92-tier*.018);}
