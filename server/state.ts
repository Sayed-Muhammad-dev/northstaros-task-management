import {randomUUID} from 'node:crypto'
import type {SQL,Database,Row} from './database'
import type {User,WorkspaceState,StateResponse,ReportsResponse,StoredNotification} from './contracts'
import type {Task,Project} from '../src/types/app'
import {ensure,HttpError} from './errors'
import {stateMutationSchema,type StateMutation} from './validation'

const timestamp=()=>new Date().toISOString()
export function defaultState():WorkspaceState {
 return {settings:{appearance:'light',language:'English',emailNotifications:false,pushNotifications:false,weeklyDigest:false,twoFactorAuth:false,timezone:'Asia/Karachi'},projects:[],tasks:[],comments:{},notifications:[],messageThreads:[],audit:[]}
}
export function sampleState(ownerId:string,name:string):WorkspaceState {
 const state=defaultState(),p1=randomUUID(),p2=randomUUID(),now=timestamp(),date=(days:number)=>new Date(Date.now()+days*86400000).toISOString().slice(0,10)
 state.projects=[
  {id:p1,name:'Sample: Workspace launch',client:'Sample project',summary:`Sample planning data for ${name}. Replace or delete this example before using real work.`,status:'Active',progress:0,dueDate:date(14),members:[ownerId],budget:'',health:'Healthy',tags:['Sample']},
  {id:p2,name:'Sample: Weekly planning',client:'Sample project',summary:'Clearly labelled sample workflow. Only your real account is assigned.',status:'Active',progress:0,dueDate:date(7),members:[ownerId],budget:'',health:'Healthy',tags:['Sample']},
 ]
 state.tasks=[
  {id:randomUUID(),title:'Sample: Plan your first project',projectId:p1,description:'Replace this sample with your own task.',status:'Todo',priority:'Medium',dueDate:date(7),assigneeId:ownerId,labels:['Sample'],progress:0,comments:0,attachments:0,subtasks:[{id:randomUUID(),label:'Sample: Define a milestone',done:false}]},
  {id:randomUUID(),title:'Sample: Review the weekly plan',projectId:p2,description:'Example workflow, not a claimed completed client deliverable.',status:'In Progress',priority:'Low',dueDate:date(5),assigneeId:ownerId,labels:['Sample'],progress:0,comments:0,attachments:0,subtasks:[]},
  {id:randomUUID(),title:'Sample: Explore workspace controls',projectId:p2,description:'Sample completed task. Reopen it to try the workflow.',status:'Completed',priority:'Low',dueDate:date(2),assigneeId:ownerId,labels:['Sample'],progress:100,comments:0,attachments:0,subtasks:[]},
 ]
 state.notifications=[{id:randomUUID(),userId:ownerId,title:'Your workspace is ready',description:'Sample projects/tasks are labelled Sample and assigned only to your account.',time:now,category:'System',read:false}]
 state.messageThreads=[{id:randomUUID(),title:'Workspace conversation',participants:[ownerId],lastMessage:'',unread:0,messages:[]}]
 return state
}
export async function readStored(tx:SQL,workspaceId:string):Promise<{revision:number;state:WorkspaceState}> {
 const [row]=await tx.rows('SELECT revision,state FROM workspace_state WHERE workspace_id=?',[workspaceId])
 ensure(row,404,'Workspace state not found')
 return {revision:Number(row.revision),state:JSON.parse(String(row.state)) as WorkspaceState}
}
export async function saveStored(tx:SQL,workspaceId:string,revision:number,state:WorkspaceState):Promise<number> {
 const next=revision+1
 const changed=await tx.run('UPDATE workspace_state SET revision=?,state=?,updated_at=? WHERE workspace_id=? AND revision=?',[next,JSON.stringify(state),timestamp(),workspaceId,revision])
 if(!changed)throw new HttpError(409,'State changed. Refresh and retry.',(await readStored(tx,workspaceId)).revision)
 return next
}
export function derive(state:WorkspaceState):void {
 for(const task of state.tasks) {
  task.comments=state.comments[task.id]?.length??0;task.attachments=0
  const done=task.subtasks.filter(s=>s.done).length
  task.progress=task.status==='Completed'?100:task.subtasks.length?Math.min(99,Math.floor(done/task.subtasks.length*100)):0
 }
 const today=new Date().toISOString().slice(0,10)
 for(const project of state.projects) {
  const tasks=state.tasks.filter(t=>t.projectId===project.id)
  project.progress=tasks.length?Math.min(tasks.every(t=>t.status==='Completed')?100:99,Math.round(tasks.reduce((sum,t)=>sum+t.progress,0)/tasks.length)):0
  if(project.status!=='Archived') {
   if(tasks.length&&tasks.every(t=>t.status==='Completed'))project.status='Completed'
   else if(project.status==='Completed')project.status='Active'
  }
  project.health=tasks.some(t=>t.status!=='Completed'&&t.dueDate<today)?'Requires attention':project.status==='Archived'?'Archived':'Healthy'
 }
}
export function stateAudit(state:WorkspaceState,user:User,action:string):void {
 state.audit.push({id:randomUUID(),action,time:timestamp(),actor:user.name,actorId:user.id})
 // Bound business JSON size while preserving a clear operational activity window.
 if(state.audit.length>2000)state.audit=state.audit.slice(-2000)
}
export async function refreshUser(tx:SQL,user:User):Promise<User> {
 const [r]=await tx.rows('SELECT u.id,u.name,u.email,m.role,w.id AS workspace_id,w.name AS workspace_name FROM users u JOIN memberships m ON m.user_id=u.id JOIN workspaces w ON w.id=m.workspace_id WHERE u.id=? AND w.id=?',[user.id,user.workspaceId])
 ensure(r,403,'Workspace access is no longer available')
 return userProjection(r)
}
export const userProjection=(r:Row):User=>({id:String(r.id),name:String(r.name),email:String(r.email),role:r.role as User['role'],workspaceId:String(r.workspace_id),workspaceName:String(r.workspace_name)})
export async function projectState(tx:SQL,user:User,stored?:{revision:number;state:WorkspaceState}):Promise<StateResponse> {
 const currentUser=await refreshUser(tx,user),{revision,state}=stored??await readStored(tx,user.workspaceId)
 derive(state)
 const membershipRows=await tx.rows('SELECT u.id,u.name,u.email,u.team,m.role FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.workspace_id=? ORDER BY m.created_at,u.id',[user.workspaceId])
 const members=membershipRows.map(r=>{
  const assigned=state.tasks.filter(t=>t.assigneeId===r.id),completed=assigned.filter(t=>t.status==='Completed').length
  return {id:String(r.id),name:String(r.name),email:String(r.email),role:String(r.role),team:String(r.team),avatar:String(r.name).split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase(),utilization:assigned.length?Math.round((assigned.length-completed)/assigned.length*100):0,completedTasks:completed,permissions:r.role==='owner'?['Manage projects','Manage tasks','Invite members','Manage roles','Export reports','Backup workspace']:['Manage tasks','Comment','Send messages','Export reports'],status:(r.id===user.id?'Online':'Offline') as 'Online'|'Offline'}
 })
 const notifications=state.notifications.filter(n=>n.userId===user.id).map(n=>({id:n.id,title:n.title,description:n.description,time:n.time,category:n.category,read:n.read}))
 const invitations=currentUser.role==='owner'?(await tx.rows('SELECT id,email,role,expires_at FROM invitations WHERE workspace_id=? AND accepted_at IS NULL AND expires_at>? ORDER BY created_at DESC',[user.workspaceId,timestamp()])).map(r=>({id:String(r.id),email:String(r.email),role:r.role as 'owner'|'member',expiresAt:String(r.expires_at)})):[]
 return {revision,settings:state.settings,projects:state.projects,tasks:state.tasks,members,notifications,messageThreads:state.messageThreads.filter(t=>t.participants.includes(user.id)),comments:state.comments,currentUser,workspace:{id:currentUser.workspaceId,name:currentUser.workspaceName},invitations,audit:state.audit.map(a=>({id:a.id,action:a.action,time:a.time,actor:a.actor}))}
}
function taskFrom(state:WorkspaceState,id:string):Task {const t=state.tasks.find(t=>t.id===id);ensure(t,404,'Task not found');return t}
function projectFrom(state:WorkspaceState,id:string):Project {const p=state.projects.find(p=>p.id===id);ensure(p,404,'Project not found');return p}
function assertEditableProject(state:WorkspaceState,id:string):Project {const p=projectFrom(state,id);ensure(p.status!=='Archived',409,'Archived projects cannot receive task changes');return p}
function removeTasks(state:WorkspaceState,ids:string[]):void {
 const removed=new Set(ids)
 state.tasks=state.tasks.filter(t=>!removed.has(t.id))
 for(const id of ids)delete state.comments[id]
 state.notifications=state.notifications.filter(n=>!n.taskId||!removed.has(n.taskId))
}
function notification(state:WorkspaceState,userId:string,title:string,description:string,category:StoredNotification['category'],taskId?:string):void {
 state.notifications.push({id:randomUUID(),userId,title,description,time:timestamp(),category,read:false,...(taskId?{taskId}:{})})
 if(state.notifications.length>5000)state.notifications=state.notifications.slice(-5000)
}
async function assertReferences(tx:SQL,user:User,state:WorkspaceState):Promise<void> {
 const ids=new Set((await tx.rows('SELECT user_id FROM memberships WHERE workspace_id=?',[user.workspaceId])).map(r=>String(r.user_id)))
 for(const project of state.projects)ensure(project.members.every(id=>ids.has(id)),400,'Project members must belong to this workspace')
 for(const task of state.tasks){const project=projectFrom(state,task.projectId);ensure(ids.has(task.assigneeId)&&project.members.includes(task.assigneeId),400,'Task assignee must be a member of its project')}
}
export async function mutateState(db:Database,user:User,input:unknown,authorize?:(tx:SQL)=>Promise<User>):Promise<StateResponse> {
 const mutation:StateMutation=stateMutationSchema.parse(input)
 return db.transaction(async tx=>{
  user=authorize?await authorize(tx):await refreshUser(tx,user)
  const stored=await readStored(tx,user.workspaceId),state=stored.state
  if(stored.revision!==mutation.revision)throw new HttpError(409,'State changed. Refresh and retry.',stored.revision)
  if(['updateSettings','createProject','updateProject','archiveProject','deleteProject'].includes(mutation.action))ensure(user.role==='owner',403,'Workspace owner access is required')
  switch(mutation.action){
   case 'updateSettings':state.settings={...state.settings,...mutation.payload.patch};break
   case 'createProject':ensure(state.projects.length<500,409,'Project limit reached');state.projects.push({...mutation.payload,id:randomUUID(),status:'Active',progress:0,health:'Healthy'});break
   case 'updateProject':Object.assign(projectFrom(state,mutation.payload.id),mutation.payload.patch);break
   case 'archiveProject':projectFrom(state,mutation.payload.id).status='Archived';break
   case 'deleteProject':{
    projectFrom(state,mutation.payload.id)
    removeTasks(state,state.tasks.filter(t=>t.projectId===mutation.payload.id).map(t=>t.id))
    state.projects=state.projects.filter(p=>p.id!==mutation.payload.id);break
   }
   case 'createTask':{
    assertEditableProject(state,mutation.payload.projectId);ensure(state.tasks.length<5000,409,'Task limit reached')
    const id=randomUUID(),payload=mutation.payload
    state.tasks.push({...payload,id,progress:0,comments:0,attachments:0,subtasks:payload.subtasks.map(s=>({...s,id:randomUUID()}))})
    notification(state,payload.assigneeId,'Task assigned',payload.title,'Tasks',id);break
   }
   case 'updateTask':{
    const task=taskFrom(state,mutation.payload.id),patch=mutation.payload.patch
    assertEditableProject(state,task.projectId);assertEditableProject(state,patch.projectId??task.projectId)
    if(patch.subtasks){
     const originalIds=new Set(task.subtasks.map(s=>s.id)),supplied=patch.subtasks.filter(s=>s.id).map(s=>s.id!)
     ensure(new Set(supplied).size===supplied.length&&supplied.every(id=>originalIds.has(id)),400,'Subtask IDs must belong to this task and be unique')
     const {subtasks,...fields}=patch;Object.assign(task,fields);task.subtasks=subtasks.map(s=>({...s,id:s.id??randomUUID()}))
    }else Object.assign(task,patch)
    break
   }
   case 'moveTask':{const task=taskFrom(state,mutation.payload.id);assertEditableProject(state,task.projectId);task.status=mutation.payload.status;break}
   case 'toggleSubtask':{
    const task=taskFrom(state,mutation.payload.id);assertEditableProject(state,task.projectId)
    const subtask=task.subtasks.find(s=>s.id===mutation.payload.subtaskId);ensure(subtask,404,'Subtask not found');subtask.done=!subtask.done
    if(task.status==='Completed'&&!subtask.done)task.status='In Progress';break
   }
   case 'deleteTask':{const task=taskFrom(state,mutation.payload.id);assertEditableProject(state,task.projectId);removeTasks(state,[mutation.payload.id]);break}
   case 'markNotificationRead':{const n=state.notifications.find(n=>n.id===mutation.payload.id&&n.userId===user.id);ensure(n,404,'Notification not found');n.read=true;break}
   case 'markAllNotificationsRead':for(const n of state.notifications)if(n.userId===user.id)n.read=true;break
   case 'addMessage':{
    const thread=state.messageThreads.find(t=>t.id===mutation.payload.threadId);ensure(thread&&thread.participants.includes(user.id),404,'Conversation not found')
    ensure(thread.messages.length<2000,409,'Conversation message limit reached')
    thread.messages.push({id:randomUUID(),authorId:user.id,content:mutation.payload.content,time:timestamp()});thread.lastMessage=mutation.payload.content;thread.unread=0
    for(const participant of thread.participants)if(participant!==user.id)notification(state,participant,'New workspace message',`${user.name} sent a message`,'Team')
    break
   }
   case 'addComment':{
    const task=taskFrom(state,mutation.payload.taskId);ensure((state.comments[task.id]?.length??0)<1000,409,'Task comment limit reached')
    state.comments[task.id]??=[];state.comments[task.id].push({id:randomUUID(),authorId:user.id,content:mutation.payload.content,time:timestamp()})
    if(task.assigneeId!==user.id)notification(state,task.assigneeId,'New task comment',`${user.name} commented on ${task.title}`,'Tasks',task.id)
    break
   }
   case 'updateProfile':await tx.run('UPDATE users SET name=?,team=? WHERE id=?',[mutation.payload.name,mutation.payload.team,user.id]);user={...user,name:mutation.payload.name};break
  }
  await assertReferences(tx,user,state);derive(state);stateAudit(state,user,mutation.action)
  const revision=await saveStored(tx,user.workspaceId,stored.revision,state)
  return projectState(tx,user,{revision,state})
 })
}
export function reportsFrom(state:StateResponse):ReportsResponse {
 const byStatus:ReportsResponse['byStatus']={Backlog:0,Todo:0,'In Progress':0,Review:0,Completed:0},today=new Date().toISOString().slice(0,10)
 for(const task of state.tasks)byStatus[task.status]++
 const completed=byStatus.Completed
 return {taskCount:state.tasks.length,completedTasks:completed,overdueTasks:state.tasks.filter(t=>t.status!=='Completed'&&t.dueDate<today).length,completionRate:state.tasks.length?Math.round(completed/state.tasks.length*100):0,byStatus,projects:state.projects.map(p=>{const tasks=state.tasks.filter(t=>t.projectId===p.id);return {id:p.id,name:p.name,taskCount:tasks.length,completedTasks:tasks.filter(t=>t.status==='Completed').length,progress:p.progress}})}
}
