import * as THREE from "three";
import { gradientMaterial } from "./surfaceStyle";

export type MonsterKind = "entity" | "blob" | "haidini" | "crawler" | "watcher" | "sound" | "prism" | "mimic" | "wraith" | "noise" | "remetons";
export const MONSTER_NAMES:Record<MonsterKind,string>={entity:"THE GRIN",blob:"THE BLOB",haidini:"HAID-INI",crawler:"CRAWLER",watcher:"WATCHER",sound:"SOUND HUNTER",prism:"PRISM",mimic:"MIMIC",wraith:"WRAITH",noise:"NOISE",remetons:"REMETONS"};
export const MONSTER_COLORS:Record<MonsterKind,number>={entity:0xa7eaff,blob:0xfb4f84,haidini:0xff8b2e,crawler:0xc84a70,watcher:0x44cfff,sound:0x54b9a8,prism:0xa077ff,mimic:0x39e5bc,wraith:0xabb8ff,noise:0x65eaff,remetons:0xff183f};

// Hand-shaped 3D silhouettes use curved tubes and smooth surfaces, not block avatars.
// Every creature faces +Z, including its camera-space death performance.
export function createMonster(kind:MonsterKind):THREE.Group {
  const root=new THREE.Group();root.name=`monster:${kind}`;
  const glow=MONSTER_COLORS[kind];
  const skin=gradientMaterial(kind==="blob"?0x260818:kind==="haidini"?0x8b2101:0x020812,kind==="haidini"?0xffaa39:glow,0.035,kind==="haidini");
  const dark=gradientMaterial(0x010105,0x172332,0.015);
  const bone=gradientMaterial(0x584449,0xe9f9fa,0.12);
  const eye=new THREE.MeshBasicMaterial({color:glow});
  const black=new THREE.MeshBasicMaterial({color:0x000003});
  const mesh=(g:THREE.BufferGeometry,m:THREE.Material,pos:number[],scale?:number[])=>{
    const node=new THREE.Mesh(g,m);node.position.set(pos[0],pos[1],pos[2]);if(scale)node.scale.set(scale[0],scale[1],scale[2]);node.castShadow=true;node.receiveShadow=true;root.add(node);return node;
  };
  const orb=(pos:number[],scale:number[],mat:THREE.Material=skin)=>mesh(new THREE.SphereGeometry(1,32,20),mat,pos,scale);
  const tube=(points:number[][],r:number,mat:THREE.Material=skin)=>mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p as [number,number,number]))),20,r,8,false),mat,[0,0,0]);
  const teeth=(y:number,z:number,width:number,count=16)=>{
    for(let i=0;i<count;i++){const x=(i/(count-1)-0.5)*width;const curve=Math.pow(x/width*2,2)*0.15;
      for(const side of [-1,1]){const tooth=mesh(new THREE.ConeGeometry(0.024+width*0.018,0.15+0.12*(1-Math.abs(x)/width),8),bone,[x,y+side*(0.1+curve),z]);tooth.rotation.z=side>0?Math.PI:0;}}
  };
  const eyes=(y:number,z:number,spread:number,r=.09)=>{
    for(const side of [-1,1]){orb([side*spread,y,z],[r*1.5,r,r*.65],black);orb([side*spread,y,z+r*.7],[r*.38,r*.65,r*.3],eye);}
  };
  let focus=1.8;
  if(kind==="entity"){
    orb([0,1.25,0],[.25,.95,.2],dark);orb([0,2.65,0],[.53,.63,.38],bone);
    orb([0,2.46,.32],[.47,.21,.14],black);teeth(2.43,.46,.86,19);eyes(2.85,.31,.22,.13);
    for(const s of [-1,1]){
      const arm=tube([[s*.22,2,0],[s*.6,1.65,0],[s*.72,.67,.08],[s*.86,.26,.22]],.07,dark);arm.userData.sway=s;
      tube([[s*.15,.8,0],[s*.2,.4,-.04],[s*.29,.05,.2]],.085,dark);
      for(let f=0;f<4;f++)tube([[s*.83,.35,.16],[s*(.8+f*.07),.17,.25],[s*(.85+f*.07),.02,.38]],.018,bone);
    }focus=2.62;
  }else if(kind==="blob"||kind==="remetons"){
    const flesh=kind==="remetons"?dark:skin;
    orb([0,1.65,0],[1.8,1.78,1.2],flesh);
    for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const n=orb([Math.cos(a)*1.1,.7+Math.sin(a)*.3,Math.sin(a)*.65],[.65,.7,.7],flesh);n.userData.breathe=i;}
    orb([0,1.18,1.02],[.93,.8,.28],black);teeth(1.24,1.35,1.65,16);
    for(const s of [-1,1]){orb([s*.7,2.34,1.02],[.58,.63,.34],bone);orb([s*.7,2.34,1.32],[.25,.3,.09],eye);orb([s*.7,2.34,1.39],[.1,.22,.035],black);}
    for(let i=0;i<9;i++){const a=i/9*Math.PI*2;const n=tube([[Math.cos(a)*1.25,.8,Math.sin(a)],[Math.cos(a)*1.95,.35,Math.sin(a)*1.5],[Math.cos(a)*2.05,.07,Math.sin(a)*2]],.09,flesh);n.userData.sway=i+1;}
    const tongue=tube([[0,.92,1.25],[.18,.52,1.7],[-.18,.3,1.88]],.17,skin);tongue.userData.sway=2;
    if(kind==="remetons") {const crown=mesh(new THREE.TorusGeometry(.6,.075,12,40),eye,[0,3.42,0]);crown.rotation.x=Math.PI/2;for(let i=0;i<7;i++)mesh(new THREE.ConeGeometry(.09,.45,12),bone,[Math.cos(i)*.55,3.55,Math.sin(i)*.55]);}
    focus=2;
  }else if(kind==="haidini"){
    orb([0,1.18,0],[.6,.7,1.13]);tube([[0,1.2,.55],[0,1.85,.8],[0,2.3,1]],.32);
    orb([0,2.35,1.16],[.4,.45,.7]);orb([0,2.18,1.65],[.38,.24,.4],dark);eyes(2.53,1.63,.24,.095);
    for(const s of [-1,1]){
      for(const z of [-.72,.62]){const leg=tube([[s*.4,1.1,z],[s*.47,.58,z+.12],[s*.45,.13,z+.1]],.12);leg.userData.sway=z+s;orb([s*.45,.1,z+.17],[.16,.13,.23],dark);}
      const ear=orb([s*.28,2.9,.92],[.11,.4,.14]);ear.rotation.z=s*-.22;
    }
    for(let i=0;i<9;i++)orb([0,1.6+i*.08,.42+i*.085],[.075,.22,.07],dark);
    tube([[0,1.6,-1],[.2,1.3,-1.6],[.35,.5,-1.8]],.06,dark);teeth(2.12,1.94,.56,10);focus=2.4;
  }else if(kind==="crawler"){
    orb([0,.45,0],[.6,.34,.82],dark);orb([0,.42,.68],[.4,.26,.37]);
    for(let i=0;i<8;i++){const s=i<4?-1:1,z=(i%4-.5)*.33;const leg=tube([[s*.35,.4,z-.5],[s*.88,.72,z-.5],[s*1.28,.04,z-.15]],.052);leg.userData.sway=i+1;}
    for(let i=0;i<6;i++)orb([(i-2.5)*.105,.5+Math.abs(i-2.5)*.02,.99],[.042,.058,.04],eye);
    tube([[-.22,.34,.9],[-.38,.17,1.17],[-.1,.2,1.29]],.065,bone);tube([[.22,.34,.9],[.38,.17,1.17],[.1,.2,1.29]],.065,bone);focus=.5;
  }else if(kind==="watcher"||kind==="wraith"){
    orb([0,1.9,0],[.65,.8,.47],dark);orb([0,2.05,.4],[.44,.44,.16],bone);orb([0,2.05,.55],[.29,.3,.07],eye);orb([0,2.05,.62],[.08,.25,.035],black);
    for(let i=0;i<12;i++){const a=i/12*Math.PI*2;const tendril=tube([[Math.cos(a)*.48,1.55,Math.sin(a)*.36],[Math.cos(a)*.64,.85,Math.sin(a)*.48],[Math.cos(a)*.35,.13,Math.sin(a)*.68]],.025+((i%3)*.012),skin);tendril.userData.sway=i+1;}
    const halo=mesh(new THREE.TorusGeometry(.8,.025,8,60),eye,[0,2.05,-.06]);halo.userData.spin=1;focus=2;
    if(kind==="wraith")root.traverse(n=>{if(n instanceof THREE.Mesh){(n.material as THREE.Material).transparent=true;(n.material as THREE.Material).opacity=.48;}});
  }else if(kind==="noise"||kind==="sound"){
    orb([0,1.3,0],[.38,.95,.28],dark);orb([0,2.4,0],[.46,.6,.35]);
    orb([0,2.37,.3],[.26,.5,.2],black);teeth(2.4,.46,.45,9);
    for(const s of [-1,1]){
      for(let i=0;i<3;i++){const ear=mesh(new THREE.TorusGeometry(.3+i*.12,.045,10,42,Math.PI*1.75),skin,[s*(.48+i*.1),2.45,0]);ear.rotation.y=s*.65;ear.rotation.z=s*.4;ear.userData.spin=s*.12;}
      const arm=tube([[s*.25,1.8,0],[s*.58,1.2,0],[s*.83,.64,.3]],.07);arm.userData.sway=s;
    }focus=2.4;
    if(kind==="noise")for(let i=0;i<3;i++){const ring=mesh(new THREE.TorusGeometry(.9+i*.25,.012,8,64),eye,[0,2.4,-.2]);ring.userData.spin=(i+1)*.35;}
  }else {
    orb([0,1.08,0],[.65,.9,.54],dark);eyes(1.42,.49,.22,.12);
    orb([0,.98,.48],[.34,.29,.12],black);teeth(.95,.62,.55,10);
    for(let i=0;i<9;i++){const a=i/9*Math.PI*2;const horn=tube([[Math.cos(a)*.4,1.4,Math.sin(a)*.4],[Math.cos(a)*.8,1.95,Math.sin(a)*.7],[Math.cos(a)*.85,2.45,Math.sin(a)*.75]],.085,skin);horn.userData.sway=i+1;}
    if(kind==="prism") {const halo=mesh(new THREE.TorusGeometry(1.1,.035,12,64),eye,[0,1.5,0]);halo.rotation.x=.8;halo.userData.spin=1.2;}
    focus=1.4;
  }
  root.userData.focusY=focus;root.userData.monsterKind=kind;return root;
}

export function animateMonster(root:THREE.Object3D,time:number,moving=true){
  root.traverse(node=>{
    if(node.userData.sway!==undefined)node.rotation.z=Math.sin(time*(moving?3.5:1.4)+node.userData.sway)*.1;
    if(node.userData.spin)node.rotation.z=time*node.userData.spin;
    if(node.userData.breathe!==undefined)node.scale.y=.7+Math.sin(time*2.4+node.userData.breathe)*.045;
  });
}
