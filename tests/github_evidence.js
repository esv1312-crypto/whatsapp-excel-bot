const assert=require('assert');
const {GitHubEvidenceCollector}=require('../core/github_evidence');
(async()=>{
 const collector=new GitHubEvidenceCollector({
  fetchCommit:async()=>({sha:'abc',files:[{filename:'core/x.js'},{filename:'tests/x.js'}]}),
  fetchWorkflowRuns:async()=>({workflow_runs:[{id:10,status:'completed',conclusion:'success'}]}),
  getCombinedStatus:async()=>({statuses:[{state:'success'}]}),
  fetchJobs:async()=>({jobs:[{id:55,name:'test',conclusion:'success'}]}),
  fetchSteps:async()=>({steps:[{name:'npm test',conclusion:'success'}]}),
  fetchArtifacts:async()=>({artifacts:[{name:'build-artifact'}]})
 });
 const e=await collector.collect({repository:'owner/repo',commitSha:'abc'});
 assert.strictEqual(e.commit,'abc');
 assert.deepStrictEqual(e.changedFiles,['core/x.js','tests/x.js']);
 assert.strictEqual(e.workflowRuns[0].conclusion,'success');
 assert.strictEqual(e.status.statuses[0].state,'success');
 assert.strictEqual(e.runs[0].jobs[0].id,55);
 assert.strictEqual(e.runs[0].steps[0].steps[0].conclusion,'success');
 assert.strictEqual(e.runs[0].artifacts[0].name,'build-artifact');
 console.log('github_evidence tests passed');
})().catch(e=>{console.error(e);process.exit(1)});
