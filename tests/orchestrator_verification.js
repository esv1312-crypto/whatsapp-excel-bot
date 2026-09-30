const assert=require('assert');
const {Orchestrator}=require('../core/orchestrator');
(async()=>{
 const events=[];
 const orchestrator=new Orchestrator({eventBus:{emit:(type,payload)=>events.push({type,payload})},verificationController:{verifyTask:async()=>({evaluation:{passed:true},verification:{passed:true,evidence:{commit:'abc'}}})}});
 const task={id:'t1',project:'owner/repo',status:'VERIFYING',result:'done',verification:null,history:[]};
 orchestrator.tasks.set(task.id,task);
 const result=await orchestrator.verifyWithEvidence('t1');
 assert.strictEqual(result.evaluation.passed,true); assert.strictEqual(task.status,'COMPLETED'); assert(events.some(e=>e.type==='task.completed'));
 console.log('orchestrator verification integration passed');
})().catch(e=>{console.error(e);process.exit(1)});
