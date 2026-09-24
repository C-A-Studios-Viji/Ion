export const PARADOX_JAR_ROOMS = [1, 11, 111, 200] as const;

export function paradoxEncounter(room:number,roll:number):"grin"|"blob"|null {
  if(room<1 || room>200)return null;
  if(room%25===0)return "grin";
  if(room<200 && roll<.07)return "blob";
  return null;
}

export function canEnterParadox(jar:boolean,essence:boolean,malachite:number):boolean {
  return jar && essence && malachite>=1;
}

export function isPrimeDoor(room:number):boolean {
  if(!Number.isInteger(room)||room<2)return false;
  for(let divisor=2;divisor*divisor<=room;divisor++)if(room%divisor===0)return false;
  return true;
}

export function goldBarSpawns(room:number,roll:number):boolean {
  return isPrimeDoor(room) && roll<.14;
}
