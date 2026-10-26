export function permissionDay(now=new Date()):string {
 return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
export type PermissionRecord={date:string;sha256:string};
export async function verifyPermission(code:string,record:PermissionRecord,now=new Date()):Promise<boolean>{
 if(record.date!==permissionDay(now)||!/^[A-F0-9]{32}$/i.test(code.trim())||!/^[a-f0-9]{64}$/.test(record.sha256))return false;
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(code.trim().toUpperCase()));
 return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('')===record.sha256;
}
