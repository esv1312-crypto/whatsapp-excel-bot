const assert=require('assert');
const fs=require('fs');
const os=require('os');
const path=require('path');
const office=require('../core');

async function run(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ai-office-full-e2e-'));
  const filePath=path.join(dir,'state.json');
  const store=new office.StateStore({filePath});
  const bus=new office.EventBus();
  const events=[];
  for(const type of ['task.created','task.ready','task.assigned','task.started','task.implemented','task.verifying','task.waiting','task.failed','task.fixing','task.retest','task.completed']){
    bus.on(type,event=>events.push(type+':'+event.payload.taskId));
  }

  const attempts=new Map();
  const verificationCalls=new Map();
  const verificationController=new office.VerificationController({
    supervisor:{
      evaluate:task=>({passed:task.verification.passed,missing:task.verification.passed?[]:['ci']}),
      shouldFix:e=>!e.passed
    },
    evidenceCollector:{
      collect:async({commitSha})=>{
        const n=(verificationCalls.get(commitSha)||0)+1;
        verificationCalls.set(commitSha,n);
        if(commitSha==='original-commit' && n===1)
          return {commit:commitSha,workflowRuns:[{status:'in_progress',conclusion:null}]};
        if(commitSha==='original-commit' && n===2)
          return {commit:commitSha,workflowRuns:[{status:'completed',conclusion:'failure'}]};
        return {commit:commitSha,workflowRuns:[{status:'completed',conclusion:'success'}]};
      }
    }
  });

  const runner=new office.ProjectRunner({
    specialists:[{id:'developer',skills:['software_development']}],
    stateStore:store,
    eventBus:bus,
    verificationController,
    maxTicks:30,
    maxSteps:50,
    blueprint:[{id:'implementation',objective:'Implement and verify a change',requiredSkills:['software_development']}],
    actionProvider:async task=>{
      attempts.set(task.id,(attempts.get(task.id)||0)+1);
      if(task.parentTask) return [{type:'complete',result:{ok:true,commitSha:'fix-commit'}}];
      return [{type:'complete',result:{ok:true,commitSha:'original-commit'}}];
    }
  });

  const result=await runner.run({
    project:{id:'full-e2e-test',name:'Full E2E Test'},
    goal:'Run a complete implementation, CI wait, failure, fix, retest and persistence cycle'
  });

  assert.equal(result.status,'COMPLETED');
  assert.equal(result.execution.complete,true);
  const original=result.orchestrator.getTask('implementation');
  assert.equal(original.status,'COMPLETED');
  assert.equal(original.commitSha,'fix-commit');
  const fix=result.orchestrator.getTask('implementation:fix:1');
  assert(fix,'Fix task was not created');
  assert.equal(fix.status,'COMPLETED');
  assert.equal(verificationCalls.get('original-commit'),2);
  assert.equal(verificationCalls.get('fix-commit'),2);
  assert(events.includes('task.waiting:implementation'));
  assert(events.includes('task.failed:implementation'));
  assert(events.includes('task.fixing:implementation'));
  assert(events.includes('task.retest:implementation'));
  assert.equal(events.filter(e=>e==='task.completed:implementation').length,1);

  const persisted=new office.StateStore({filePath}).load();
  assert.equal(persisted.tasks.implementation.status,'COMPLETED');
  assert.equal(persisted.tasks['implementation:fix:1'].status,'COMPLETED');

  fs.rmSync(dir,{recursive:true,force:true});
  console.log('full AI-OFFICE E2E lifecycle: PASS');
}

if(require.main===module) run().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={run};
