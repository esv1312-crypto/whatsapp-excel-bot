const assert=require('assert');
const fs=require('fs');
const os=require('os');
const path=require('path');
const office=require('../core');

async function run(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ai-office-multi-recovery-'));
  const filePath=path.join(dir,'state.json');
  const store=new office.StateStore({filePath});
  const bus=new office.EventBus();
  const project={id:'multi-recovery-test',name:'Multi State Recovery Test'};
  const specialists=[
    {id:'product',skills:['product_management']},
    {id:'architect',skills:['architecture']},
    {id:'developer',skills:['software_development']},
    {id:'qa',skills:['testing']}
  ];

  const runner=new office.ProjectRunner({
    specialists,stateStore:store,eventBus:bus,maxTicks:10,maxSteps:30,
    actionProvider:async task=>[{type:'complete',result:{ok:true}}],
    verifier:async()=>({passed:true})
  });

  const result=await runner.run({project,goal:'Build a project with multiple recovery states'});
  assert.equal(result.status,'COMPLETED');

  const persisted=store.load();
  const ids=persisted.projects[project.id].tasks;
  assert.equal(ids.length,4);

  const stateStore=new office.StateStore({filePath});
  const state=stateStore.load();
  const [a,b,c,d]=ids;
  state.tasks[a].status='COMPLETED';
  state.tasks[b].status='IN_PROGRESS';
  state.tasks[c].status='ASSIGNED';
  state.tasks[d].status='WAITING';
  state.tasks[d].waitingForVerification=false;
  state.tasks[d].dependencies=[c];
  state.tasks[b].history=[{status:'COMPLETED',at:new Date().toISOString()},{status:'IN_PROGRESS',at:new Date().toISOString()}];
  state.tasks[c].history=[{status:'COMPLETED',at:new Date().toISOString()},{status:'ASSIGNED',at:new Date().toISOString()}];
  state.tasks[d].history=[{status:'WAITING',at:new Date().toISOString()}];
  stateStore.save(state);

  const restartedStore=new office.StateStore({filePath});
  const restartedBus=new office.EventBus();
  const recovered=[];
  restartedBus.on('task.recovered',e=>recovered.push(e));
  const orchestrator=new office.Orchestrator({stateStore:restartedStore,eventBus:restartedBus,specialists});
  for(const id of ids) orchestrator.addTask(restartedStore.load().tasks[id]);

  const manager=new office.RecoveryManager({orchestrator,stateStore:restartedStore,eventBus:restartedBus});
  const recovery=manager.recover();

  assert.equal(orchestrator.getTask(a).status,'COMPLETED');
  assert.equal(orchestrator.getTask(b).status,'READY');
  assert.equal(orchestrator.getTask(c).status,'READY');
  assert.equal(orchestrator.getTask(d).status,'WAITING');
  assert(recovery.resumedTaskIds.includes(b));
  assert(recovery.resumedTaskIds.includes(c));
  assert(!recovery.resumedTaskIds.includes(d));
  assert.equal(recovered.length,2);

  fs.rmSync(dir,{recursive:true,force:true});
  console.log('multi-state project recovery: PASS');
}

if(require.main===module) run().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={run};
