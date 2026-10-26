export type LorePhase = 'dormant'|'armed'|'redox'|'ascended'|'reveal'|'mega'|'complete';
export type LoreRoute = {phase:LorePhase; door:number; scene:number};
export const emptyLoreRoute=():LoreRoute=>({phase:'dormant',door:0,scene:0});
export const LORE_NIGHTMARES=[
 ['Grin','A face that cannot stop smiling, even while it screams.'],
 ['Blob','A body dissolving into every shadow it once feared.'],
 ['Haid-Ini','A corridor too narrow to escape its own footsteps.'],
 ['Crawler','Eight hands reaching for a door that never opens.'],
 ['Watcher','An eye trapped in the light it once hunted.'],
 ['Sound Hunter','A voice calling from a room with no air.'],
 ['Prism','A reflection breaking into a hundred frightened selves.'],
 ['Mimic','A familiar face forgetting who it belongs to.'],
 ['Noise','A heartbeat fading beneath endless static.'],
 ['Remetons','Pers seeing the corruption spread through his own hands.'],
] as const;
export function serpAdvice(kind:string,room:number,crystals:number,phase:LorePhase){
 const denominator=phase==='redox'?400:phase==='ascended'?50:phase==='mega'?300:200;
 const percent=Math.min(100,Math.round(room/denominator*100));
 const survive:Record<string,string>={noise:'Collect all five glowing specimens before the timer runs out.',blob:'Use resonators to stagger the Blob, then keep sprinting.',entity:'Watch the warning and hide until the Grin leaves.',void:'Offer carried crystals to Void; pay 50 before the twentieth door.',haidini:'Tune the lockdown resonators; hiding will not protect you.',boonie:'Read the Boon before accepting it.'};
 return {percent,well:crystals>0?`You gathered ${crystals} crystals and reached Door ${room}.`:`You made it to Door ${room} and learned this route.`,next:survive[kind]??'Check your supplies, watch each warning, and choose a safer route next time.'};
}
