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
