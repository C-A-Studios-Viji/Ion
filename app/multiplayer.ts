import Peer, { type DataConnection } from "peerjs";

export type Pose = { x: number; y: number; z: number; yaw: number; light: boolean; dead: boolean; room: number; name:string };
export type PartyMessage =
  | { type:"hello"; state:unknown; pose:Pose }
  | { type:"pose"; pose:Pose }
  | { type:"room"; state:unknown }
  | { type:"world"; room:number; noiseTime:number; grinIncoming:boolean; grinWarningTimer:number; doorOpening:boolean; enemies:{kind:string;alive:boolean;x:number;y:number;z:number}[] }
  | { type:"action"; room:number; action:"pickup"|"resonator"|"door"|"fire"|"revive"|"pers"|"rift"|"essence"; id?:number; x?:number; y?:number; z?:number }
  | { type:"request-room"; room:number }
  | { type:"dead"; room:number };

export const partyPeerId = (code: string) => `ion-facility-${code}`;
export const validPartyCode = (code: string) => /^\d{5}$/.test(code);
export const randomPartyCode = () => String(crypto.getRandomValues(new Uint32Array(1))[0] % 90000 + 10000);
export const hasTripleDigit = (code:string) => /^\d{5}$/.test(code) && [...new Set(code)].some(digit=>code.split(digit).length-1>=3);
const SECRET_SIGNALS:Record<string,"one-dev"|"skip-pers">={
  "1DEV1":"one-dev",XXOOP:"skip-pers",C9P98H:"skip-pers",SK1PP:"skip-pers",N0PERS:"skip-pers",
};
export function secretSignal(code:string):"one-dev"|"skip-pers"|null {
  return SECRET_SIGNALS[code.trim().toUpperCase()]??null;
}
const PEER_OPTIONS={host:"0.peerjs.com",port:443,path:"/",secure:true,debug:1,
  config:{iceServers:[
    {urls:"stun:stun.l.google.com:19302"},{urls:"stun:stun1.l.google.com:19302"},
    {urls:"stun:global.stun.twilio.com:3478"},{urls:"stun:stun.cloudflare.com:3478"},
  ]}} as const;
const NAME_PREFIXES=["Scout","Elder","Impaling","Stout","Lucrative","Silent","Crimson","Neon","Hollow","Royal","Brisk","Glitching","Brave","Distant","Arcane","Velvet"];
const NAME_NOUNS=["Salmon","Elmer","Ion","Shoe","Loquat","Quartz","Moth","Raven","Lantern","Badger","Comet","Gecko","Cobra","Echo","Otter","Falcon"];
export function randomPlayerName(rand=Math.random):string {
  return `${NAME_PREFIXES[Math.floor(rand()*NAME_PREFIXES.length)]}${NAME_NOUNS[Math.floor(rand()*NAME_NOUNS.length)]}`;
}

// One host and one friend. The host owns the room number and hazard rolls.
export class PartyLink {
  peer: Peer | null = null;
  connection: DataConnection | null = null;
  code = "";
  readonly playerName = randomPlayerName();
  role: "host" | "guest" | null = null;
  onMessage: (message: PartyMessage) => void = () => {};
  onStatus: (status: string) => void = () => {};
  onConnect: () => void = () => {};
  onDisconnect: () => void = () => {};
  private timer: ReturnType<typeof setTimeout> | null = null;

  async host(code = randomPartyCode()): Promise<string> {
    if (!validPartyCode(code)) throw new Error("The room code must contain five digits.");
    this.close(); this.role="host"; this.code=code;
    try { await new Promise<void>((resolve,reject) => {
      const peer=new Peer(partyPeerId(code),PEER_OPTIONS); this.peer=peer;
      const timeout=setTimeout(()=>reject(new Error("The multiplayer relay did not respond. Check that WebRTC is allowed.")),20000);this.timer=timeout;
      peer.on("open",()=>{clearTimeout(timeout);this.timer=null;resolve();});
      peer.on("error",(error)=>{clearTimeout(timeout);this.timer=null;reject(error);this.onStatus(error.type==="unavailable-id"?"Code already in use. Try again.":`Connection error: ${error.message}`);});
      peer.on("connection",conn=>{
        if(this.connection){conn.close();return;}
        this.bind(conn);
      });
      peer.on("disconnected",()=>{this.onStatus("Relay interrupted · reconnecting…");try{peer.reconnect();}catch{/* Peer may already be closing. */}});
    }); } catch(error) {this.close();throw error;}
    this.onStatus(`Room ${code} ready · waiting for a friend`);
    return code;
  }

  async join(code:string): Promise<void> {
    if(!validPartyCode(code)) throw new Error("Enter the five-digit room code.");
    this.close();this.role="guest";this.code=code;
    try { await new Promise<void>((resolve,reject)=>{
      const peer=new Peer(PEER_OPTIONS);this.peer=peer;
      const timeout=setTimeout(()=>reject(new Error("Connection timed out. Confirm the host is waiting and both browsers allow WebRTC.")),25000);
      this.timer=timeout;
      peer.on("open",()=>{
        const conn=peer.connect(partyPeerId(code),{serialization:"json",reliable:true,metadata:{name:this.playerName}});this.bind(conn);
        conn.on("open",()=>{clearTimeout(timeout);this.timer=null;resolve();});
      });
      peer.on("error",error=>{clearTimeout(timeout);this.timer=null;reject(error);this.onStatus(`Connection error: ${error.message}`);});
      peer.on("disconnected",()=>{this.onStatus("Relay interrupted · reconnecting…");try{peer.reconnect();}catch{/* Peer may already be closing. */}});
    }); } catch(error) {this.close();throw error;}
  }

  private bind(conn:DataConnection) {
    this.connection=conn;
    conn.on("open",()=>{this.onStatus("Friend connected · shared descent active");this.onConnect();});
    conn.on("data",data=>{
      if(!data || typeof data!=="object")return;
      const message=data as PartyMessage;
      if(["hello","pose","room","world","action","request-room","dead"].includes(message.type))this.onMessage(message);
    });
    conn.on("close",()=>{if(this.connection===conn){this.connection=null;this.onStatus(this.role==="host"?"Friend disconnected · room still open":"Host disconnected · return to solo play");this.onDisconnect();}});
    conn.on("error",error=>this.onStatus(`Peer error: ${error.message}`));
    conn.peerConnection?.addEventListener("iceconnectionstatechange",()=>{
      const state=conn.peerConnection?.iceConnectionState;
      if(state==="checking")this.onStatus("Friend found · establishing encrypted route…");
      if(state==="failed")this.onStatus("Direct route failed · retry from the same code");
    });
  }

  send(message:PartyMessage) { if(this.connection?.open)this.connection.send(message); }
  close() {
    if(this.timer){clearTimeout(this.timer);this.timer=null;}
    this.connection?.close();this.peer?.destroy();this.connection=null;this.peer=null;this.role=null;this.code="";
  }
}
