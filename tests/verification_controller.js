const assert=require('assert');\nconst {VerificationController}=require('../core/verification_controller');\n(async()=>{\n const controller=new VerificationController({\n  supervisor:{evaluate:t=>({passed:t.verification.passed && !!t.verification.evidence.commit,checks:{ok:true}}),shouldFix:e=>!e.passed},\n  evidenceCollector:{collect:async()=>({commit:'abc',changedFiles:['x.js'],workflowRuns:[{conclusion:'success'}]})}\n });\n const result=await controller.verifyTask({id:'t1',project:'owner/repo',commitSha:'abc',result:'done'});\n assert.strictEqual(result.evaluation.passed,true);\n assert.strictEqual(result.shouldFix,false);\n const pendingController=new VerificationController({
  supervisor:{evaluate:t=>({passed:t.verification.passed && !!t.verification.evidence.commit}),shouldFix:e=>!e.passed},
  evidenceCollector:{collect:async()=>({commit:'abc',workflowRuns:[{status:'in_progress',conclusion:null}]})}
 });
 const pending=await pendingController.verifyTask({id:'t2',project:'owner/repo',commitSha:'abc',result:'done'});
 assert.strictEqual(pending.verification.pending,true);
 assert.strictEqual(pending.shouldFix,false);
 console.log('verification_controller tests passed');\n})().catch(e=>{console.error(e);process.exit(1)});\n