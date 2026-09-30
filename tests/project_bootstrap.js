const assert=require('assert');
const office=require('../core');

(async()=>{
  const result=office.bootstrapProject(
    {id:'bootstrap-test',name:'Bootstrap Test',repository:'owner/repo'},
    {
      goal:'Build a verified feature',
      specialists:[
        {id:'product',skills:['product_management']},
        {id:'architect',skills:['architecture']},
        {id:'developer',skills:['software_development']},
        {id:'qa',skills:['testing']}
      ]
    }
  );
  assert.strictEqual(result.project.id,'bootstrap-test');
  assert.strictEqual(result.project.repository,'owner/repo');
  assert.strictEqual(result.plan.tasks.length,4);
  assert.deepStrictEqual(result.project.tasks,result.plan.tasks.map(t=>t.id));
  assert.strictEqual(result.plan.team.complete,true);

  const run=await office.runProject(
    {id:'runner-test',name:'Runner Test'},
    {
      goal:'Run a complete autonomous project',
      specialists:[
        {id:'product',skills:['product_management']},
        {id:'architect',skills:['architecture']},
        {id:'developer',skills:['software_development']},
        {id:'qa',skills:['testing']}
      ],
      maxTicks:20,
      maxCycles:20,
      actionProvider:async task=>[{type:'complete',result:{ok:true}}],
      verifier:async()=>({passed:true,details:{evidence:{tests:'runner'}}})
    }
  );
  assert.strictEqual(run.complete,true);
  assert.strictEqual(run.project.status,'COMPLETED');
  assert(run.execution.cycles>0);
  assert(run.plan.tasks.every(task=>run.orchestrator.getTask(task.id).status==='COMPLETED'));
  console.log('project runner tests: OK');
})().catch(error=>{console.error(error);process.exitCode=1;});
