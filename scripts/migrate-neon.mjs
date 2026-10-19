import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const config=JSON.parse(await fs.readFile(path.join(root,'scripts/migration-source.json'),'utf8'));
const connection=process.env.DIRECT_URL||process.env.DATABASE_URL;
if(!process.env.DATABASE_URL)throw new Error('Add this project’s own DATABASE_URL first.');
function privateUrl(value){try{return new URL(value);}catch{throw new Error('Invalid private database URL.');}}
const url=privateUrl(connection),runtimeUrl=privateUrl(process.env.DATABASE_URL);
const host=value=>value.hostname.replace('-pooler.','.');
if(host(url)!==host(runtimeUrl)||url.pathname!==runtimeUrl.pathname)throw new Error('DIRECT_URL and DATABASE_URL must identify the same database branch.');
if([url,runtimeUrl].some(value=>value.searchParams.get('schema')&&value.searchParams.get('schema')!=='public'))throw new Error('A non-public schema needs a separate reviewed migration plan.');
if(!url.hostname.endsWith('.neon.tech'))throw new Error('Expected an assigned Neon database.');
const known=['ep-spring-dream-ayqqeb78','ep-young-cell-b4ibe6ja','ep-orange-river-ay2bp7el','ep-hidden-pine-axwvbufy','ep-empty-truth-b5u1e6j2','ep-falling-rice-b542fob6','ep-steep-mode-b48fdqdr','ep-wispy-silence-b4f6i1er','ep-winter-hall-b4615a8h','ep-calm-lake-b5x0wg4z','ep-noisy-star-b4f1veld','ep-summer-boat-b4i4o4c4'];
if(known.some(endpoint=>url.hostname.startsWith(endpoint)))throw new Error('That endpoint belongs to a different project. Migration refused.');
const {default:pg}=await import(pathToFileURL(path.join(root,'migration-tools/node_modules/pg/lib/index.js')).href);
const pool=new pg.Pool({connectionString:connection,max:1,connectionTimeoutMillis:15000});
try{
  const names=(await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public'")).rows.map(row=>row.tablename);
  if(names.some(name=>!config.allowedTables.includes(name)&&name!=='_prisma_migrations'))throw new Error('Unexpected tables: audit the target before applying migrations.');
  if(config.key&&names.includes(config.table)){
    const keys=(await pool.query('SELECT application_key FROM "'+config.table+'"')).rows;
    if(keys.some(row=>row.application_key!==config.key))throw new Error('Target contains another application’s data.');
  }
  const directories=(await fs.readdir(path.join(root,'prisma/migrations'),{withFileTypes:true})).filter(row=>row.isDirectory()).map(row=>row.name);
  if(names.includes('_prisma_migrations')){
    const applied=(await pool.query('SELECT migration_name,finished_at,rolled_back_at FROM _prisma_migrations')).rows;
    if(applied.some(row=>!directories.includes(row.migration_name)||!row.finished_at&&!row.rolled_back_at))throw new Error('Foreign or unfinished migrations require review.');
  }else if(names.length)throw new Error('Existing tables need a reviewed baseline before deployment. No reset was performed.');
  for(const directory of directories){const sql=await fs.readFile(path.join(root,'prisma/migrations',directory,'migration.sql'),'utf8');if(/\b(DROP|TRUNCATE|DELETE)\s+(TABLE|TYPE|FROM|INDEX|COLUMN)\b/i.test(sql))throw new Error('Destructive SQL requires review.');}
}finally{await pool.end();}
await new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[path.join(root,'migration-tools/node_modules/prisma/build/index.js'),'migrate','deploy'],{cwd:root,env:process.env,windowsHide:true,stdio:'inherit'});
  child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error('Prisma migration failed. No reset was attempted.')));
});
