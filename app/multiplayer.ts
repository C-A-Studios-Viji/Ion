import type {LiftState} from "./drownedLift";
import type { Appearance } from "./playerModel";
import { MULTIPLAYER_RELAY } from "./multiplayerConfig";

export type Pose = { x: number; y: number; z: number; yaw: number; light: boolean; dead: boolean; room: number; name:string; appearance?:Appearance };
export type PartyMessage =
  | { type:"ready" }
  | { type:"hello"; state:unknown; pose:Pose }
  | { type:"pose"; pose:Pose }
  | { type:"room"; state:unknown }
  | { type:"world"; lift?:LiftState; room:number; noiseTime:number; grinIncoming:boolean; grinWarningTimer:number; doorOpening:boolean; enemies:{kind:string;alive:boolean;x:number;y:number;z:number}[] }
  | { type:"action"; room:number; action:"lift"|"pickup"|"resonator"|"door"|"fire"|"revive"|"pers"|"rift"|"essence"; id?:number; x?:number; y?:number; z?:number }
  | { type:"request-room"; room:number }
  | { type:"dead"; room:number };

export const partyPeerId = (code: string) => `ion-facility-${code}`;
export const validPartyCode = (code: string) => /^(?:\d{5}|[a-f0-9]{32})$/i.test(code);
export const randomInviteToken = () => Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
export function partyInviteUrl(base:string,token:string){const url=new URL(base);url.search='';url.hash='';url.searchParams.set('join',token);return url.href;}
export function parsePartyInvite(input:string):string|null {
 const value=input.trim();if(validPartyCode(value))return value.toLowerCase();
 try{const url=new URL(value);if(!['http:','https:'].includes(url.protocol))return null;const token=url.searchParams.get('join')??'';return validPartyCode(token)?token.toLowerCase():null;}catch{return null;}
}
export const randomPartyCode = () => String(crypto.getRandomValues(new Uint32Array(1))[0] % 90000 + 10000);
export const hasTripleDigit = (code:string) => /^\d{5}$/.test(code) && [...new Set(code)].some(digit=>code.split(digit).length-1>=3);
const SECRET_SIGNALS:Record<string,"one-dev"|"skip-pers">={
  "1DEV1":"one-dev",XXOOP:"skip-pers",C9P98H:"skip-pers",SK1PP:"skip-pers",N0PERS:"skip-pers",
};
export function secretSignal(code:string):"one-dev"|"skip-pers"|null {
  return SECRET_SIGNALS[code.trim().toUpperCase()]??null;
}
const NAME_PREFIXES=["Scout","Elder","Impaling","Stout","Lucrative","Silent","Crimson","Neon","Hollow","Royal","Brisk","Glitching","Brave","Distant","Arcane","Velvet"];
const NAME_NOUNS=["Salmon","Elmer","Ion","Shoe","Loquat","Quartz","Moth","Raven","Lantern","Badger","Comet","Gecko","Cobra","Echo","Otter","Falcon"];
export function randomPlayerName(rand=Math.random):string {
  return `${NAME_PREFIXES[Math.floor(rand()*NAME_PREFIXES.length)]}${NAME_NOUNS[Math.floor(rand()*NAME_NOUNS.length)]}`;
}

// Managed WebSocket relay. Traffic goes through Supabase Realtime, never
// browser-to-browser ICE/STUN/TURN. An invite is an unguessable room capability.
export type SocketLike = Pick<WebSocket,'readyState'|'bufferedAmount'|'send'|'close'|'onopen'|'onmessage'|'onclose'|'onerror'>;
type Role='host'|'guest';
type Wire={v:2;from:string;role:Role;kind:string;to?:string;seq?:number;order?:number;message?:PartyMessage};
type LinkOptions={socketFactory?:(url:string)=>SocketLike;now?:()=>number;schedule?:(fn:()=>void,ms:number)=>ReturnType<typeof setTimeout>;cancel?:(id:ReturnType<typeof setTimeout>)=>void;url?:string;timeoutMs?:number};
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const bounded=(v:unknown,max=10000)=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=max;
const room=(v:unknown)=>Number.isInteger(v)&&Number(v)>=1&&Number(v)<=400;
export function validPose(v:unknown):v is Pose{
 if(!record(v)||!room(v.room)||!['x','y','z','yaw'].every(k=>bounded(v[k]))||typeof v.light!=='boolean'||typeof v.dead!=='boolean'||typeof v.name!=='string'||v.name.length>48)return false;
 return v.appearance===undefined||record(v.appearance);
}
export function validPartyMessage(value:unknown):value is PartyMessage{
 if(!record(value)||typeof value.type!=='string')return false;
 switch(value.type){
  case 'ready':return true;
  case 'pose':return validPose(value.pose);
  case 'hello':return record(value.state)&&room(value.state.room)&&validPose(value.pose);
  case 'room':return record(value.state)&&room(value.state.room);
  case 'request-room':case 'dead':return room(value.room);
  case 'action':return room(value.room)&&['lift','pickup','resonator','door','fire','revive','pers','rift','essence'].includes(String(value.action))&&(value.id===undefined||(Number.isInteger(value.id)&&Number(value.id)>=0&&Number(value.id)<10000))&&['x','y','z'].every(k=>value[k]===undefined||bounded(value[k]));
  case 'world':return (value.lift===undefined||(record(value.lift)&&Number.isInteger(value.lift.power)&&Number(value.lift.power)>=0&&Number(value.lift.power)<=7&&typeof value.lift.started==='boolean'&&bounded(value.lift.elapsed)&&Number(value.lift.elapsed)>=0&&Number(value.lift.elapsed)<=75&&bounded(value.lift.ride)&&Number(value.lift.ride)>=0&&Number(value.lift.ride)<=8))&&room(value.room)&&bounded(value.noiseTime)&&bounded(value.grinWarningTimer)&&typeof value.grinIncoming==='boolean'&&typeof value.doorOpening==='boolean'&&Array.isArray(value.enemies)&&value.enemies.length<=100&&value.enemies.every(e=>record(e)&&typeof e.kind==='string'&&e.kind.length<=32&&typeof e.alive==='boolean'&&['x','y','z'].every(k=>bounded(e[k])));
  default:return false;
 }
}
const hostOnly=new Set(['hello','room','world']);
export class PartyLink {
 connection:{open:boolean}|null=null;
 code='';role:Role|null=null;
 readonly playerName=randomPlayerName();
 onMessage:(message:PartyMessage)=>void=()=>{};
 onStatus:(status:string)=>void=()=>{};
 onConnect:()=>void=()=>{};onDisconnect:()=>void=()=>{};
 private socket:SocketLike|null=null;
 private session=randomInviteToken();private remote='';private topic='';private ref=0;private joinRef='';private subscribed=false;
 private stopped=true;private tickTimer:ReturnType<typeof setTimeout>|null=null;
 private deadline=0;private lastServer=0;private lastRemote=0;private lastPing=0;private lastAnnounce=0;private retryAt=0;private retries=0;
 private reliableOrder=0;private expectedOrder=1;private incoming=new Map<number,Wire>();
 private sequence=0;private seen=new Set<number>();private latestPose=0;private latestWorld=0;
 private pending=new Map<number,{wire:Wire;sent:number;tries:number}>();
 private openedResolve:(()=>void)|null=null;private openedReject:((e:Error)=>void)|null=null;
 private readonly options:Required<Pick<LinkOptions,'socketFactory'|'now'|'schedule'|'cancel'|'url'|'timeoutMs'>>;
 constructor(options:LinkOptions={}){
  this.options={socketFactory:options.socketFactory??(url=>new WebSocket(url)),now:options.now??(()=>Date.now()),schedule:options.schedule??((fn,ms)=>setTimeout(fn,ms)),cancel:options.cancel??(id=>clearTimeout(id)),url:options.url??MULTIPLAYER_RELAY,timeoutMs:options.timeoutMs??20000};
 }
 async host(code=randomInviteToken()):Promise<string>{await this.open('host',code);return code;}
 async join(code:string):Promise<void>{await this.open('guest',code);}
 private open(role:Role,code:string):Promise<void>{
  if(!validPartyCode(code))return Promise.reject(new Error('Paste a valid ION invite link.'));
  this.close();this.stopped=false;this.role=role;this.code=code.toLowerCase();this.topic='realtime:ion-v2-'+this.code;
  this.session=randomInviteToken();this.remote='';this.resetPeer();this.sequence=0;this.seen.clear();this.latestPose=0;this.latestWorld=0;this.ref=0;this.retries=0;this.lastAnnounce=0;this.lastPing=0;this.lastRemote=0;
  this.deadline=this.options.now()+this.options.timeoutMs;
  this.onStatus(role==='host'?'CREATING SERVER ROOM…':'JOINING SERVER ROOM…');
  return new Promise<void>((resolve,reject)=>{this.openedResolve=resolve;this.openedReject=reject;this.connectSocket();this.scheduleTick();});
 }
 private connectSocket(){
  if(this.stopped)return;this.retryAt=0;this.subscribed=false;
  let socket:SocketLike;try{socket=this.options.socketFactory(this.options.url);}catch{this.reconnect();return;}
  this.socket=socket;this.lastServer=this.options.now();
  socket.onopen=()=>{if(socket!==this.socket||this.stopped)return;this.joinRef=String(++this.ref);this.push('phx_join',{config:{broadcast:{ack:true,self:false},presence:{enabled:false},private:false}},this.joinRef);};
  socket.onmessage=event=>{if(socket!==this.socket||this.stopped||typeof event.data!=='string'||event.data.length>240000)return;let frame;try{frame=JSON.parse(event.data);}catch{return;}this.receiveFrame(frame);};
  socket.onerror=()=>{if(socket===this.socket&&!this.stopped)this.reconnect();};
  socket.onclose=()=>{if(socket===this.socket&&!this.stopped)this.reconnect();};
 }
 private receiveFrame(frame:unknown){
  if(!record(frame)||typeof frame.event!=='string')return;
  if(frame.topic!=='phoenix'&&frame.topic!==this.topic)return;
  this.lastServer=this.options.now();
  if(frame.event==='phx_reply'&&frame.ref===this.joinRef&&frame.topic===this.topic){
   if(!record(frame.payload)||frame.payload.status!=='ok'){this.fail('Server refused the room. Try again shortly.');return;}
   this.subscribed=true;this.retries=0;
   if(this.role==='host'){this.deadline=0;this.openedResolve?.();this.openedResolve=null;this.openedReject=null;this.onStatus('SERVER ROOM READY · WAITING FOR A FRIEND');}
   this.announce();return;
  }
  if(frame.event==='phx_error'||frame.event==='phx_close'){this.reconnect();return;}
  if(frame.event==='system'&&record(frame.payload)&&frame.payload.status==='error'){this.reconnect();return;}
  if(frame.event==='broadcast'&&record(frame.payload)&&frame.payload.event==='ion'&&this.subscribed)this.receive(frame.payload.payload);
 }
 private receive(data:unknown){
  if(!record(data)||data.v!==2||typeof data.from!=='string'||!/^[a-f0-9]{32}$/.test(data.from)||data.from===this.session||!['host','guest'].includes(String(data.role))||data.role===this.role||typeof data.kind!=='string'||(data.to!==undefined&&data.to!==this.session))return;
  const wire=data as unknown as Wire,now=this.options.now();
  if(wire.kind==='join'&&this.role==='host'){
   if(this.remote&&this.remote!==wire.from){this.broadcast({kind:'full',to:wire.from});return;}
   if(!this.remote)this.resetPeer();this.remote=wire.from;this.lastRemote=now;this.broadcast({kind:'accept',to:wire.from});this.connected();return;
  }
  if(wire.kind==='offer'&&this.role==='guest'&&(!this.remote||this.remote===wire.from)){this.broadcast({kind:'join',to:wire.from});return;}
  if(wire.kind==='accept'&&this.role==='guest'&&(!this.remote||this.remote===wire.from)){
   if(!this.remote)this.resetPeer();const wasOpen=Boolean(this.connection?.open);this.remote=wire.from;this.lastRemote=now;this.connected();if(wasOpen)this.send({type:'ready'});this.deadline=0;this.openedResolve?.();this.openedResolve=null;this.openedReject=null;return;
  }
  if(wire.kind==='full'&&this.role==='guest'&&!this.connection?.open){this.fail('This run already has two survivors. Ask for a new invite.');return;}
  if(wire.from!==this.remote)return;
  this.lastRemote=now;
  if(wire.kind==='leave'){this.remote='';this.pending.clear();this.disconnected();this.onStatus(this.role==='host'?'FRIEND LEFT · INVITE IS STILL OPEN':'HOST LEFT · ASK FOR A NEW INVITE');return;}
  if(wire.kind==='ping'){this.broadcast({kind:'pong',to:this.remote});return;}
  if(wire.kind==='ack'&&Number.isInteger(wire.seq)){this.pending.delete(wire.seq!);return;}
  if(wire.kind!=='message'||!Number.isSafeInteger(wire.seq)||wire.seq!<1||!validPartyMessage(wire.message))return;
  if(this.role==='host'&&hostOnly.has(wire.message.type))return;
  const ephemeral=wire.message.type==='pose'||wire.message.type==='world';
  if(!ephemeral){
   if(!Number.isSafeInteger(wire.order)||wire.order!<1||wire.order!>this.expectedOrder+128)return;
   this.broadcast({kind:'ack',to:this.remote,seq:wire.seq});
   if(wire.order!<this.expectedOrder)return;
   this.incoming.set(wire.order!,wire);
   while(this.incoming.has(this.expectedOrder)){
    const next=this.incoming.get(this.expectedOrder)!;this.incoming.delete(this.expectedOrder++);this.onMessage(next.message!);
   }
   return;
  }
  if(this.seen.has(wire.seq!))return;
  this.seen.add(wire.seq!);if(this.seen.size>512)this.seen.delete(this.seen.values().next().value!);
  if(wire.message.type==='pose'){if(wire.seq!<=this.latestPose)return;this.latestPose=wire.seq!;}
  if(wire.message.type==='world'){if(wire.seq!<=this.latestWorld)return;this.latestWorld=wire.seq!;}
  this.onMessage(wire.message);
 }
 private resetPeer(){this.reliableOrder=0;this.expectedOrder=1;this.incoming.clear();this.pending.clear();this.seen.clear();this.latestPose=0;this.latestWorld=0;}
 private connected(){
  if(this.connection?.open)return;this.connection={open:true};this.onStatus('FRIEND CONNECTED · SERVER SYNC ACTIVE');this.onConnect();
 }
 private disconnected(){if(this.connection?.open){this.connection=null;this.onDisconnect();}}
 private announce(){
  if(!this.subscribed)return;this.lastAnnounce=this.options.now();
  this.broadcast({kind:this.role==='host'?'offer':'join',...(this.remote?{to:this.remote}:{})});
 }
 private broadcast(part:Partial<Wire>&{kind:string}){if(!this.role||!this.subscribed)return;this.push('broadcast',{event:'ion',type:'broadcast',payload:{v:2,from:this.session,role:this.role,...part}});}
 private push(event:string,payload:unknown,ref=String(++this.ref),topic=this.topic){
  if(this.socket?.readyState!==1||this.socket.bufferedAmount>256000)return;
  try{this.socket.send(JSON.stringify({topic,event,payload,ref,join_ref:topic==='phoenix'?null:this.joinRef}));}catch{this.reconnect();}
 }
 send(message:PartyMessage){
  if(!this.connection?.open||!this.subscribed||!validPartyMessage(message)||(this.role==='guest'&&hostOnly.has(message.type)))return;
  // Bound JSON size before putting a reliable message into the retry queue.
  if(JSON.stringify(message).length>200000)return;
  const wire:Wire={v:2,from:this.session,role:this.role!,kind:'message',to:this.remote,seq:++this.sequence,message};
  if(message.type!=='pose'&&message.type!=='world'){
   if(this.pending.size>=128){this.onStatus('ROOM SYNC BACKLOG · RECONNECTING');this.reconnect();return;}
   wire.order=++this.reliableOrder;this.pending.set(wire.seq!,{wire,sent:this.options.now(),tries:0});
  }
  this.broadcast(wire);
 }
 private reconnect(){
  if(this.stopped||this.retryAt)return;
  const socket=this.socket;this.socket=null;this.subscribed=false;this.disconnected();
  if(socket){socket.onopen=socket.onmessage=socket.onclose=socket.onerror=null;socket.close();}
  this.retryAt=this.options.now()+Math.min(10000,500*2**Math.min(this.retries++,5));
  this.onStatus('SERVER CONNECTION INTERRUPTED · RECONNECTING…');
 }
 private scheduleTick(){this.tickTimer=this.options.schedule(()=>{this.tickTimer=null;this.tick();if(!this.stopped)this.scheduleTick();},250);}
 private tick(){
  const now=this.options.now();if(this.stopped)return;
  if(this.deadline&&now>this.deadline){this.fail(this.role==='host'?'Server unavailable. Please try again.':'Host not found. Keep the host game open and use a fresh invite.');return;}
  if(this.retryAt){if(now>=this.retryAt)this.connectSocket();return;}
  if(now-this.lastServer>35000){this.reconnect();return;}
  if(!this.subscribed)return;
  if(now-this.lastPing>5000){this.lastPing=now;this.push('heartbeat',{},String(++this.ref),'phoenix');if(this.remote)this.broadcast({kind:'ping',to:this.remote});}
  if(this.remote&&now-this.lastRemote>20000){this.disconnected();this.onStatus('FRIEND CONNECTION LOST · WAITING TO REJOIN');this.remote='';this.pending.clear();}
  if(!this.connection?.open&&now-this.lastAnnounce>1200)this.announce();
  for(const entry of this.pending.values())if(now-entry.sent>1500){if(entry.tries++>=5){this.pending.clear();this.reconnect();break;}entry.sent=now;this.broadcast(entry.wire);}
 }
 private fail(message:string){const reject=this.openedReject;this.openedReject=null;this.openedResolve=null;this.close();this.onStatus(message);reject?.(new Error(message));}
 close(){
  const reject=this.openedReject;this.openedReject=null;this.openedResolve=null;
  if(!this.stopped&&this.remote)this.broadcast({kind:'leave',to:this.remote});
  this.stopped=true;if(this.tickTimer!==null)this.options.cancel(this.tickTimer);this.tickTimer=null;
  const socket=this.socket;this.socket=null;if(socket){socket.onopen=socket.onmessage=socket.onclose=socket.onerror=null;socket.close();}
  this.subscribed=false;this.pending.clear();this.disconnected();this.remote='';this.role=null;this.code='';this.retryAt=0;
  reject?.(new Error('Connection cancelled.'));
 }
}
