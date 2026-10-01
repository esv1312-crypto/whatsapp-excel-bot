const assert=require('assert');
const fs=require('fs'); const os=require('os'); const path=require('path'); const office=require('../core');
async function run(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ai-office-first-launch-'));
 try{
  const store=new office.StateStore({filePath:path.join(dir,'state.json')}); const bus=new office.EventBus(); const events=[];
  bus.on('task.completed',event=>events.push(event));
  const runtime=new office.OfficeRuntime({stateStore:store,eventBus:bus,specialists:[{id:'developer',skills:['software_development']}],blueprint:[{id:'implementation',objective:'Complete the first AI-OFFICE launch smoke task',requiredSkills:['software_development']}],actionProvider:async task=>[{type:'complete',result:{ok:true,launch:'first-test-launch',taskId:task.id}}],maxTicks:10,maxSteps:10});
  const result=await runtime.launch({project:{id:'first-launch',name:'AI-OFFICE First Launch'},goal:'Prove the operator-facing AI-OFFICE launch path from goal to completed task'});
  assert.equal(result.status,'COMPLETED'); assert.equal(result.execution.complete,true); assert.equal(result.project.id,'first-launch'); assert.equal(result.orchestrator.getTask('implementation').status,'COMPLETED'); assert.equal(events.length,1);
  const persisted=store.load(); assert.equal(persisted.projects['first-launch'].id,'first-launch'); assert.equal(persisted.tasks.implementation.status,'COMPLETED');
  console.log('AI-OFFICE first launch: PASS');
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
}
if(require.main===module) run().catch(error=>{console.error(error);process.exitCode=1;}); module.exports={run};
