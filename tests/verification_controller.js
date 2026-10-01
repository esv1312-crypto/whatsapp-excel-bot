const assert=require('assert');
const {VerificationController}=require('../core/verification_controller');
(async()=>{
 const controller=new VerificationController({
  supervisor:{evaluate:t=>({passed:t.verification.passed && !!t.verification.evidence.commit,checks:{ok:true}}),shouldFix:e=>!e.passed},
  evidenceCollector:{collect:async()=>({commit:'abc',changedFiles:['x.js'],workflowRuns:[{conclusion:'success'}]})}
 });
 const result=await controller.verifyTask({id:'t1',project:'owner/repo',commitSha:'abc',result:'done'});
 assert.strictEqual(result.evaluation.passed,true);
 assert.strictEqual(result.shouldFix,false);
 const pendingController=new VerificationController({
  supervisor:{evaluate:t=>({passed:t.verification.passed && !!t.verification.evidence.commit}),shouldFix:e=>!e.passed},
  evidenceCollector:{collect:async()=>({commit:'abc',workflowRuns:[{status:'in_progress',conclusion:null}]})}
 });
 const pending=await pendingController.verifyTask({id:'t2',project:'owner/repo',commitSha:'abc',result:'done'});
 assert.strictEqual(pending.verification.pending,true);
 assert.strictEqual(pending.shouldFix,false);
 console.log('verification_controller tests passed');
})().catch(e=>{console.error(e);process.exit(1)});
