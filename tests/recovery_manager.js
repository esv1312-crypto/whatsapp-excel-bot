const assert=require('assert');
const fs=require('fs');
const os=require('os');
const path=require('path');
const {StateStore,EventStore,EventBus,Orchestrator,WorkerEngine,RecoveryManager,createTask}=require('../core');

async function run(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ai-office-recovery-'));
  const filePath=path.join(dir,'state.json');
  const stateStore=new StateStore({filePath});
  const bus=new EventBus();
  const specialists=[{id:'developer',skills:['software_development']},{id:'qa',skills:['testing']}];
  const orchestrator=new Orchestrator({stateStore,eventBus:bus,specialists});

  const a=createTask({id:'A',project:'recovery-test',objective:'A',requiredSkills:['software_development']});
  const b=createTask({id:'B',project:'recovery-test',objective:'B',requiredSkills:['software_development']});
  const c=createTask({id:'C',project:'recovery-test',objective:'C',requiredSkills:['software_development']});
  const d=createTask({id:'D',project:'recovery-test',objective:'D',dependencies:['C'],requiredSkills:['testing']});

  for(const task of [a,b,c,d]) orchestrator.addTask(task);
  orchestrator.assign('A'); orchestrator.start('A'); orchestrator.implement('A',{ok:true});
  orchestrator.verify('A',true,{evidence:{test:'A'}});
  orchestrator.assign('B'); orchestrator.start('B'); orchestrator.implement('B',{ok:true});
  orchestrator.verify('B',true,{evidence:{test:'B'}});
  orchestrator.assign('C'); orchestrator.start('C');
  orchestrator.refresh();

  assert.equal(orchestrator.getTask('A').status,'COMPLETED');
  assert.equal(orchestrator.getTask('B').status,'COMPLETED');
  assert.equal(orchestrator.getTask('C').status,'IN_PROGRESS');
  assert.equal(orchestrator.getTask('D').status,'WAITING');

  const beforeA=orchestrator.getTask('A').history.length;
  const beforeB=orchestrator.getTask('B').history.length;

  // Simulate a real process restart: create fresh stores/orchestrator from persisted state.
  const restartedState=new StateStore({filePath});
  const restartedBus=new EventBus();
  const recoveryEvents=[];
  restartedBus.on('task.recovered',event=>recoveryEvents.push(event));

  const restarted=new Orchestrator({
    stateStore:restartedState,
    eventBus:restartedBus,
    specialists
  });

  const recovery=new RecoveryManager({orchestrator:restarted,stateStore:restartedState,eventBus:restartedBus});
  const report=recovery.recover();

  assert.equal(restarted.getTask('A').status,'COMPLETED');
  assert.equal(restarted.getTask('B').status,'COMPLETED');
  assert.equal(restarted.getTask('C').status,'READY');
  assert.equal(restarted.getTask('D').status,'WAITING');
  assert.equal(restarted.getTask('A').history.length,beforeA);
  assert.equal(restarted.getTask('B').history.length,beforeB);
  assert.deepEqual(report.resumedTaskIds,['C']);
  assert.deepEqual(report.waiting,['D']);
  assert(recoveryEvents.some(event=>event.payload.taskId==='C'));

  const worker=new WorkerEngine({
    orchestrator:restarted,
    maxTicks:10,
    actionProvider:async task=>[{type:'complete',result:{ok:true,taskId:task.id}}],
    verifier:async task=>({passed:true,details:{evidence:{test:task.id}}})
  });

  const result=await worker.run();
  assert.equal(result.complete,true);
  assert.equal(restarted.getTask('C').status,'COMPLETED');
  assert.equal(restarted.getTask('D').status,'COMPLETED');

  const persisted=new StateStore({filePath});
  const finalState=persisted.load();
  assert.equal(finalState.tasks.A.status,'COMPLETED');
  assert.equal(finalState.tasks.B.status,'COMPLETED');
  assert.equal(finalState.tasks.C.status,'COMPLETED');
  assert.equal(finalState.tasks.D.status,'COMPLETED');

  fs.rmSync(dir,{recursive:true,force:true});
  console.log('Recovery Manager test: PASS');
}

if(require.main===module) run().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={run};
