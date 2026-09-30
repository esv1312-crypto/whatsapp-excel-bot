const assert=require('assert');
const office=require('../core');

(async()=>{
  const orchestrator=new office.Orchestrator({
    specialists:[{id:'dev',skills:['software_development']}],
    maxSteps:10
  });
  orchestrator.addTask(office.createTask({
    id:'scheduled-task',
    objective:'Run through scheduler',
    requiredSkills:['software_development']
  }));

  const worker=new office.WorkerEngine({
    orchestrator,
    maxTicks:5,
    actionProvider:async()=>[{type:'complete',result:{ok:true}}],
    verifier:async()=>({passed:true,details:{evidence:{tests:'scheduler'}}})
  });

  const scheduler=new office.OfficeScheduler({worker,maxCycles:5});
  const result=await scheduler.run();
  assert.strictEqual(result.complete,true);
  assert(result.cycles>=2);
  assert.strictEqual(orchestrator.getTask('scheduled-task').status,'COMPLETED');

  const second=new office.OfficeScheduler({worker,maxCycles:1});
  assert.strictEqual(second.start(),true);
  assert.strictEqual(second.start(),false);
  assert.strictEqual(second.stop(),true);
  assert.strictEqual(second.stop(),false);

  console.log('scheduler tests: OK');
})().catch(error=>{console.error(error);process.exitCode=1;});
