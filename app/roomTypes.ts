export const ROOM_TYPES = ['grand','duplex','multifloor','basement','maze','collapsed','flooded','observation','inversion'] as const;
export type RoomType = 'standard' | typeof ROOM_TYPES[number];
export const ROOM_LABELS: Record<RoomType,string> = {standard:'Facility',grand:'Grand Chamber',duplex:'Duplex',multifloor:'Multi-floor Facility',basement:'Basement',maze:'Crystal Maze',collapsed:'Collapsed Room',flooded:'Flooded Chamber',observation:'Observation Room',inversion:'INVERSION · RETREAT TO PROCEED'};
export function roomTypeFor(room:number,special=false):RoomType {
 if(special||room<5||room>=200||room===32)return 'standard';
 if(room%53===17)return 'inversion';
 return (['standard',...ROOM_TYPES.filter(t=>t!=='inversion'),'standard','standard'] as RoomType[])[room%11];
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
