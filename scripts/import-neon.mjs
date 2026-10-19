// Copied into each pending app with a project-specific migration-source.json.
// This transfers data only; runtime integration must be verified before launch.
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {isDeepStrictEqual} from 'node:util';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const config=JSON.parse(await fs.readFile(path.join(root,'scripts/migration-source.json'),'utf8'));
const quote=name=>'"'+name.replaceAll('"','""')+'"';
const apply=process.argv.includes('--apply');
let source;
if(config.format==='json'){
  const snapshot=JSON.parse(await fs.readFile(path.resolve(root,config.source),'utf8'));
  if(config.key==='sapana-salon'&&(snapshot.version!==2||snapshot.records?.meta?.application?.kind!=='salon'))throw new Error('Source belongs to another business or has an invalid version.');
  if(config.key==='bookease'&&(!Array.isArray(snapshot.providers)||!Array.isArray(snapshot.services)||!Array.isArray(snapshot.bookings)))throw new Error('Invalid BookEase source data.');
  source={[config.table]:[{application_key:config.key,payload:snapshot,revision:snapshot.revision??1}]};
}else{
  const db=new DatabaseSync(path.resolve(root,config.source),{readOnly:true});
  try{db.exec('BEGIN');source=Object.fromEntries(config.tables.map(table=>[table,db.prepare('SELECT * FROM '+quote(table)).all()]));db.exec('ROLLBACK');}finally{db.close();}
}
const counts=Object.fromEntries(Object.entries(source).map(([table,rows])=>[table,rows.length]));
console.log(JSON.stringify({project:config.project,mode:apply?'import':'preview',source:config.source,collections:counts,localSessionsImported:config.format==='json'?'Snapshot preserved':'No'}));
if(!apply)process.exit(0);
const connection=process.env.DIRECT_URL||process.env.DATABASE_URL;
if(!process.env.DATABASE_URL)throw new Error('Add this project’s own DATABASE_URL before importing.');
function privateUrl(value){try{return new URL(value);}catch{throw new Error('Invalid private database URL.');}}
const url=privateUrl(connection),runtimeUrl=privateUrl(process.env.DATABASE_URL);
const host=value=>value.hostname.replace('-pooler.','.');
if(host(url)!==host(runtimeUrl)||url.pathname!==runtimeUrl.pathname)throw new Error('DIRECT_URL and DATABASE_URL must identify the same database branch.');
if([url,runtimeUrl].some(value=>value.searchParams.get('schema')&&value.searchParams.get('schema')!=='public'))throw new Error('A non-public schema needs a separate reviewed migration plan.');
if(!url.hostname.endsWith('.neon.tech'))throw new Error('Expected the project’s own Neon database.');
const assigned=['ep-spring-dream-ayqqeb78','ep-young-cell-b4ibe6ja','ep-orange-river-ay2bp7el','ep-hidden-pine-axwvbufy','ep-empty-truth-b5u1e6j2','ep-falling-rice-b542fob6','ep-steep-mode-b48fdqdr','ep-wispy-silence-b4f6i1er','ep-winter-hall-b4615a8h','ep-calm-lake-b5x0wg4z','ep-noisy-star-b4f1veld','ep-summer-boat-b4i4o4c4'];
if(assigned.some(endpoint=>url.hostname.startsWith(endpoint)))throw new Error('This endpoint is already assigned to another application. Import refused.');
const {default:pg}=await import(pathToFileURL(path.join(root,'migration-tools/node_modules/pg/lib/index.js')).href);
const pool=new pg.Pool({connectionString:connection,max:1,connectionTimeoutMillis:15000,statement_timeout:30000}),client=await pool.connect();
try{
  await client.query('BEGIN');
  const names=(await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public'")).rows.map(row=>row.tablename);
  if(names.some(name=>!config.allowedTables.includes(name)&&name!=='_prisma_migrations'))throw new Error('Unexpected tables. Verify the target before importing.');
  const remote={};for(const name of names)remote[name]=(await client.query('SELECT row_to_json(record)::text AS row FROM '+quote(name)+' AS record')).rows.map(row=>row.row);
  const backup='.env.neon-import-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json.local';
  await new Promise((resolve,reject)=>{const child=spawn('git',['check-ignore','--quiet','--',backup],{cwd:root,windowsHide:true});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error('Private backup is not Git-ignored.')));});
  await fs.writeFile(path.join(root,backup),JSON.stringify({source,remote},(_,value)=>typeof value==='bigint'?value.toString():value),{flag:'wx',mode:0o600});
  for(const [table,rows] of Object.entries(source)){
    for(const original of rows){
      const columns=Object.keys(original),values=columns.map(column=>column==='payload'?JSON.stringify(original[column]):original[column]);
      await client.query('INSERT INTO '+quote(table)+'('+columns.map(quote).join(',')+') VALUES('+values.map((_,index)=>'$'+(index+1)).join(',')+') ON CONFLICT DO NOTHING',values);
      const keys=config.primaryKeys[table],saved=(await client.query('SELECT * FROM '+quote(table)+' WHERE '+keys.map((key,index)=>quote(key)+'=$'+(index+1)).join(' AND '),keys.map(key=>original[key]))).rows[0];
      if(!saved)throw new Error('Unique-key conflict in '+table+'. Existing data preserved.');
      for(const key of Object.keys(original))if(typeof original[key]==='number'&&typeof saved[key]==='string'&&/^\d+$/.test(saved[key]))saved[key]=Number(saved[key]);
      if(!isDeepStrictEqual(saved,original))throw new Error('Existing or imported row differs in '+table+'. Nothing was overwritten.');
    }
  }
  if(config.mediaDirectory){
    const directory=path.resolve(root,config.mediaDirectory),files=await fs.readdir(directory).catch(()=>[]);
    for(const filename of files.filter(value=>/^[a-f0-9-]{36}\.(png|jpg|webp)$/.test(value))){
      const bytes=await fs.readFile(path.join(directory,filename)),mime=filename.endsWith('.jpg')?'image/jpeg':filename.endsWith('.png')?'image/png':'image/webp';
      await client.query('INSERT INTO business_media(filename,content_type,data) VALUES($1,$2,$3) ON CONFLICT(filename) DO NOTHING',[filename,mime,bytes]);
      const saved=(await client.query('SELECT data FROM business_media WHERE filename=$1',[filename])).rows[0];
      if(!saved?.data.equals(bytes))throw new Error('An existing upload differs. Nothing was overwritten.');
    }
  }
  await client.query('COMMIT');console.log('Data import verified. Existing records were not overwritten.');
}catch(error){await client.query('ROLLBACK').catch(()=>{});console.error('Import stopped:',error.code||error.message);process.exitCode=1;}finally{client.release();await pool.end();}
