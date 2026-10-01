const assert=require('assert');
const http=require('http');
const {HttpActionProvider}=require('../core');

async function run(){
  const server=http.createServer((req,res)=>{
    let body='';
    req.on('data,chunk=>body+=chunk);
    req.on('end',()=>{
      const parsed=JSON.parse(body);
      assert.equal(parsed.task.id,'demo-task');
      res.setHeader('content-type','application/json');
      res.end(JSON.stringify({actions:[{type:'complete',result:{ok:true,provider:'http'}}]}));
    });
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const port=server.address().port;
    const provider=new HttpActionProvider({url:'http://127.0.0.1:'+port});
    const actions=await provider.execute({id:'demo-task'}, {listTasks:()=>[]});
    assert.deepEqual(actions,[{type:'complete',result:{ok:true,provider:'http'}}]);
    console.log('HTTP action provider: PASS');
  } finally {
    await new Promise(resolve=>server.close(resolve));
  }
}
if(require.main===module) run().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={run};
