const assert=require('assert');
const office=require('../core');

(async()=>{
  const specialists=[
    {id:'product',skills:['product_management']},
    {id:'architect',skills:['architecture']},
    {id:'developer',skills:['software_development']},
    {id:'qa',skills:['testing']}
  ];
  const events=[];
  const bus=new office.EventBus();
  bus.on('task.completed',e=>events.push(e.type));

  const runner=new office.ProjectRunner({
    specialists,
    eventBus:bus,
    maxTicks:20,
    maxSteps:30,
    actionProvider:async task=>[
      {type:'complete',result:{ok:true,taskId:task.id}}
    ],
    verifier:async task=>({
      passed:true,
      details:{verifiedBy:'project-runner-test',evidence:{tests:'passed',task:task.id}}
    })
  });

  const result=await runner.run({
    project:{id:'runner-test',name:'Runner Test'},
    goal:'Run the complete autonomous project lifecycle'
  });

  assert.strictEqual(result.status,'COMPLETED');
  assert.strictEqual(result.execution.complete,true);
  assert.strictEqual(result.plan.tasks.length,4);
  assert(result.plan.tasks.every(task=>result.orchestrator.getTask(task.id).status==='COMPLETED'));
  assert.strictEqual(events.length,4);
  console.log('project runner E2E: OK');
})().catch(error=>{console.error(error);process.exitCode=1;});
