export const BOONS = [
 {id:'infused',name:'Infused',negative:false,note:'All seven mineral records and infusions unlock immediately.'},
 {id:'swift',name:'Windwalker',negative:false,note:'Movement speed increases by 30%.'},
 {id:'everlight',name:'Everlight',negative:false,note:'Your flashlight never loses charge.'},
 {id:'sugar',name:'Sugar Rush',negative:true,note:'Candy crystals can grant supplies, speed, slow you, or kill you. Regular doors advance twice as fast.'},
 {id:'bloodline',name:'Haid-Ini: Bloodline',negative:true,note:'Your walking and sprinting speed match Haid-Ini. Regular doors advance twice as fast.'},
 {id:'blackout',name:'Blackout',negative:true,note:'No flashlight. Regular doors advance twice as fast.'},
 {id:'famine',name:'Famine',negative:true,note:'Gunshots cost two rounds and batteries drain twice as fast.'},
 {id:'heavy',name:'Heavy Soul',negative:true,note:'Lower jumps and stronger gravity.'},
 {id:'echo',name:'Echo Storm',negative:true,note:'All moving hostile entities are 20% faster.'},
 {id:'fragile',name:'Forsaken',negative:true,note:'Companions and wards cannot prevent contact death.'},
 {id:'tremor',name:'Tremor',negative:true,note:'Your view sways as the facility shakes.'},
 {id:'doom',name:'Last Breath',negative:true,note:'A fatal curse: accepting this Boon ends the run immediately.'},
] as const;
export type BoonId = typeof BOONS[number]['id'];
export const negativeBoons = BOONS.filter(b=>b.negative&&b.id!=="doom");
export function candyOutcome(roll:number){return roll<.12?'death':roll<.35?'slow':roll<.65?'speed':roll<.85?'ammo':'infusion';}
export function boonDoorStep(active:readonly string[],chasing:boolean){return !chasing&&active.some(id=>negativeBoons.some(b=>b.id===id))?2:1;}
