const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const {webcrypto}=require('node:crypto');
function loadMultiplayer(){
 const file=path.resolve(__dirname,'../app/multiplayer.ts');
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const module={exports:{}};
 const config=fs.readFileSync(path.resolve(__dirname,'../app/multiplayerConfig.ts'),'utf8').match(/'([^']+)'/)[1];
 vm.runInNewContext(code,{module,exports:module.exports,require:id=>{if(id==='./multiplayerConfig')return{MULTIPLAYER_RELAY:config};throw Error(id);},crypto:webcrypto,URL,setTimeout,clearTimeout,console});
 return module.exports;
}
function relayHarness(){
 let now=10000,nextTimer=0;const sockets=[],timers=new Map(),frames=[];let drop=()=>false;
 class Socket{
  readyState=0;bufferedAmount=0;onopen=null;onclose=null;onerror=null;onmessage=null;topic='';
  constructor(url){this.url=url;sockets.push(this);queueMicrotask(()=>{if(this.readyState!==0)return;this.readyState=1;this.onopen?.({});});}
  receive(frame){if(this.readyState===1)this.onmessage?.({data:typeof frame==='string'?frame:JSON.stringify(frame)});}
  send(text){
   const frame=JSON.parse(text);frames.push({socket:this,frame});
   if(frame.event==='phx_join'){this.topic=frame.topic;queueMicrotask(()=>this.receive({event:'phx_reply',topic:frame.topic,ref:frame.ref,payload:{status:'ok'}}));}
   if(frame.event==='heartbeat')queueMicrotask(()=>this.receive({event:'phx_reply',topic:'phoenix',ref:frame.ref,payload:{status:'ok'}}));
   if(frame.event==='broadcast')for(const other of sockets)if(other!==this&&other.topic===this.topic&&!drop(frame,other))queueMicrotask(()=>other.receive({...frame,ref:null}));
  }
  close(){this.readyState=3;this.onclose?.({});}
  break(){this.close();}
 }
 const options={socketFactory:url=>new Socket(url),now:()=>now,schedule:(fn,ms)=>{const id=++nextTimer;timers.set(id,{fn,at:now+ms});return id;},cancel:id=>timers.delete(id)};
 const api=loadMultiplayer();
 const create=()=>new api.PartyLink(options);
 const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
 const advance=async(ms)=>{const end=now+ms;for(let i=0;i<10000;i++){let chosen=null;for(const [id,t]of timers)if(t.at<=end&&(!chosen||t.at<chosen[1].at))chosen=[id,t];if(!chosen)break;now=chosen[1].at;timers.delete(chosen[0]);chosen[1].fn();await flush();}now=end;await flush();};
 const pair=async()=>{const host=create(),guest=create();await host.host('b'.repeat(32));await guest.join(host.code);await flush();return{host,guest,close:()=>{guest.close();host.close();}};};
 return {api,create,pair,sockets,frames,timers,flush,advance,setDrop:fn=>{drop=fn;},options};
}
const pose=(overrides={})=>({x:0,y:1.65,z:5,yaw:0,light:true,dead:false,room:25,name:'ScoutSalmon',...overrides});
module.exports={loadMultiplayer,relayHarness,pose};
