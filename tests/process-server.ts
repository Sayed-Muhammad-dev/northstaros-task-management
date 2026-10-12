import {createServer} from '../server/app'
const app=await createServer({databasePath:process.argv[2],origin:process.argv[3],serveStatic:false})
app.server.listen(0,'127.0.0.1',()=>{const address=app.server.address();if(address&&typeof address!=='string')process.send?.({port:address.port})})
process.on('message',message=>{if(message==='close')void app.close().then(()=>process.exit(0))})
