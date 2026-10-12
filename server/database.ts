import {DatabaseSync} from 'node:sqlite'
import {mkdir,writeFile} from 'node:fs/promises'
import path from 'node:path'
export type Parameter = string|number|null
export type Row = Record<string,unknown>
export interface SQL {
  rows(sql:string,params?:Parameter[]):Promise<Row[]>
  run(sql:string,params?:Parameter[]):Promise<number>
}
export interface Database extends SQL { transaction<T>(work:(tx:SQL)=>Promise<T>):Promise<T>;close():Promise<void> }
export const SCHEMA_VERSION=1
const schema=`
CREATE TABLE IF NOT EXISTS schema_versions(version INTEGER PRIMARY KEY,applied_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users(
 id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,
 team TEXT NOT NULL DEFAULT '',password_version INTEGER NOT NULL DEFAULT 1,created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS workspaces(id TEXT PRIMARY KEY,name TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS memberships(
 workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 role TEXT NOT NULL CHECK(role IN ('owner','member')),created_at TEXT NOT NULL,
 PRIMARY KEY(workspace_id,user_id)
);
CREATE TABLE IF NOT EXISTS workspace_state(
 workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
 revision INTEGER NOT NULL CHECK(revision>=1),state TEXT NOT NULL,updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions(
 token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 password_version INTEGER NOT NULL,expires_at TEXT NOT NULL,created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS invitations(
 id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 email TEXT NOT NULL,role TEXT NOT NULL CHECK(role IN ('owner','member')),token_hash TEXT NOT NULL UNIQUE,
 expires_at TEXT NOT NULL,accepted_at TEXT,accepted_user_id TEXT REFERENCES users(id),
 creator_id TEXT NOT NULL REFERENCES users(id),created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS invitations_workspace ON invitations(workspace_id);
CREATE TABLE IF NOT EXISTS rate_guards(key_hash TEXT PRIMARY KEY,window_start INTEGER NOT NULL,hits INTEGER NOT NULL);
`
export async function openDatabase(filename=process.env.DATABASE_FILE??path.join(process.cwd(),'.app-data','northstar.sqlite')):Promise<Database> {
  if(process.env.VERCEL) throw new Error('SQLite requires durable storage; Vercel is not supported by this local server')
  if(filename!==':memory:') {
    const directory=path.dirname(path.resolve(filename))
    await mkdir(directory,{recursive:true})
    if(['.data','.app-data'].includes(path.basename(directory))) await writeFile(path.join(directory,'.gitignore'),'*\n',{flag:'wx'}).catch((e:NodeJS.ErrnoException)=>{if(e.code!=='EEXIST')throw e})
  }
  const connection=new DatabaseSync(filename,{timeout:10000})
  try { connection.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;') }
  catch(e) { connection.close();throw e }
  const raw:SQL={
    async rows(sql,params=[]) { return connection.prepare(sql).all(...params) },
    async run(sql,params=[]) { return Number(connection.prepare(sql).run(...params).changes) },
  }
  let tail:Promise<unknown>=Promise.resolve()
  const queue=<T>(work:()=>Promise<T>):Promise<T>=>{const task=tail.then(work);tail=task.catch(()=>undefined);return task}
  const db:Database={
    rows:(sql,params)=>queue(()=>raw.rows(sql,params)),run:(sql,params)=>queue(()=>raw.run(sql,params)),
    transaction:work=>queue(async()=>{
      connection.exec('BEGIN IMMEDIATE')
      try { const result=await work(raw);connection.exec('COMMIT');return result }
      catch(e) { connection.exec('ROLLBACK');throw e }
    }),close:()=>queue(async()=>{connection.close()}),
  }
  try {
    await db.transaction(async tx=>{
      for(const statement of schema.split(';').map(s=>s.trim()).filter(Boolean))await tx.run(statement)
      await tx.run('INSERT INTO schema_versions(version,applied_at) VALUES (?,?) ON CONFLICT(version) DO NOTHING',[SCHEMA_VERSION,new Date().toISOString()])
    })
    return db
  } catch(e) {await db.close();throw e}
}
