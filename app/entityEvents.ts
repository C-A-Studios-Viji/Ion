import { isPrimeDoor } from './paradox';
export type VoidDebt={paid:number;doorsLeft:number;lastRoom:number};
export type MemoryTrial={number:string;quizRoom:number;choices:string[];phase:'reveal'|'waiting'|'quiz'};
export type EntityEvents={voidDebt:VoidDebt|null;memory:MemoryTrial|null;voidSeen:boolean;memorySeen:boolean};
export const emptyEntityEvents=():EntityEvents=>({voidDebt:null,memory:null,voidSeen:false,memorySeen:false});
export function createMemoryTrial(room:number,rand= Math.random):MemoryTrial{
 const number=String(1+Math.floor(Math.min(.999999,Math.max(0,rand()))*99999));
 const primes:number[]=[];for(let n=room+1;n<200&&primes.length<4;n++)if(isPrimeDoor(n))primes.push(n);
 const quizRoom=primes[Math.min(primes.length-1,Math.floor(rand()*primes.length))];
 if(!quizRoom)throw new Error('No future prime door');
 const choices=[number,...[137,1009,7919].map(offset=>String((Number(number)+offset-1)%99999+1))];
 const shift=Math.floor(rand()*4);return {number,quizRoom,choices:[...choices.slice(shift),...choices.slice(0,shift)],phase:'reveal'};
}
export function payVoid(debt:VoidDebt,crystals:Record<string,number>):number{
 let remaining=50-debt.paid,paid=0;for(const key of Object.keys(crystals)){const take=Math.min(remaining,Math.max(0,crystals[key]));crystals[key]-=take;remaining-=take;paid+=take;}debt.paid+=paid;return paid;
}
