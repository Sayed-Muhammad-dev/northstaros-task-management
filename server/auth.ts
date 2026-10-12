import {createHash,randomBytes,randomUUID,scrypt,timingSafeEqual} from 'node:crypto'
import type {SQL,Database} from './database'
import type {User} from './contracts'
import {ensure,uniqueError,HttpError} from './errors'
import {registerSchema,loginSchema,passwordChangeSchema} from './validation'
import {sampleState,stateAudit,userProjection} from './state'

export const COOKIE_NAME='ns_session'
export const SESSION_SECONDS=7*86400
export const hashToken=(token:string)=>createHash('sha256').update(token).digest('hex')
const key=(password:string,salt:string)=>new Promise<Buffer>((resolve,reject)=>scrypt(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024},(error,result)=>error?reject(error):resolve(result)))
export async function hashPassword(password:string):Promise<string> {
 const salt=randomBytes(16).toString('hex');return `scrypt-v1:${salt}:${(await key(password,salt)).toString('hex')}`
}
const dummyHash=`scrypt-v1:${'0'.repeat(32)}:${'0'.repeat(128)}`
export async function verifyPassword(password:string,hash:string):Promise<boolean> {
 const parts=hash.split(':')
 if(parts.length!==3||parts[0]!=='scrypt-v1'||! /^[a-f0-9]{32}$/.test(parts[1])||! /^[a-f0-9]{128}$/.test(parts[2]))return false
 return timingSafeEqual(await key(password,parts[1]),Buffer.from(parts[2],'hex'))
}
export function cookie(token:string,origin:string,clear=false):string {
 return `${COOKIE_NAME}=${clear?'':token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${clear?0:SESSION_SECONDS}${new URL(origin).protocol==='https:'?'; Secure':''}`
}
export function sessionHash(cookieHeader:string|undefined):string|null {
 const values=(cookieHeader??'').split(';').map(p=>p.trim()).filter(p=>p.startsWith(COOKIE_NAME+'='))
 if(values.length!==1)return null
 const token=values[0].slice(COOKIE_NAME.length+1)
 return /^[a-f0-9]{64}$/.test(token)?hashToken(token):null
}
export async function findSession(tx:SQL,tokenHash:string|null):Promise<User|null> {
 if(!tokenHash)return null
 const [r]=await tx.rows(`SELECT u.id,u.name,u.email,m.role,w.id AS workspace_id,w.name AS workspace_name
 FROM sessions s JOIN users u ON u.id=s.user_id JOIN memberships m ON m.user_id=u.id AND m.workspace_id=s.workspace_id
 JOIN workspaces w ON w.id=m.workspace_id WHERE s.token_hash=? AND s.expires_at>? AND s.password_version=u.password_version`,[tokenHash,new Date().toISOString()])
 return r?userProjection(r):null
}
export async function requireSession(tx:SQL,tokenHash:string|null):Promise<User> {const user=await findSession(tx,tokenHash);ensure(user,401,'Sign in to continue');return user}
export async function issueSession(tx:SQL,userId:string,workspaceId:string):Promise<string> {
 const token=randomBytes(32).toString('hex'),now=new Date().toISOString(),expires=new Date(Date.now()+SESSION_SECONDS*1000).toISOString()
 const [u]=await tx.rows('SELECT password_version FROM users WHERE id=?',[userId]);ensure(u,401,'Sign in to continue')
 await tx.run('DELETE FROM sessions WHERE expires_at<=?',[now])
 await tx.run('INSERT INTO sessions(token_hash,user_id,workspace_id,password_version,expires_at,created_at) VALUES (?,?,?,?,?,?)',[hashToken(token),userId,workspaceId,Number(u.password_version),expires,now])
 return token
}
export async function register(db:Database,input:unknown):Promise<{user:User;token:string}> {
 const data=registerSchema.parse(input),passwordHash=await hashPassword(data.password)
 try{return await db.transaction(async tx=>{
  const id=randomUUID(),workspaceId=randomUUID(),now=new Date().toISOString()
  await tx.run('INSERT INTO users(id,name,email,password_hash,created_at) VALUES (?,?,?,?,?)',[id,data.name,data.email,passwordHash,now])
  await tx.run('INSERT INTO workspaces(id,name,created_at) VALUES (?,?,?)',[workspaceId,data.company,now])
  await tx.run('INSERT INTO memberships(workspace_id,user_id,role,created_at) VALUES (?,?,?,?)',[workspaceId,id,'owner',now])
  const user:User={id,name:data.name,email:data.email,role:'owner',workspaceId,workspaceName:data.company},state=sampleState(id,data.company)
  stateAudit(state,user,'Workspace registered with labelled sample data')
  await tx.run('INSERT INTO workspace_state(workspace_id,revision,state,updated_at) VALUES (?,1,?,?)',[workspaceId,JSON.stringify(state),now])
  return {user,token:await issueSession(tx,id,workspaceId)}
 })}catch(error){if(uniqueError(error))throw new HttpError(409,'An account with that email already exists');throw error}
}
export async function login(db:Database,input:unknown):Promise<{user:User;token:string}> {
 const data=loginSchema.parse(input),[record]=await db.rows('SELECT id,password_hash FROM users WHERE email=?',[data.email])
 const valid=await verifyPassword(data.password,record?String(record.password_hash):dummyHash)
 ensure(record&&valid,401,'Invalid email or password')
 return db.transaction(async tx=>{
  const [r]=await tx.rows(`SELECT u.id,u.name,u.email,m.role,u.password_hash,w.id AS workspace_id,w.name AS workspace_name
   FROM users u JOIN memberships m ON m.user_id=u.id JOIN workspaces w ON w.id=m.workspace_id WHERE u.id=? ORDER BY m.created_at,w.id LIMIT 1`,[String(record.id)])
  ensure(r&&r.password_hash===record.password_hash,401,'Invalid email or password')
  const user=userProjection(r);return {user,token:await issueSession(tx,user.id,user.workspaceId)}
 })
}
export async function changePassword(db:Database,tokenHash:string|null,input:unknown):Promise<string> {
 const data=passwordChangeSchema.parse(input)
 const user=await requireSession(db,tokenHash),[record]=await db.rows('SELECT password_hash FROM users WHERE id=?',[user.id])
 ensure(record&&await verifyPassword(data.oldPassword,String(record.password_hash)),401,'Current password is incorrect')
 const nextHash=await hashPassword(data.newPassword)
 return db.transaction(async tx=>{
  const current=await requireSession(tx,tokenHash)
  const changed=await tx.run('UPDATE users SET password_hash=?,password_version=password_version+1 WHERE id=? AND password_hash=?',[nextHash,current.id,String(record.password_hash)])
  ensure(changed,409,'Password changed. Sign in again.')
  await tx.run('DELETE FROM sessions WHERE user_id=?',[current.id])
  return issueSession(tx,current.id,current.workspaceId)
 })
}
/** The counter commit survives a rejected request and process restarts. Socket IP only; no untrusted forwarding headers. */
export async function rateGuard(db:Database,identity:string,limit:number,windowMs:number):Promise<void> {
 const now=Date.now(),keyHash=hashToken(identity)
 const allowed=await db.transaction(async tx=>{
  await tx.run('DELETE FROM rate_guards WHERE window_start<?',[now-86400000])
  const [r]=await tx.rows('SELECT window_start,hits FROM rate_guards WHERE key_hash=?',[keyHash])
  const expired=!r||now-Number(r.window_start)>=windowMs,hits=expired?1:Number(r.hits)+1,start=expired?now:Number(r.window_start)
  await tx.run('INSERT INTO rate_guards(key_hash,window_start,hits) VALUES (?,?,?) ON CONFLICT(key_hash) DO UPDATE SET window_start=excluded.window_start,hits=excluded.hits',[keyHash,start,hits])
  return hits<=limit
 })
 ensure(allowed,429,'Too many requests. Try again later.')
}
