const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const {EventEmitter}=require('node:events');
const {webcrypto}=require('node:crypto');

test('five-digit host and guest exchange room state and live actions over a data connection',async()=>{
  const peers=new Map();
  class Connection extends EventEmitter{
    open=false;
    send(message){if(this.open)queueMicrotask(()=>this.other.emit('data',message));}
    close(){if(!this.open)return;this.open=false;this.emit('close');this.other.open=false;this.other.emit('close');}
  }
  class Peer extends EventEmitter{
    constructor(id){super();this.id=id??`guest-${peers.size}`;peers.set(this.id,this);queueMicrotask(()=>this.emit('open',this.id));}
    connect(id){
      const client=new Connection(),server=new Connection();client.other=server;server.other=client;
      queueMicrotask(()=>{const host=peers.get(id);if(!host){this.emit('error',new Error('Room unavailable'));return;}
        host.emit('connection',server);server.open=true;client.open=true;server.emit('open');client.emit('open');});
      return client;
    }
    destroy(){peers.delete(this.id);}
  }
  const file=path.resolve(__dirname,'../app/multiplayer.ts');
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const module={exports:{}};
  vm.runInNewContext(code,{module,exports:module.exports,require:()=>Peer,crypto:webcrypto,setTimeout,clearTimeout,console,queueMicrotask});
  const {PartyLink,partyPeerId,validPartyCode,hasTripleDigit,randomPlayerName}=module.exports;
  assert.equal(validPartyCode('12345'),true);assert.equal(validPartyCode('1234'),false);
  assert.equal(hasTripleDigit('11311'),true);assert.equal(hasTripleDigit('12345'),false);
  assert.equal(randomPlayerName(()=>0),'ScoutSalmon');
  assert.equal(partyPeerId('12345'),'ion-facility-12345');
  const host=new PartyLink(),guest=new PartyLink();let receivedByGuest,receivedByHost;
  guest.onMessage=message=>{receivedByGuest=message;};host.onMessage=message=>{receivedByHost=message;};
  host.onConnect=()=>host.send({type:'hello',state:{room:25},pose:{x:0,y:0,z:1,yaw:0,light:true,dead:false,room:25,name:host.playerName}});
  assert.equal(await host.host('12345'),'12345');await guest.join('12345');
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(receivedByGuest.type,'hello');assert.equal(receivedByGuest.state.room,25);
  assert.equal(typeof receivedByGuest.pose.name,'string');assert(receivedByGuest.pose.name.length>4);
  guest.send({type:'action',room:25,action:'resonator',id:3});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(receivedByHost.action,'resonator');assert.equal(receivedByHost.id,3);
  host.send({type:'room',state:{room:26}});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(receivedByGuest.state.room,26);
  guest.close();host.close();
});
