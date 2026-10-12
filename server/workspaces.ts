import {randomBytes,randomUUID} from 'node:crypto'
import type {Database,SQL} from './database'
import type {User,Role} from './contracts'
import {hashToken,requireSession} from './auth'
import {ensure} from './errors'
import {defaultState,readStored,saveStored,stateAudit,projectState,refreshUser} from './state'
import {inviteSchema,acceptInviteSchema,roleSchema,selectWorkspaceSchema,createWorkspaceSchema} from './validation'

export async function workspaceSession(tx:SQL,tokenHash:string|null,expected?:string):Promise<User> {
 const user=await requireSession(tx,tokenHash)
 ensure(!expected||expected===user.workspaceId,409,'Selected workspace changed. Reload workspace state.')
 return user
}
export async function listWorkspaces(db:Database,tokenHash:string|null) {
 return db.transaction(async tx=>{
  const user=await requireSession(tx,tokenHash)
  return {workspaces:(await tx.rows('SELECT w.id,w.name,m.role FROM memberships m JOIN workspaces w ON w.id=m.workspace_id WHERE m.user_id=? ORDER BY m.created_at,w.id',[user.id])).map(r=>({id:String(r.id),name:String(r.name),role:r.role as Role}))}
 })
}
export async function selectWorkspace(db:Database,tokenHash:string|null,input:unknown) {
 const {id}=selectWorkspaceSchema.parse(input)
 return db.transaction(async tx=>{
  const user=await requireSession(tx,tokenHash),next=await refreshUser(tx,{...user,workspaceId:id})
  await tx.run('UPDATE sessions SET workspace_id=? WHERE token_hash=?',[id,tokenHash])
  return {user:next}
 })
}
export async function createWorkspace(db:Database,tokenHash:string|null,input:unknown) {
 const {name}=createWorkspaceSchema.parse(input)
 return db.transaction(async tx=>{
  const user=await requireSession(tx,tokenHash),now=new Date().toISOString(),id=randomUUID()
  const [count]=await tx.rows('SELECT COUNT(*) AS total FROM memberships WHERE user_id=?',[user.id]);ensure(Number(count.total)<50,409,'Workspace limit reached')
  await tx.run('INSERT INTO workspaces(id,name,created_at) VALUES (?,?,?)',[id,name,now])
  await tx.run('INSERT INTO memberships(workspace_id,user_id,role,created_at) VALUES (?,?,?,?)',[id,user.id,'owner',now])
  const next:User={...user,role:'owner',workspaceId:id,workspaceName:name},state=defaultState()
  state.messageThreads=[{id:randomUUID(),title:'Workspace conversation',participants:[user.id],lastMessage:'',unread:0,messages:[]}]
  stateAudit(state,next,'Workspace created')
  await tx.run('INSERT INTO workspace_state(workspace_id,revision,state,updated_at) VALUES (?,1,?,?)',[id,JSON.stringify(state),now])
  await tx.run('UPDATE sessions SET workspace_id=? WHERE token_hash=?',[id,tokenHash])
  return {user:next}
 })
}
export async function createInvitation(db:Database,tokenHash:string|null,input:unknown,origin:string,expected?:string) {
 const data=inviteSchema.parse(input),token=randomBytes(32).toString('hex')
 return db.transaction(async tx=>{
  const user=await workspaceSession(tx,tokenHash,expected);ensure(user.role==='owner',403,'Workspace owner access is required')
  const [existing]=await tx.rows('SELECT u.id FROM users u JOIN memberships m ON m.user_id=u.id WHERE m.workspace_id=? AND u.email=?',[user.workspaceId,data.email]);ensure(!existing,409,'That account is already a workspace member')
  const now=new Date().toISOString(),id=randomUUID(),expiresAt=new Date(Date.now()+7*86400000).toISOString()
  const [count]=await tx.rows('SELECT COUNT(*) AS total FROM invitations WHERE workspace_id=? AND accepted_at IS NULL AND expires_at>?',[user.workspaceId,now]);ensure(Number(count.total)<200,409,'Pending invitation limit reached')
  // Reissuing invalidates the previous link for this email rather than leaving parallel live tokens.
  await tx.run('DELETE FROM invitations WHERE workspace_id=? AND email=? AND accepted_at IS NULL',[user.workspaceId,data.email])
  await tx.run('INSERT INTO invitations(id,workspace_id,email,role,token_hash,expires_at,creator_id,created_at) VALUES (?,?,?,?,?,?,?,?)',[id,user.workspaceId,data.email,data.role,hashToken(token),expiresAt,user.id,now])
  const {revision,state}=await readStored(tx,user.workspaceId);stateAudit(state,user,`Invitation created (${data.role})`);await saveStored(tx,user.workspaceId,revision,state)
  return {invitation:{id,email:data.email,role:data.role,expiresAt},inviteLink:`${origin}/invite?token=${token}`}
 })
}
export async function acceptInvitation(db:Database,tokenHash:string|null,input:unknown) {
 const {token}=acceptInviteSchema.parse(input)
 return db.transaction(async tx=>{
  const user=await requireSession(tx,tokenHash),now=new Date().toISOString()
  const [invite]=await tx.rows('SELECT id,workspace_id,email,role,expires_at,accepted_at FROM invitations WHERE token_hash=?',[hashToken(token)])
  ensure(invite&&!invite.accepted_at&&String(invite.expires_at)>now,410,'Invitation is invalid, expired or already used')
  ensure(invite.email===user.email,403,'Sign in with the email addressed by this invitation')
  const workspaceId=String(invite.workspace_id)
  const [existing]=await tx.rows('SELECT role FROM memberships WHERE workspace_id=? AND user_id=?',[workspaceId,user.id]);ensure(!existing,409,'You are already a workspace member')
  const [count]=await tx.rows('SELECT COUNT(*) AS total FROM memberships WHERE workspace_id=?',[workspaceId]);ensure(Number(count.total)<200,409,'Workspace member limit reached')
  await tx.run('INSERT INTO memberships(workspace_id,user_id,role,created_at) VALUES (?,?,?,?)',[workspaceId,user.id,String(invite.role),now])
  const consumed=await tx.run('UPDATE invitations SET accepted_at=?,accepted_user_id=? WHERE id=? AND accepted_at IS NULL AND expires_at>?',[now,user.id,String(invite.id),now]);ensure(consumed,410,'Invitation is invalid, expired or already used')
  await tx.run('UPDATE sessions SET workspace_id=? WHERE token_hash=?',[workspaceId,tokenHash])
  const next=await refreshUser(tx,{...user,workspaceId}),{revision,state}=await readStored(tx,workspaceId)
  const thread=state.messageThreads.find(t=>t.title==='Workspace conversation');if(thread&&!thread.participants.includes(user.id))thread.participants.push(user.id)
  state.notifications.push({id:randomUUID(),userId:user.id,title:'Workspace joined',description:'Your invitation was accepted.',time:now,category:'Team',read:false})
  stateAudit(state,next,'Invitation accepted');await saveStored(tx,workspaceId,revision,state)
  return {user:next}
 })
}
export async function changeRole(db:Database,tokenHash:string|null,input:unknown,expected?:string) {
 const {id,role}=roleSchema.parse(input)
 return db.transaction(async tx=>{
  const user=await workspaceSession(tx,tokenHash,expected);ensure(user.role==='owner',403,'Workspace owner access is required')
  const [member]=await tx.rows('SELECT role FROM memberships WHERE workspace_id=? AND user_id=?',[user.workspaceId,id]);ensure(member,404,'Workspace member not found')
  if(member.role==='owner'&&role==='member'){
   const [count]=await tx.rows("SELECT COUNT(*) AS total FROM memberships WHERE workspace_id=? AND role='owner'",[user.workspaceId]);ensure(Number(count.total)>1,409,'The workspace must retain an owner')
  }
  await tx.run('UPDATE memberships SET role=? WHERE workspace_id=? AND user_id=?',[role,user.workspaceId,id])
  const {revision,state}=await readStored(tx,user.workspaceId);stateAudit(state,user,`Member role changed to ${role}`)
  return projectState(tx,user,{revision:await saveStored(tx,user.workspaceId,revision,state),state})
 })
}
