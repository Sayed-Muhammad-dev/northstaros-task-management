import type {StateResponse} from './contracts'
import {reportsFrom} from './state'

export function csvCell(value:unknown):string {
 const text=String(value??'')
 const first=Array.from(text).find(c=>c.charCodeAt(0)>32&&!/\s/.test(c))
 const safe=(first&&'=+@-'.includes(first))||['\t','\r','\n'].includes(text[0])?"'"+text:text
 return '"'+safe.replaceAll('"','""')+'"'
}
export function taskCSV(state:StateResponse):string {
 const projects=new Map(state.projects.map(p=>[p.id,p.name])),members=new Map(state.members.map(m=>[m.id,m.name]))
 const rows:unknown[][]=[['Task ID','Title','Project','Status','Priority','Due date','Assignee','Progress','Comments','Description']]
 for(const task of state.tasks)rows.push([task.id,task.title,projects.get(task.projectId),task.status,task.priority,task.dueDate,members.get(task.assigneeId),task.progress,task.comments,task.description])
 return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n')+'\r\n'
}
const escapeHTML=(text:unknown)=>String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
export function reportHTML(state:StateResponse):string {
 const report=reportsFrom(state)
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHTML(state.workspace.name)} report</title><style>body{font:16px system-ui;max-width:1000px;margin:40px auto;padding:20px}table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:10px;border-bottom:1px solid #ddd}@media print{body{margin:0}}</style></head><body><h1>${escapeHTML(state.workspace.name)} task report</h1><p>Generated ${escapeHTML(new Date().toISOString())}. Current workspace data; sample tasks retain their Sample labels.</p><p>${report.taskCount} tasks · ${report.completedTasks} completed · ${report.overdueTasks} overdue · ${report.completionRate}% completion</p><table><thead><tr><th>Project</th><th>Tasks</th><th>Completed</th><th>Progress</th></tr></thead><tbody>${report.projects.map(p=>`<tr><td>${escapeHTML(p.name)}</td><td>${p.taskCount}</td><td>${p.completedTasks}</td><td>${p.progress}%</td></tr>`).join('')}</tbody></table></body></html>`
}
