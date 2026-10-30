export const SANG_SKIP_COST = 4;
export const GLUE_CHANCE = .04;
export const MAX_PICKAXE_LEVEL = 2;
export function miningHits(level:number, resonator=false) {
 return Math.max(1,(resonator?2:3)-Math.max(0,Math.min(MAX_PICKAXE_LEVEL,Math.floor(level))));
}
export function canRepairJar(items:{glassShard:number;glue:number}) { return items.glassShard>0&&items.glue>0; }
export function sangSkipTarget(room:number,ascendedDoor:number,ascended:boolean,lorePhase:string) {
 const limit=ascended?(lorePhase==='ascended'?50:20):lorePhase==='redox'?400:200;
 return Math.min(limit,(ascended?ascendedDoor:room)+50);
}
