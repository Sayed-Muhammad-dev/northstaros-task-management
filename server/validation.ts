import {z} from 'zod'
const text=(max:number)=>z.string().trim().min(1).max(max)
export const idSchema=text(100)
export const emailSchema=z.string().trim().toLowerCase().email().max(254)
export const passwordSchema=z.string().min(12).max(128)
export const registerSchema=z.object({name:text(100),email:emailSchema,company:text(150),password:passwordSchema}).strict()
export const loginSchema=z.object({email:emailSchema,password:z.string().min(1).max(128)}).strict()
export const passwordChangeSchema=z.object({oldPassword:z.string().min(1).max(128),newPassword:passwordSchema}).strict()
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value=>{
  const d=new Date(value+'T00:00:00.000Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value
},'Use a real YYYY-MM-DD calendar date')
export const statusSchema=z.enum(['Backlog','Todo','In Progress','Review','Completed'])
const priority=z.enum(['Low','Medium','High','Critical'])
const tags=z.array(text(50)).max(20).refine(values=>new Set(values).size===values.length,'Duplicate labels')
const members=z.array(idSchema).min(1).max(200).refine(values=>new Set(values).size===values.length,'Duplicate members')
const timezone=text(80).refine(value=>{try{new Intl.DateTimeFormat('en',{timeZone:value});return true}catch{return false}},'Invalid IANA time zone')
export const settingsPatchSchema=z.object({appearance:z.enum(['light','dark']).optional(),language:z.enum(['English','German','French']).optional(),
  emailNotifications:z.literal(false).optional(),pushNotifications:z.literal(false).optional(),weeklyDigest:z.literal(false).optional(),twoFactorAuth:z.literal(false).optional(),timezone:timezone.optional(),
}).strict().refine(p=>Object.keys(p).length>0,'Provide a setting to update')
export const projectInputSchema=z.object({name:text(160),client:z.string().trim().max(160),summary:z.string().trim().max(5000),dueDate:date,members,budget:z.string().trim().max(80),tags}).strict()
const projectPatchSchema=projectInputSchema.partial().extend({status:z.enum(['Active','At Risk','Archived']).optional()}).strict().refine(p=>Object.keys(p).length>0,'Provide a project field to update')
const subtask=z.object({label:text(200),done:z.boolean()}).strict()
export const taskInputSchema=z.object({title:text(200),projectId:idSchema,description:z.string().trim().max(10000),status:statusSchema,priority,dueDate:date,assigneeId:idSchema,labels:tags,subtasks:z.array(subtask).max(100)}).strict()
const taskPatchSchema=taskInputSchema.partial().extend({subtasks:z.array(subtask.extend({id:idSchema.optional()}).strict()).max(100).optional()}).strict().refine(p=>Object.keys(p).length>0,'Provide a task field to update')
const action=<const A extends string,P extends z.ZodType>(name:A,payload:P)=>z.object({
  revision:z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),action:z.literal(name),payload,
}).strict()
export const stateMutationSchema=z.discriminatedUnion('action',[
  action('updateSettings',z.object({patch:settingsPatchSchema}).strict()),
  action('createProject',projectInputSchema),
  action('updateProject',z.object({id:idSchema,patch:projectPatchSchema}).strict()),
  action('archiveProject',z.object({id:idSchema}).strict()),
  action('deleteProject',z.object({id:idSchema}).strict()),
  action('createTask',taskInputSchema),
  action('updateTask',z.object({id:idSchema,patch:taskPatchSchema}).strict()),
  action('moveTask',z.object({id:idSchema,status:statusSchema}).strict()),
  action('toggleSubtask',z.object({id:idSchema,subtaskId:idSchema}).strict()),
  action('deleteTask',z.object({id:idSchema}).strict()),
  action('markNotificationRead',z.object({id:idSchema}).strict()),
  action('markAllNotificationsRead',z.object({}).strict()),
  action('addMessage',z.object({threadId:idSchema,content:text(5000)}).strict()),
  action('addComment',z.object({taskId:idSchema,content:text(5000)}).strict()),
  action('updateProfile',z.object({name:text(100),team:z.string().trim().max(100)}).strict()),
])
export type StateMutation=z.infer<typeof stateMutationSchema>
export const inviteSchema=z.object({email:emailSchema,role:z.enum(['owner','member'])}).strict()
export const acceptInviteSchema=z.object({token:z.string().regex(/^[a-f0-9]{64}$/)}).strict()
export const roleSchema=z.object({id:idSchema,role:z.enum(['owner','member'])}).strict()
export const selectWorkspaceSchema=z.object({id:idSchema}).strict()
export const createWorkspaceSchema=z.object({name:text(150)}).strict()
export const emptySchema=z.object({}).strict()
