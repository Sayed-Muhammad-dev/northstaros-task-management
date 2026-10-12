import {createServer as createHTTPServer,type IncomingMessage,type ServerResponse} from 'node:http'
import {readFile,realpath,stat} from 'node:fs/promises'
import path from 'node:path'
import {ZodError} from 'zod'
import {openDatabase,SCHEMA_VERSION,type Database} from './database'
import type {ServerOptions,StateResponse} from './contracts'
import {HttpError,ensure} from './errors'
import {register,login,changePassword,cookie,sessionHash,findSession,rateGuard} from './auth'
import {projectState,mutateState,reportsFrom} from './state'
import {workspaceSession,listWorkspaces,selectWorkspace,createWorkspace,createInvitation,acceptInvitation,changeRole} from './workspaces'
import {emptySchema,emailSchema} from './validation'
import {taskCSV,reportHTML} from './exports'

const MAX_BODY=128*1024
export function configuredOrigin(value?:string):string {
 const input=value??process.env.APP_ORIGIN
 if(!input&&process.env.NODE_ENV==='production')throw new Error('Production requires APP_ORIGIN with the browser-facing origin')
 const url=new URL(input??'http://127.0.0.1:5345')
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('APP_ORIGIN must be an HTTP(S) origin')
 return url.origin
}
async function body(req:IncomingMessage):Promise<unknown> {
 ensure(/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']??''),415,'Use application/json')
 const declared=req.headers['content-length'];ensure(!declared||Number(declared)<=MAX_BODY,413,'Request body is too large')
 const bytes=await new Promise<Buffer>((resolve,reject)=>{
  let size=0;const chunks:Buffer[]=[]
  const cleanup=()=>{req.off('data',data);req.off('end',end);req.off('error',error);req.off('aborted',aborted)}
  const error=(e:Error)=>{cleanup();reject(e)},aborted=()=>error(new HttpError(400,'Request interrupted'))
  const data=(chunk:Buffer)=>{size+=chunk.length;if(size>MAX_BODY){cleanup();req.resume();reject(new HttpError(413,'Request body is too large'))}else chunks.push(chunk)}
  const end=()=>{cleanup();resolve(Buffer.concat(chunks))}
  req.on('data',data);req.once('end',end);req.once('error',error);req.once('aborted',aborted)
 })
 try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))}catch{throw new HttpError(400,'Use valid JSON')}
}
function reply(res:ServerResponse,status:number,value:unknown,type='application/json; charset=utf-8',headers:Record<string,string>={}):void {
 const data=type.startsWith('application/json')?JSON.stringify(value):String(value)
 res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY',...headers});res.end(data)
}
function requestPath(req:IncomingMessage):string {
 const raw=(req.url??'/').split(/[?#]/,1)[0]
 let decoded:string;try{decoded=decodeURIComponent(raw)}catch{throw new HttpError(400,'Invalid URL path')}
 const hasControl=Array.from(decoded).some(c=>c.charCodeAt(0)<32||c.charCodeAt(0)===127)
 ensure(decoded.startsWith('/')&&!decoded.startsWith('//')&&!/[\\%]/.test(decoded)&&!hasControl&&!decoded.split('/').some(part=>part.startsWith('.')),400,'Invalid URL path')
 return decoded
}
const mime:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.avif':'image/avif','.webmanifest':'application/manifest+json'}
async function staticFile(req:IncomingMessage,res:ServerResponse,urlPath:string,distPath:string):Promise<void> {
 const ext=path.extname(urlPath).toLowerCase(),rootFiles=new Set(['/index.html','/favicon.ico','/favicon.svg','/robots.txt','/manifest.webmanifest','/vite.svg'])
 const asset=urlPath.startsWith('/assets/')&&Boolean(mime[ext])&&ext!=='.html'
 const spa=!ext&&/^\/[a-zA-Z0-9/_-]*$/.test(urlPath)
 ensure(asset||rootFiles.has(urlPath)||spa,404,'Not found')
 const root=await realpath(distPath).catch(()=>null);ensure(root,404,'Build the frontend before serving it')
 const candidate=path.resolve(root,'.'+(spa?'/index.html':urlPath)),resolved=await realpath(candidate).catch(()=>null)
 ensure(resolved&&path.relative(root,resolved)!==''&&!path.relative(root,resolved).startsWith('..')&&!path.isAbsolute(path.relative(root,resolved)),404,'Not found')
 const info=await stat(resolved);ensure(info.isFile(),404,'Not found')
 const bytes=req.method==='HEAD'?null:await readFile(resolved)
 res.writeHead(200,{'Content-Type':urlPath==='/robots.txt'?'text/plain; charset=utf-8':mime[path.extname(resolved).toLowerCase()]??'application/octet-stream','Content-Length':info.size,'Cache-Control':asset?'public, max-age=31536000, immutable':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY'})
 res.end(bytes)
}
/** Creates no listener until the caller invokes server.listen(). Tests may use isolated databasePath and port 0. */
export async function createServer(options:ServerOptions={}):Promise<{server:ReturnType<typeof createHTTPServer>;db:Database;close:()=>Promise<void>}> {
 const origin=configuredOrigin(options.origin),db=await openDatabase(options.databasePath),distPath=options.distPath??path.resolve(process.cwd(),'dist')
 const server=createHTTPServer({maxHeaderSize:16*1024},(req,res)=>{
  void handle(req,res).catch(error=>{
   if(res.headersSent){res.destroy();return}
   if(error instanceof HttpError)reply(res,error.status,{error:error.message,...(error.revision===undefined?{}:{revision:error.revision})},undefined,error.status===429?{'Retry-After':'60'}:{})
   else if(error instanceof ZodError)reply(res,400,{error:'Invalid request body'})
   else {console.error('API request failed (internal error)');reply(res,500,{error:'The request could not be completed'})}
  })
 })
 server.requestTimeout=15000;server.headersTimeout=10000;server.keepAliveTimeout=5000;server.maxRequestsPerSocket=1000
 server.on('clientError',(_error,socket)=>{if(socket.writable)socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n')})
 async function handle(req:IncomingMessage,res:ServerResponse):Promise<void> {
  const urlPath=requestPath(req)
  if(urlPath!=='/api'&&!urlPath.startsWith('/api/')){
   ensure(options.serveStatic!==false&&(req.method==='GET'||req.method==='HEAD'),404,'Not found')
   await staticFile(req,res,urlPath,distPath);return
  }
  const method=req.method??'GET',ip=req.socket.remoteAddress??'unknown',tokenHash=sessionHash(req.headers.cookie)
  ensure(method==='GET'||method==='POST',405,'Method not allowed')
  let input:unknown
  if(method==='POST'){
   ensure(req.headers.origin===origin&&req.headers['sec-fetch-site']!=='cross-site',403,'Request origin is not allowed')
   await rateGuard(db,'writes:'+ip,300,60000)
   input=await body(req)
  }else await rateGuard(db,'reads:'+ip,1500,60000)
  const expected=req.headers['x-workspace-id'];ensure(!Array.isArray(expected)&&(!expected||expected.length<=100),400,'Invalid workspace header')
  const authorize=(tx:Parameters<typeof workspaceSession>[0])=>workspaceSession(tx,tokenHash,expected)
  const state=()=>db.transaction(async tx=>projectState(tx,await authorize(tx)))
  if(method==='GET'){
   switch(urlPath){
    case '/api/health':await db.rows('SELECT version FROM schema_versions LIMIT 1');reply(res,200,{status:'ok',driver:'sqlite',schemaVersion:SCHEMA_VERSION});return
    case '/api/me':reply(res,200,{user:await findSession(db,tokenHash)});return
    case '/api/state':reply(res,200,await state());return
    case '/api/workspaces':reply(res,200,await listWorkspaces(db,tokenHash));return
    case '/api/reports':reply(res,200,reportsFrom(await state()));return
    case '/api/reports/print':reply(res,200,reportHTML(await state()),'text/html; charset=utf-8',{'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"});return
    case '/api/export.csv':reply(res,200,taskCSV(await state()),'text/csv; charset=utf-8',{'Content-Disposition':'attachment; filename="northstar-tasks.csv"'});return
    case '/api/backup':{
     const snapshot:StateResponse=await db.transaction(async tx=>{const user=await authorize(tx);ensure(user.role==='owner',403,'Workspace owner access is required');return projectState(tx,user)})
     reply(res,200,{format:'northstar-workspace-export-v1',exportedAt:new Date().toISOString(),state:snapshot},undefined,{'Content-Disposition':'attachment; filename="northstar-workspace.json"'});return
    }
   }
  }else{
   if(['/api/auth/login','/api/auth/register','/api/auth/password'].includes(urlPath)){
    await rateGuard(db,'auth-ip:'+ip,30,15*60000)
    if(urlPath!=='/api/auth/password'&&input&&typeof input==='object'&&'email' in input){const parsed=emailSchema.safeParse(input.email);if(parsed.success)await rateGuard(db,'auth-email:'+parsed.data,12,15*60000)}
   }
   switch(urlPath){
    case '/api/auth/register':{const result=await register(db,input);if(tokenHash)await db.run('DELETE FROM sessions WHERE token_hash=?',[tokenHash]);reply(res,201,{user:result.user},undefined,{'Set-Cookie':cookie(result.token,origin)});return}
    case '/api/auth/login':{const result=await login(db,input);if(tokenHash)await db.run('DELETE FROM sessions WHERE token_hash=?',[tokenHash]);reply(res,200,{user:result.user},undefined,{'Set-Cookie':cookie(result.token,origin)});return}
    case '/api/auth/logout':emptySchema.parse(input);if(tokenHash)await db.run('DELETE FROM sessions WHERE token_hash=?',[tokenHash]);reply(res,200,{ok:true},undefined,{'Set-Cookie':cookie('',origin,true)});return
    case '/api/auth/password':{const token=await changePassword(db,tokenHash,input);reply(res,200,{ok:true},undefined,{'Set-Cookie':cookie(token,origin)});return}
    case '/api/state':{const user=await workspaceSession(db,tokenHash,expected);reply(res,200,await mutateState(db,user,input,authorize));return}
    case '/api/workspaces':reply(res,201,await createWorkspace(db,tokenHash,input));return
    case '/api/workspaces/select':reply(res,200,await selectWorkspace(db,tokenHash,input));return
    case '/api/invitations':reply(res,201,await createInvitation(db,tokenHash,input,origin,expected));return
    case '/api/invitations/accept':reply(res,200,await acceptInvitation(db,tokenHash,input));return
    case '/api/members/role':reply(res,200,await changeRole(db,tokenHash,input,expected));return
   }
  }
  throw new HttpError(404,'API route not found')
 }
 let closed=false
 return {server,db,close:async()=>{if(closed)return;closed=true;await new Promise<void>((resolve,reject)=>{if(!server.listening){resolve();return}server.close(error=>error?reject(error):resolve());server.closeIdleConnections()});await db.close()}}
}
