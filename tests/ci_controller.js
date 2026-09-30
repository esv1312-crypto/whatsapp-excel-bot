const assert=require('assert');
const {CIController}=require('../core/ci_controller');
(async()=>{
 let n=0;
 const ci=new CIController({
   trigger:async input=>({runId:'run-1',commitSha:input.commitSha}),
   getRun:async()=>++n<2?{status:'in_progress',conclusion:null}:{status:'completed',conclusion:'success'},
   sleep:async()=>{}
 });
 const result=await ci.run({repository:'owner/repo',commitSha:'abc'});
 assert.strictEqual(result.runId,'run-1');
 assert.strictEqual(result.conclusion,'success');
 assert.strictEqual(result.history.length,2);
 console.log('CI controller tests passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
