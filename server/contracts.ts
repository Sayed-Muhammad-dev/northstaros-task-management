import type { AppSettings, Project, Task, Member, NotificationItem, MessageThread } from '../src/types/app'
export type Role = 'owner' | 'member'
export interface User { id:string; name:string; email:string; role:Role; workspaceId:string; workspaceName:string }
export interface Comment { id:string; authorId:string; content:string; time:string }
export interface Invitation { id:string; email:string; role:Role; expiresAt:string }
export interface AuditEntry { id:string; action:string; time:string; actor:string }
export interface StateResponse {
  revision:number; settings:AppSettings; projects:Project[]; tasks:Task[]; members:Member[]
  notifications:NotificationItem[]; messageThreads:MessageThread[]; comments:Record<string,Comment[]>
  currentUser:User; workspace:{id:string;name:string}; invitations:Invitation[]; audit:AuditEntry[]
}
export interface StoredNotification extends NotificationItem { userId:string; taskId?:string }
/** Identity/membership/session/invitation records are relational; business state is one transactional row per workspace. */
export interface WorkspaceState {
  settings:AppSettings; projects:Project[]; tasks:Task[]; comments:Record<string,Comment[]>
  notifications:StoredNotification[]; messageThreads:MessageThread[]; audit:(AuditEntry & {actorId:string})[]
}
export interface ReportsResponse {
  taskCount:number; completedTasks:number; overdueTasks:number; completionRate:number
  byStatus:Record<Task['status'],number>
  projects:{id:string;name:string;taskCount:number;completedTasks:number;progress:number}[]
}
export interface ServerOptions { databasePath?:string; origin?:string; distPath?:string; serveStatic?:boolean }
