const assert=require('assert');
const fs=require('fs');
const os=require('os');
const path=require('path');
const office=require('../core');

async function run(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ai-office-full-cycle-'));
  const statePath=path.join(dir,'state.json');
  const store=new office.StateStore({filePath:statePath});
  const bus=new office.EventBus();
  const specialists=[
    {id:'product',skills:['product_management']},
    {id:'architect',skills:['architecture']},
    {id:'developer',skills:['software_development']},
    {id:'qa',skills:['testing']}
  ];
  const events=[];
  ['task.created','task.assigned','task.started','task.implemented','task.verifying','task.completed','task.failed','task.fixing','task.retest','task.recovered'].forEach(t=>bus.on(t,e=>events.push({type:t,taskId:e.payload?.taskId})));

  const attempts=new Map();
  const runner=new office.ProjectRunner({
    specialists,stateStore:store,eventBus:bus,maxTicks:30,maxSteps:50,maxFixesPerTask:2,
    actionProvider:async task=>{
      const n=(attempts.get(task.id)||0)+1; attempts.set(task.id,n);
      return [{type:'complete',result:{ok:true,commitSha:`${task.id}-commit-${n}`}}];
    },
    verifier:async task=>{
      if(task.id==='implementation' && task.commitSha==='implementation-commit-1') return {passed:false,details:{reason:'test failure',missing:['ci']}};
      return {passed:true,details:{evidence:{ok:true}}};
    }
  });

  const result=await runner.run({project:{id:'full-cycle',name:'Full Cycle'},goal:'Complete an end-to-end AI-OFFICE lifecycle'});
  assert.equal(result.status,'COMPLETED');
  assert(result.execution.complete);
  const tasks=result.orchestrator.listTasks();
  assert(tasks.every(t=>t.status==='COMPLETED'));
  assert(events.some(e=>e.type==='task.failed'&&e.taskId==='implementation'));
  assert(events.some(e=>e.type==='task.fixing'&&e.taskId==='implementation'));
  assert(events.some(e=>e.type==='task.retest'&&e.taskId==='implementation'));

  const persisted=store.load();
  assert.equal(persisted.projects['full-cycle'].id,'full-cycle');
  assert(tasks.every(t=>persisted.tasks[t.id].status==='COMPLETED'));

  const plan=office.plan('Build an autonomous workflow',{project:'full-cycle',specialists});
  assert.equal(plan.tasks.length,4);
  assert(plan.tasks.some(t=>t.requiredSkills.includes('product_management')));

  fs.rmSync(dir,{recursive:true,force:true});
  console.log('full AI-OFFICE lifecycle: PASS');
}
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={run};
