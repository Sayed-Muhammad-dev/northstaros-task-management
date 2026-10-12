import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm,mkdir,writeFile,symlink} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fork,type ChildProcess} from 'node:child_process'
import {request} from 'node:http'
import {createServer} from '../server/app'
import {openDatabase} from '../server/database'
import {rateGuard,COOKIE_NAME,cookie} from '../server/auth'
import type {StateResponse,User,ReportsResponse} from '../server/contracts'

const ORIGIN='http://127.0.0.1:5345',PASSWORD='Correct-password-123!'
class Client {
 cookie=''
 constructor(public base:string){}
 async call<T=Record<string,unknown>>(route:string,body?:unknown,headers:Record<string,string>={}) {
  const response=await fetch(this.base+route,{method:body===undefined?'GET':'POST',headers:{...(this.cookie?{Cookie:this.cookie}:{}),...(body===undefined?{}:{Origin:ORIGIN,'Content-Type':'application/json'}),...headers},body:body===undefined?undefined:JSON.stringify(body)})
  const next=response.headers.get('set-cookie');if(next)this.cookie=next.split(';')[0]
  const text=await response.text(),data=(response.headers.get('content-type')?.startsWith('application/json')?JSON.parse(text):text) as T
  return {status:response.status,data,headers:response.headers}
 }
 async register(email='owner@example.test',name='Actual Owner') {
  const r=await this.call<{user:User}>('/api/auth/register',{name,email,company:'Test workspace',password:PASSWORD});assert.equal(r.status,201);return r.data.user
 }
 async state(){const r=await this.call<StateResponse>('/api/state');assert.equal(r.status,200);return r.data}
 async mutate(action:string,payload:unknown,revision?:number){const current=await this.state();return this.call<StateResponse>('/api/state',{revision:revision??current.revision,action,payload},{'X-Workspace-Id':current.workspace.id})}
}
async function fixture() {
 const directory=await mkdtemp(path.join(tmpdir(),'northstar-backend-')),filename=path.join(directory,'test.sqlite')
 const app=await createServer({databasePath:filename,origin:ORIGIN,serveStatic:false})
 await new Promise<void>(resolve=>app.server.listen(0,'127.0.0.1',resolve))
 const address=app.server.address();assert(address&&typeof address!=='string')
 return {app,directory,filename,client:new Client(`http://127.0.0.1:${address.port}`),async cleanup(){await app.close();await removeFixture(directory)}}
}
async function removeFixture(directory:string) {
 const relative=path.relative(tmpdir(),directory)
 assert(relative.startsWith('northstar-backend-')&&!relative.includes(path.sep)&&!path.isAbsolute(relative))
 await rm(directory,{recursive:true,force:true})
}
function projectInput(id:string,name='Real project'){return {name,client:'Actual client',summary:'Project summary',dueDate:'2030-01-31',members:[id],budget:'',tags:[]}}
function taskInput(projectId:string,id:string,title='Real task'){return {title,projectId,description:'Task description',status:'Todo',priority:'Medium',dueDate:'2030-01-31',assigneeId:id,labels:[],subtasks:[{label:'Real step',done:false}]}}

test('registration normalizes email, seeds only actual membership and rejects client identity/role fields',async()=>{
 const f=await fixture();try{
  const user=await f.client.register('  OWNER@Example.Test  '),state=await f.client.state()
  assert.equal(user.email,'owner@example.test');assert.equal(user.role,'owner');assert.equal(state.members.length,1);assert.equal(state.members[0].id,user.id)
  assert(state.projects.every(p=>p.name.startsWith('Sample:')&&p.members.every(id=>id===user.id)))
  assert(state.tasks.every(t=>t.assigneeId===user.id&&t.attachments===0&&t.comments===0));assert(state.messageThreads.every(t=>t.participants.length===1&&t.participants[0]===user.id))
  const [record]=await f.app.db.rows('SELECT password_hash FROM users WHERE id=?',[user.id]);assert(String(record.password_hash).startsWith('scrypt-v1:'));assert(!String(record.password_hash).includes(PASSWORD))
  assert.equal((await f.client.call('/api/auth/register',{name:'Evil',company:'Company',email:'evil@example.test',password:PASSWORD,role:'owner'})).status,400)
  assert.equal((await f.client.call('/api/auth/register',{name:'Short',company:'Company',email:'short@example.test',password:'short'})).status,400)
  assert.equal((await f.client.call('/api/auth/register',{name:'Duplicate',company:'Company',email:'OWNER@example.test',password:PASSWORD})).status,409)
  const response=await f.client.call<{user:User}>('/api/me');assert.equal(response.data.user.id,user.id)
  const cookies=f.client.cookie;assert(cookies.startsWith(COOKIE_NAME+'='));assert(cookie('x',ORIGIN).includes('HttpOnly'));assert(cookie('x','https://example.test').includes('Secure'))
 }finally{await f.cleanup()}
})
test('password change revokes all previous sessions; logout invalidates the replacement and login checks current password',async()=>{
 const f=await fixture();try{
  await f.client.register();const firstCookie=f.client.cookie,other=new Client(f.client.base)
  assert.equal((await other.call('/api/auth/login',{email:'OWNER@example.test',password:PASSWORD})).status,200)
  const otherCookie=other.cookie
  assert.equal((await f.client.call('/api/auth/password',{oldPassword:'Wrong password',newPassword:'Replacement-password-123!'})).status,401)
  assert.equal((await f.client.call('/api/auth/password',{oldPassword:PASSWORD,newPassword:'Replacement-password-123!'})).status,200)
  const replacement=f.client.cookie;assert.notEqual(replacement,firstCookie)
  for(const old of [firstCookie,otherCookie]){const stale=new Client(f.client.base);stale.cookie=old;assert.equal((await stale.call<{user:null}>('/api/me')).data.user,null);assert.equal((await stale.call('/api/state')).status,401)}
  assert.equal((await other.call('/api/auth/login',{email:'owner@example.test',password:PASSWORD})).status,401)
  assert.equal((await other.call('/api/auth/login',{email:'owner@example.test',password:'Replacement-password-123!'})).status,200)
  assert.equal((await f.client.call('/api/auth/logout',{})).status,200)
  const loggedOut=new Client(f.client.base);loggedOut.cookie=replacement;assert.equal((await loggedOut.call('/api/backup')).status,401)
 }finally{await f.cleanup()}
})
test('exact browser APP_ORIGIN, JSON/body bounds and stale workspace header are enforced without trusting Host or forwarding headers',async()=>{
 const f=await fixture();try{
  const user=await f.client.register()
  for(const origin of ['http://localhost:5345','https://evil.example','null',''])assert.equal((await f.client.call('/api/auth/logout',{}, {Origin:origin})).status,403)
  assert.equal((await f.client.call('/api/auth/logout',{}, {'Sec-Fetch-Site':'cross-site'})).status,403)
  assert.equal((await f.client.call('/api/auth/logout',{}, {'Content-Type':'text/plain'})).status,415)
  assert.equal((await f.client.call('/api/state',{revision:1,action:'updateProfile',payload:{name:'x'.repeat(140000),team:''}})).status,413)
  const state=await f.client.state();assert.equal((await f.client.call('/api/state',{revision:state.revision,action:'updateProfile',payload:{name:'Changed',team:''}},{'X-Workspace-Id':'other-workspace'})).status,409)
  assert.equal((await f.client.call<{user:User}>('/api/me')).data.user.name,user.name)
  assert.equal((await f.client.call('/api/health')).status,200)
 }finally{await f.cleanup()}
})
test('workspace isolation, selection and empty new workspace persist across connection restart',async()=>{
 const f=await fixture();let closed=false;try{
  const owner=await f.client.register(),first=await f.client.state(),other=new Client(f.client.base);await other.register('other@example.test','Other Owner')
  const second=await other.state();assert.notEqual(first.workspace.id,second.workspace.id);assert(!second.tasks.some(t=>first.tasks.some(a=>a.id===t.id)))
  assert.equal((await other.call('/api/workspaces/select',{id:first.workspace.id})).status,403)
  assert.equal((await other.mutate('updateTask',{id:first.tasks[0].id,patch:{title:'Hijacked'}})).status,404)
  const created=await f.client.call<{user:User}>('/api/workspaces',{name:'Empty real workspace'});assert.equal(created.status,201)
  assert.equal((await f.client.state()).tasks.length,0)
  assert.equal((await f.client.call('/api/workspaces/select',{id:owner.workspaceId})).status,200)
  assert.equal((await f.client.mutate('updateProfile',{name:'Persisted Owner',team:'Engineering'})).status,200)
  const authCookie=f.client.cookie;await f.app.close();closed=true
  const reopened=await createServer({databasePath:f.filename,origin:ORIGIN,serveStatic:false});try{
   await new Promise<void>(resolve=>reopened.server.listen(0,'127.0.0.1',resolve));const address=reopened.server.address();assert(address&&typeof address!=='string')
   const client=new Client(`http://127.0.0.1:${address.port}`);client.cookie=authCookie
   const persisted=await client.state();assert.equal(persisted.currentUser.name,'Persisted Owner');assert.equal(persisted.members[0].team,'Engineering');assert.equal(persisted.tasks[0].id,first.tasks[0].id)
   const spaces=await client.call<{workspaces:unknown[]}>('/api/workspaces');assert.equal(spaces.data.workspaces.length,2)
  }finally{await reopened.close()}
 }finally{if(!closed)await f.app.close();await removeFixture(f.directory)}
})
test('invitations are exact-email, one-use, expiring and cannot elevate an existing membership',async()=>{
 const f=await fixture();try{
  const owner=await f.client.register(),member=new Client(f.client.base),wrong=new Client(f.client.base)
  await member.register('member@example.test','Real Member');await wrong.register('wrong@example.test','Wrong Account')
  const result=await f.client.call<{invitation:{id:string};inviteLink:string}>('/api/invitations',{email:'MEMBER@example.test',role:'member'});assert.equal(result.status,201)
  const token=new URL(result.data.inviteLink).searchParams.get('token');assert(token)
  const [row]=await f.app.db.rows('SELECT token_hash FROM invitations WHERE id=?',[result.data.invitation.id]);assert.notEqual(String(row.token_hash),token)
  assert.equal((await wrong.call('/api/invitations/accept',{token})).status,403)
  const joined=await member.call<{user:User}>('/api/invitations/accept',{token});assert.equal(joined.status,200);assert.equal(joined.data.user.role,'member');assert.equal(joined.data.user.workspaceId,owner.workspaceId)
  assert.equal((await member.call('/api/invitations/accept',{token})).status,410)
  assert.equal((await f.client.call('/api/invitations',{email:'member@example.test',role:'owner'})).status,409)
  const expired=await f.client.call<{invitation:{id:string};inviteLink:string}>('/api/invitations',{email:'wrong@example.test',role:'member'})
  await f.app.db.run('UPDATE invitations SET expires_at=? WHERE id=?',['2000-01-01T00:00:00.000Z',expired.data.invitation.id])
  assert.equal((await wrong.call('/api/invitations/accept',{token:new URL(expired.data.inviteLink).searchParams.get('token')})).status,410)
  const replacement1=await f.client.call<{inviteLink:string}>('/api/invitations',{email:'new@example.test',role:'member'})
  await f.client.call('/api/invitations',{email:'new@example.test',role:'member'})
  assert.equal((await wrong.call('/api/invitations/accept',{token:new URL(replacement1.data.inviteLink).searchParams.get('token')})).status,410)
  assert.equal((await member.state()).members.length,2);assert.equal((await member.state()).invitations.length,0)
 }finally{await f.cleanup()}
})
test('member RBAC denies owner operations, authors are server assigned, actual members can collaborate and last owner is protected',async()=>{
 const f=await fixture();try{
  const owner=await f.client.register(),member=new Client(f.client.base),memberUser=await member.register('member@example.test','Real Member')
  const invitation=await f.client.call<{inviteLink:string}>('/api/invitations',{email:memberUser.email,role:'member'});await member.call('/api/invitations/accept',{token:new URL(invitation.data.inviteLink).searchParams.get('token')})
  const state=await member.state()
  assert.equal((await member.mutate('createTask',taskInput(state.projects[0].id,memberUser.id))).status,400)
  assert.equal((await f.client.mutate('updateProject',{id:state.projects[0].id,patch:{members:[memberUser.id]}})).status,400)
  for(const [action,payload] of [['createProject',projectInput(owner.id)],['deleteProject',{id:state.projects[0].id}],['updateSettings',{patch:{appearance:'dark'}}]] as const)assert.equal((await member.mutate(action,payload)).status,403)
  for(const route of ['/api/invitations','/api/members/role'])assert.equal((await member.call(route,route.endsWith('role')?{id:owner.id,role:'member'}:{email:'x@example.test',role:'member'})).status,403)
  assert.equal((await member.call('/api/backup')).status,403)
  const comment=await member.mutate('addComment',{taskId:state.tasks[0].id,content:'Actual member comment'});assert.equal(comment.status,200);assert.equal(comment.data.comments[state.tasks[0].id][0].authorId,memberUser.id)
  assert.equal((await member.mutate('addComment',{taskId:state.tasks[0].id,content:'Spoof',authorId:owner.id})).status,400)
  const message=await member.mutate('addMessage',{threadId:state.messageThreads[0].id,content:'Actual message'});assert.equal(message.status,200);assert.equal(message.data.messageThreads[0].messages[0].authorId,memberUser.id)
  assert.equal((await member.mutate('updateProfile',{name:'Escalate',team:'',role:'owner'})).status,400)
  assert.equal((await f.client.call('/api/members/role',{id:owner.id,role:'member'})).status,409)
  assert.equal((await f.client.call('/api/members/role',{id:memberUser.id,role:'owner'})).status,200)
  assert.equal((await member.call<{user:User}>('/api/me')).data.user.role,'owner')
  assert.equal((await f.client.call('/api/members/role',{id:owner.id,role:'member'})).status,200)
  assert.equal((await f.client.call('/api/backup')).status,403)
 }finally{await f.cleanup()}
})
test('strict reference/date validation rolls back; immutable server counts and same-task subtask IDs cannot be spoofed',async()=>{
 const f=await fixture();try{
  const user=await f.client.register(),state=await f.client.state(),revision=state.revision
  assert.equal((await f.client.mutate('createProject',{...projectInput(user.id),members:['fake-member']})).status,400)
  assert.equal((await f.client.mutate('createTask',{...taskInput(state.projects[0].id,user.id),dueDate:'2030-02-31'})).status,400)
  assert.equal((await f.client.mutate('createTask',taskInput('outside-project',user.id))).status,404)
  assert.equal((await f.client.mutate('createTask',taskInput(state.projects[0].id,'fake-user'))).status,400)
  assert.equal((await f.client.mutate('updateTask',{id:state.tasks[0].id,patch:{progress:100}})).status,400)
  assert.equal((await f.client.mutate('updateTask',{id:state.tasks[1].id,patch:{subtasks:[{id:state.tasks[0].subtasks[0].id,label:'Spoof',done:true}]}})).status,400)
  assert.equal((await f.client.state()).revision,revision)
  const added=await f.client.mutate('createProject',projectInput(user.id));assert.equal(added.status,200)
  const created=added.data.projects.find(p=>p.name==='Real project');assert(created)
  assert.equal((await f.client.mutate('createTask',taskInput(created.id,user.id))).status,200)
 }finally{await f.cleanup()}
})
test('progress/reports derive from current tasks, reopening resets completion, and project deletion cascades comments and notifications',async()=>{
 const f=await fixture();try{
  const user=await f.client.register(),projectResult=await f.client.mutate('createProject',projectInput(user.id,'=SUM(1,2)')),project=projectResult.data.projects.find(p=>p.name==='=SUM(1,2)');assert(project)
  const taskResult=await f.client.mutate('createTask',taskInput(project.id,user.id,'  =1+1')),task=taskResult.data.tasks.find(t=>t.projectId===project.id);assert(task)
  const complete=await f.client.mutate('moveTask',{id:task.id,status:'Completed'});assert.equal(complete.data.tasks.find(t=>t.id===task.id)?.progress,100);assert.equal(complete.data.projects.find(p=>p.id===project.id)?.status,'Completed')
  const reopened=await f.client.mutate('moveTask',{id:task.id,status:'Review'});assert.equal(reopened.data.tasks.find(t=>t.id===task.id)?.progress,0);assert.equal(reopened.data.projects.find(p=>p.id===project.id)?.status,'Active')
  const checked=await f.client.mutate('toggleSubtask',{id:task.id,subtaskId:task.subtasks[0].id});assert.equal(checked.data.tasks.find(t=>t.id===task.id)?.progress,99);assert.equal(checked.data.projects.find(p=>p.id===project.id)?.progress,99)
  await f.client.mutate('addComment',{taskId:task.id,content:'Persisted comment'})
  const state=await f.client.state(),reports=await f.client.call<ReportsResponse>('/api/reports');assert.equal(reports.data.taskCount,state.tasks.length);assert.equal(reports.data.completedTasks,state.tasks.filter(t=>t.status==='Completed').length)
  const csv=await f.client.call<string>('/api/export.csv');assert.equal(csv.status,200);assert(csv.data.includes('"\'=1+1"'));assert(csv.data.includes('"\'=SUM(1,2)"'))
  const backup=await f.client.call<{state:StateResponse}>('/api/backup');assert.equal(backup.status,200);const serialized=JSON.stringify(backup.data);for(const secret of ['password_hash','token_hash','password_version','ns_session'])assert(!serialized.includes(secret))
  const deleted=await f.client.mutate('deleteProject',{id:project.id});assert.equal(deleted.status,200);assert(!deleted.data.tasks.some(t=>t.id===task.id));assert.equal(deleted.data.comments[task.id],undefined);assert(!deleted.data.notifications.some(n=>n.description==='=1+1'))
  assert.equal((await f.client.mutate('addComment',{taskId:task.id,content:'After deletion'})).status,404)
 }finally{await f.cleanup()}
})
test('notification read is per-user and task edits on archived projects are rejected',async()=>{
 const f=await fixture();try{
  await f.client.register();const other=new Client(f.client.base);await other.register('other@example.test')
  const state=await f.client.state(),otherState=await other.state()
  assert.equal((await f.client.mutate('markNotificationRead',{id:otherState.notifications[0].id})).status,404)
  assert.equal((await f.client.mutate('markAllNotificationsRead',{})).data.notifications.every(n=>n.read),true)
  assert.equal((await other.state()).notifications[0].read,false)
  assert.equal((await f.client.mutate('archiveProject',{id:state.tasks[0].projectId})).status,200)
  assert.equal((await f.client.mutate('moveTask',{id:state.tasks[0].id,status:'Completed'})).status,409)
 }finally{await f.cleanup()}
})

async function childServer(filename:string):Promise<{process:ChildProcess;base:string;close:()=>Promise<void>}> {
 const child=fork(path.resolve('tests/process-server.ts'),[filename,ORIGIN],{execArgv:['--import','tsx'],stdio:['ignore','ignore','ignore','ipc']})
 const port=await new Promise<number>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Child server startup timeout')),15000);child.once('error',reject);child.once('exit',()=>reject(new Error('Child server exited before ready')));child.once('message',message=>{clearTimeout(timer);resolve((message as {port:number}).port)})})
 return {process:child,base:`http://127.0.0.1:${port}`,close:()=>new Promise<void>(resolve=>{if(child.exitCode!==null){resolve();return}child.once('exit',()=>resolve());child.send('close')})}
}
test('separate Node processes sharing a SQLite file serialize concurrent CAS: exactly one winner, one 409, no overwrite',async()=>{
 const f=await fixture();let a:Awaited<ReturnType<typeof childServer>>|undefined,b:typeof a
 try{
  await f.client.register();const state=await f.client.state();a=await childServer(f.filename);b=await childServer(f.filename)
  const ca=new Client(a.base),cb=new Client(b.base);ca.cookie=f.client.cookie;cb.cookie=f.client.cookie
  const results=await Promise.all([ca.call<StateResponse>('/api/state',{revision:state.revision,action:'updateTask',payload:{id:state.tasks[0].id,patch:{title:'Concurrent A'}}}),cb.call<StateResponse>('/api/state',{revision:state.revision,action:'updateTask',payload:{id:state.tasks[0].id,patch:{title:'Concurrent B'}}})])
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);const current=await f.client.state();assert.equal(current.revision,state.revision+1);assert(['Concurrent A','Concurrent B'].includes(current.tasks[0].title));assert.equal(current.audit.length,state.audit.length+1)
 }finally{await a?.close();await b?.close();await f.cleanup()}
})
test('rate limits persist across reopening SQLite, and session expiry denies protected endpoints',async()=>{
 const f=await fixture();try{
  await f.client.register();for(let i=0;i<2;i++)await rateGuard(f.app.db,'isolated-rate-test',2,60000)
  const second=await openDatabase(f.filename);try{await assert.rejects(rateGuard(second,'isolated-rate-test',2,60000),{status:429})}finally{await second.close()}
  await f.app.db.run('UPDATE sessions SET expires_at=?',['2000-01-01T00:00:00.000Z'])
  assert.equal((await f.client.call<{user:null}>('/api/me')).data.user,null);assert.equal((await f.client.call('/api/state')).status,401)
 }finally{await f.cleanup()}
})
function rawGet(base:string,route:string):Promise<{status:number;text:string}> {
 return new Promise((resolve,reject)=>{const url=new URL(base),req=request({hostname:url.hostname,port:url.port,path:route},res=>{const chunks:Buffer[]=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode??0,text:Buffer.concat(chunks).toString()}))});req.once('error',reject);req.end()})
}
test('production static allowlist serves built SPA/assets but never dotfiles, database, backup, source maps or path traversal',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'northstar-backend-')),dist=path.join(directory,'dist');await mkdir(path.join(dist,'assets'),{recursive:true})
 await writeFile(path.join(dist,'index.html'),'<html>Built application</html>');await writeFile(path.join(dist,'assets','app.js'),'console.log("built")')
 await writeFile(path.join(dist,'.env'),'must-never-expose');await writeFile(path.join(dist,'backup.json'),'must-never-expose');await writeFile(path.join(dist,'assets','app.js.map'),'must-never-expose')
 const app=await createServer({databasePath:path.join(directory,'test.sqlite'),origin:ORIGIN,distPath:dist});try{
  await new Promise<void>(resolve=>app.server.listen(0,'127.0.0.1',resolve));const address=app.server.address();assert(address&&typeof address!=='string');const base=`http://127.0.0.1:${address.port}`
  assert.equal((await rawGet(base,'/dashboard')).status,200);assert.equal((await rawGet(base,'/assets/app.js')).status,200)
  for(const route of ['/.env','/%2eenv','/assets/../.env','/assets/%2e%2e/.env','/assets/%252e%252e/.env','/assets/..%5c.env','/.app-data/test.sqlite','/backup.json','/assets/app.js.map','/server/app.ts','/api/unknown','/api']){const r=await rawGet(base,route);assert([400,404].includes(r.status));assert(!r.text.includes('must-never-expose'))}
  await mkdir(path.join(directory,'private'));await writeFile(path.join(directory,'private','secret.js'),'must-never-expose')
  await symlink(path.join(directory,'private'),path.join(dist,'assets','private'),process.platform==='win32'?'junction':'dir')
  const escaped=await rawGet(base,'/assets/private/secret.js');assert.equal(escaped.status,404);assert(!escaped.text.includes('must-never-expose'))
  const health=await new Client(base).call('/api/health');assert.deepEqual(health.data,{status:'ok',driver:'sqlite',schemaVersion:1})
 }finally{await app.close();await removeFixture(directory)}
})
test('SQLite refuses Vercel environment before creating a database',async()=>{
 const previous=process.env.VERCEL;try{process.env.VERCEL='1';await assert.rejects(openDatabase(':memory:'),/durable storage/)}finally{if(previous===undefined)delete process.env.VERCEL;else process.env.VERCEL=previous}
})
