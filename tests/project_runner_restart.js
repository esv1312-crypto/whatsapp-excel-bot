const assert=require('assert');
const fs=require('fs');
const os=require('os');
const path=require('path');
const office=require('../core');

async function run(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ai-office-project-restart-'));
  const filePath=path.join(dir,'state.json');
  const specialists=[
    {id:'product',skills:['product_management']},
    {id:'architect',skills:['architecture']},
    {id:'developer',skills:['software_development']},
    {id:'qa',skills:['testing']}
  ];
  const project={id:'project-restart-test',name:'Project Restart Test'};
  const goal='Recover a project after an interrupted execution';

  const firstStore=new office.StateStore({filePath});
  const firstBus=new office.EventBus();
  const firstRunner=new office.ProjectRunner({
    specialists,
    stateStore:firstStore,
    eventBus:firstBus,
    maxTicks:10,
    maxSteps:30,
    actionProvider:async()=>{ throw new Error('SIMULATED_PROCESS_CRASH'); }
  });

  await assert.rejects(
    ()=>firstRunner.run({project,goal}),
    /SIMULATED_PROCESS_CRASH/
  );

  const interrupted=new office.StateStore({filePath}).load();
  const persistedProject=interrupted.projects[project.id];
  assert(persistedProject,'Project envelope was not persisted before execution');
  const productId=persistedProject.tasks[0];
  assert.equal(interrupted.tasks[productId].status,'IN_PROGRESS');

  const restartedStore=new office.StateStore({filePath});
  const restartedBus=new office.EventBus();
  const recoveryEvents=[];
  restartedBus.on('task.recovered',event=>recoveryEvents.push(event));

  const restartedRunner=new office.ProjectRunner({
    specialists,
    stateStore:restartedStore,
    eventBus:restartedBus,
    maxTicks:20,
    maxSteps:50,
    actionProvider:async task=>[{type:'complete',result:{ok:true,taskId:task.id}}],
    verifier:async task=>({passed:true,details:{verifiedBy:'project-restart-test',evidence:{task:task.id}}})
  });

  const result=await restartedRunner.run({project,goal});

  assert.equal(result.status,'COMPLETED');
  assert.equal(result.execution.complete,true);
  assert(result.recovery.resumedTaskIds.includes(productId));
  assert(recoveryEvents.some(event=>event.payload.taskId===productId));

  const finalState=new office.StateStore({filePath}).load();
  for(const id of persistedProject.tasks) assert.equal(finalState.tasks[id].status,'COMPLETED');

  fs.rmSync(dir,{recursive:true,force:true});
  console.log('Project Runner restart recovery test: PASS');
}

if(require.main===module) run().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={run};
