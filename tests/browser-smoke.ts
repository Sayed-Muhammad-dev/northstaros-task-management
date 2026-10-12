/** Optional real Chrome smoke, after npm run build. Uses an isolated database and never emits credentials. */
import assert from 'node:assert/strict'
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {randomBytes} from 'node:crypto'
import {createServer} from '../server/app'

const port=Number(process.env.BACKEND_BROWSER_PORT??5348),origin=`http://127.0.0.1:${port}`
const directory=await mkdtemp(path.join(tmpdir(),'northstar-backend-browser-'))
const app=await createServer({databasePath:path.join(directory,'browser.sqlite'),origin})
let browser: {close:()=>Promise<void>}|undefined
try{
 await new Promise<void>((resolve,reject)=>{app.server.once('error',reject);app.server.listen(port,'127.0.0.1',resolve)})
 const modulePath=process.env.PUPPETEER_MODULE_PATH??'D:/Project/Rozana-Kart/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js'
 const {default:puppeteer}=await import(pathToFileURL(modulePath).href)
 const chrome=await puppeteer.launch({executablePath:process.env.CHROME_PATH??'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-first-run','--disable-default-apps']})
 browser=chrome
 const page=await chrome.newPage();page.setDefaultTimeout(15000)
 const errors:string[]=[],authResponses:number[]=[]
 page.on('pageerror',(error:Error)=>errors.push(error.name))
 page.on('response',(response:{url:()=>string;status:()=>number})=>{if(new URL(response.url()).pathname==='/api/auth/register')authResponses.push(response.status())})
 await page.setViewport({width:1280,height:900})
 await page.goto(origin+'/register',{waitUntil:'networkidle0'})
 const inputs=await page.$$eval('form input',(nodes:HTMLInputElement[])=>nodes.map((n,index)=>({index,type:n.type})))
 assert.equal(inputs.length,4,'Expected current registration form in built frontend')
 const fields=await page.$$('form input'),email=`backend-browser-${Date.now()}@example.test`,password=randomBytes(24).toString('base64url')
 for(const [index,value] of ['Browser Backend QA',email,'Browser isolated workspace',password].entries())await fields[index].type(value)
 await Promise.all([page.waitForResponse((r:{url:()=>string;status:()=>number})=>new URL(r.url()).pathname==='/api/auth/register'&&r.status()===201),page.$eval('form',(form:HTMLFormElement)=>form.requestSubmit())])
 await page.waitForFunction(()=>location.pathname==='/app/dashboard')
 const state=await page.evaluate(async()=>{const r=await fetch('/api/state',{credentials:'include'});return {status:r.status,state:await r.json()}})
 assert.equal(state.status,200);assert.equal(state.state.currentUser.name,'Browser Backend QA');assert.equal(state.state.members.length,1)
 assert(state.state.tasks.every((t:{assigneeId:string})=>t.assigneeId===state.state.currentUser.id));assert.deepEqual(authResponses,[201])
 const cookies=await page.browserContext().cookies();const session=cookies.find((c:{name:string})=>c.name==='ns_session');assert(session?.httpOnly,'Session must be HttpOnly in actual browser')
 await page.reload({waitUntil:'networkidle0'})
 const persisted=await page.evaluate(async()=>{const r=await fetch('/api/me',{credentials:'include'});return (await r.json()).user?.name})
 assert.equal(persisted,'Browser Backend QA')
 const comment=await page.evaluate(async()=>{
  const state=await (await fetch('/api/state',{credentials:'include'})).json()
  const r=await fetch('/api/state',{method:'POST',headers:{'Content-Type':'application/json','X-Workspace-Id':state.workspace.id},credentials:'include',body:JSON.stringify({revision:state.revision,action:'addComment',payload:{taskId:state.tasks[0].id,content:'Actual Chrome comment'}})})
  const result=await r.json();return {status:r.status,author:result.comments?.[state.tasks[0].id]?.[0]?.authorId,user:state.currentUser.id}
 })
 assert.equal(comment.status,200);assert.equal(comment.author,comment.user)
 const afterLogout=await page.evaluate(async()=>{const r=await fetch('/api/auth/logout',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:'{}'});const me=await (await fetch('/api/me',{credentials:'include'})).json();return {status:r.status,user:me.user}})
 assert.equal(afterLogout.status,200);assert.equal(afterLogout.user,null);assert.deepEqual(errors,[])
 console.log('PASS actual Chrome: UI registration, authenticated hydration, real membership, HttpOnly cookie, reload persistence, comment and logout (isolated SQLite)')
}finally{
 await browser?.close();await app.close()
 const relative=path.relative(tmpdir(),directory);assert(relative.startsWith('northstar-backend-browser-')&&!relative.includes(path.sep)&&!path.isAbsolute(relative))
 await rm(directory,{recursive:true,force:true})
}
