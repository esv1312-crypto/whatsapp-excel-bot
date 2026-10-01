const assert=require('assert');
const fs=require('fs');
const os=require('os');
const path=require('path');
const {StateStore}=require('../core/state_store');
const {EventBus}=require('../core/event_bus');
const {Orchestrator}=require('../core/orchestrator');
const {RecoveryManager}=require('../core/recovery_manager');
const {HeartbeatManager}=require('../core/heartbeat');
const {Watchdog}=require('../core/watchdog');
const {WorkerEngine}=require('../core/worker_engine');
const {TASK_STATUS}=require('../core/task_engine');

async function run(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ai-office-live-recovery-'));
  const store=new StateStore({filePath:path.join(dir,'state.json')});
  const bus=new EventBus();
  const heartbeat=new HeartbeatManager({eventBus:bus});
  const specialists=[{id:'developer',skills:['software_development']}];
  const orchestrator=new Orchestrator({stateStore:store,eventBus:bus,specialists,heartbeat,maxSteps:20});

  const task={id:'live-task',project:'live-recovery',objective:'Complete live recovery task',requiredSkills:['software_development'],status:TASK_STATUS.IN_PROGRESS,assignee:'developer',history:[]};
  orchestrator.addTask(task);
  heartbeat.start({executionId:'developer:live-task',agentId:'developer',taskId:task.id,status:'RUNNING',currentStep:1,lastHeartbeatAt:new Date(Date.now()-1000).toISOString()});

  const recoveryManager=new RecoveryManager({orchestrator,stateStore:store,eventBus:bus});
  const watchdog=new Watchdog({
    timeoutMs:100,
    eventBus:bus,
    heartbeat,
    onRecover:async execution=>{
      const result=recoveryManager.recoverExecution(execution);
      heartbeat.stop(execution.executionId,{status:'RECOVERED'});
      return result;
    }
  });

  let executed=0;
  const worker=new WorkerEngine({
    orchestrator,
    watchdog,
    actionProvider:async()=>{executed++;return [{type:'complete',result:{ok:true}}]},
    maxTicks:5,
    verifier:async()=>({passed:true,details:{verifiedBy:'live-recovery-test'}})
  });

  const result=await worker.tick();
  assert.equal(result.progressed,true);
  assert.equal(executed,1);
  assert.equal(orchestrator.getTask(task.id).status,TASK_STATUS.COMPLETED);

  const second=await worker.tick();
  assert.equal(orchestrator.getTask(task.id).status,TASK_STATUS.COMPLETED);

  const persisted=store.load();
  assert.equal(persisted.tasks[task.id].status,TASK_STATUS.COMPLETED);

  fs.rmSync(dir,{recursive:true,force:true});
  console.log('live watchdog -> recovery -> worker resume: PASS');
}
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={run};
