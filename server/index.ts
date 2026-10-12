import {createServer} from './app'

async function main():Promise<void> {
 const port=Number(process.env.API_PORT??process.env.PORT??5346)
 if(!Number.isInteger(port)||port<1||port>65535)throw new Error('API_PORT must be an integer from 1 to 65535')
 const app=await createServer()
 try{await new Promise<void>((resolve,reject)=>{app.server.once('error',reject);app.server.listen(port,process.env.API_HOST??'127.0.0.1',resolve)})}
 catch(error){await app.close();throw error}
 console.log(`NorthstarOS HTTP server ready on port ${port}; driver sqlite`)
 for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,()=>{void app.close().then(()=>process.exit(0))})
}
main().catch(()=>{console.error('NorthstarOS startup failed. Check Node 24, durable storage, API_PORT and APP_ORIGIN.');process.exitCode=1})
