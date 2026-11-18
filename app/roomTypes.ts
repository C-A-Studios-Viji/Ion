export const FINALE_ROOMS = ['powerexchange','carousel','crystallung'] as const;
const BASE_ROOM_TYPES = ['grand','duplex','multifloor','basement','maze','collapsed','flooded','observation','drownedlift'] as const;
export const BADGE_ROOM_TYPES = ['grand','duplex','multifloor','basement','maze','collapsed','flooded','observation','inversion','drownedlift'] as const;
// Keep the existing 250 badge identities stable when layouts are added.
export const ROOM_TYPES = [...BASE_ROOM_TYPES,'fungal','archive','refinery','pressure','mirror','greenhouse','faultline','dormitory',...FINALE_ROOMS] as const;
export type RoomType = 'standard' | typeof ROOM_TYPES[number];
export const ROOM_LABELS: Record<RoomType | 'inversion',string> = {standard:'Normal Resonance Gallery',powerexchange:'Power Exchange',carousel:'Quarantine Carousel',crystallung:'Crystal Lung',fungal:'Fungal Forest',archive:'Suspended Archive',refinery:'Conveyor Refinery',pressure:'Pressure Vault',mirror:'Mirror Reservoir',greenhouse:'Overgrown Greenhouse',faultline:'Faultline Chamber',dormitory:'Silent Dormitory',grand:'Grand Chamber',duplex:'Duplex',multifloor:'Multi-floor Facility',basement:'Basement',maze:'Crystal Maze',collapsed:'Collapsed Room',flooded:'Flooded Chamber',observation:'Observation Room',drownedlift:'The Drowned Lift',inversion:'INVERSION · RETREAT TO PROCEED'};
// Use the old INVERSION slot for each new layout in turn to preserve other door assignments.
const FINALE_SLOT = 6;
export const ROOM_CYCLE:readonly RoomType[] = ['standard','basement','duplex','grand','maze','multifloor','powerexchange','collapsed','flooded','observation','fungal','archive','refinery','pressure','mirror','greenhouse','faultline','dormitory'];
export function roomTypeFor(room:number,special=false):RoomType {
 if(special||room===200||room===32)return 'standard';
 if(room%20===19)return 'drownedlift';
 const index=Math.max(1,Math.floor(room))-1;
 const slot=index%ROOM_CYCLE.length;
 const cycle=Math.floor(index/ROOM_CYCLE.length);
 const finaleIndex=[0,0,1,2][cycle%4];
 return slot===FINALE_SLOT ? FINALE_ROOMS[finaleIndex] : ROOM_CYCLE[slot];
}
// Accessible terraces are joined by continuous ramps. Entry and exit remain at zero.
export function floorProfile(type:RoomType,length:number):[number,number][] {
 const points:Record<string,number[]>={duplex:[0,0,3,3,3,3,0,0],multifloor:[0,0,3,3,6,6,3,0],basement:[0,0,-3,-3,-3,-3,0,0],collapsed:[0,0,-2,-2,1,1,0,0]};
 return (points[type]??[0,0]).map((y,i,a)=>[length/2-i*length/(a.length-1),y]);
}
export function roomFloor(type:RoomType,length:number,z:number):number {
 const p=floorProfile(type,length);for(let i=1;i<p.length;i++)if(z>=p[i][0]){const t=Math.max(0,Math.min(1,(p[i-1][0]-z)/(p[i-1][0]-p[i][0])));return p[i-1][1]+(p[i][1]-p[i-1][1])*t;}return 0;
}
export function mazeBarriers(width:number,length:number){return Array.from({length:5},(_,i)=>({z:length/2-9-i*(length-18)/4,side:i%2?1:-1,gapX:(i%2?-1:1)*(width/2-3),width:width-6}));}
