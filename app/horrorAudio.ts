import type { MonsterKind } from "./monsterModels";
// CC0 recordings by Ogrebane; full source and processing notes in ASSET_CREDITS.md.
const urls:Record<MonsterKind,string>={
  entity:new URL("./assets/audio/monster-1.ogg",import.meta.url).href,
  blob:new URL("./assets/audio/monster-2.ogg",import.meta.url).href,
  haidini:new URL("./assets/audio/monster-3.ogg",import.meta.url).href,
  crawler:new URL("./assets/audio/monster-4.ogg",import.meta.url).href,
  watcher:new URL("./assets/audio/monster-5.ogg",import.meta.url).href,
  sound:new URL("./assets/audio/monster-6.ogg",import.meta.url).href,
  prism:new URL("./assets/audio/monster-7.ogg",import.meta.url).href,
  mimic:new URL("./assets/audio/monster-8.ogg",import.meta.url).href,
  wraith:new URL("./assets/audio/monster-9.ogg",import.meta.url).href,
  noise:new URL("./assets/audio/monster-10.ogg",import.meta.url).href,
  remetons:new URL("./assets/audio/monster-11.ogg",import.meta.url).href,
};
export class HorrorAudio {
  private buffers=new Map<MonsterKind,AudioBuffer>();
  constructor(private context:AudioContext,private output:AudioNode){
    void Promise.all(Object.entries(urls).map(async([kind,url])=>{
      try {const response=await fetch(url);if(response.ok)this.buffers.set(kind as MonsterKind,await context.decodeAudioData(await response.arrayBuffer()));}catch{/* Synthesized fallback stays available. */}
    }));
  }
  play(kind:MonsterKind){
    const buffer=this.buffers.get(kind);if(!buffer)return false;
    const source=this.context.createBufferSource();source.buffer=buffer;
    const gain=this.context.createGain();gain.gain.value=.72;
    const lowpass=this.context.createBiquadFilter();lowpass.type="lowpass";lowpass.frequency.value=kind==="noise"?2600:6500;
    source.playbackRate.value=kind==="blob"?.75:kind==="remetons"?.62:kind==="crawler"?1.18:1;
    source.connect(lowpass).connect(gain).connect(this.output);source.start();source.stop(this.context.currentTime+2.6);
    source.onended=()=>{source.disconnect();lowpass.disconnect();gain.disconnect();};return true;
  }
}
