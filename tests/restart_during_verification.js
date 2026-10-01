const assert=require('assert');
const fs=require('fs');
const os=require('os');
const path=require('path');
const office=require('../core');

async function run(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ai-office-verification-restart-'));
  const filePath=path.join(dir,'state.json');
  const project={id:'verification-restart-test',name:'Verification Restart Test'};
  const specialists=[{id:'developer',skills:['software_development']}];

  const firstStore=new office.StateStore({filePath});
  const firstBus=new office.EventBus();
  let firstVerification=true;
  const firstVerificationController=new office.VerificationController({
    supervisor:{evaluate:task=>({passed:task.verification.passed}),shouldFix:e=>!e.passed},
    evidenceCollector:{collect:async({commitSha})=>({
      commit:commitSha,
      workflowRuns:firstVerification
        ? [{status:'in_progress',conclusion:null}]
        : [{status:'completed',conclusion:'success'}]
    })}
  });

  const firstRunner=new office.ProjectRunner({
    specialists,stateStore:firstStore,eventBus:firstBus,
    verificationController:firstVerificationController,
    maxTicks:10,maxSteps:20,
    blueprint:[{id:'implementation',objective:'Implement a change',requiredSkills:['software_development']}],
    actionProvider:async()=>[{type:'complete',result:{commitSha:'pending-commit'}}],
    onCycle:result=>{
      if(result.status==='WAITING') throw new Error('SIMULATED_PROCESS_CRASH_DURING_VERIFICATION_WAIT');
    }
  });

  await assert.rejects(
    ()=>firstRunner.run({project,goal:'Survive a restart while CI verification is pending'}),
    /SIMULATED_PROCESS_CRASH_DURING_VERIFICATION_WAIT/
  );

  const interrupted=new office.StateStore({filePath}).load();
  assert.equal(interrupted.tasks.implementation.status,'WAITING');
  assert.equal(interrupted.tasks.implementation.waitingForVerification,true);

  firstVerification=false;
  const secondStore=new office.StateStore({filePath});
  const secondBus=new office.EventBus();
  const recovered=[];
  secondBus.on('task.recovered',event=>recovered.push(event));

  const secondVerificationController=new office.VerificationController({
    supervisor:{evaluate:task=>({passed:task.verification.passed}),shouldFix:e=>!e.passed},
    evidenceCollector:{collect:async({commitSha})=>({
      commit:commitSha,
      workflowRuns:[{status:'completed',conclusion:'success'}]
    })}
  });

  const secondRunner=new office.ProjectRunner({
    specialists,stateStore:secondStore,eventBus:secondBus,
    verificationController:secondVerificationController,
    maxTicks:10,maxSteps:20,
    blueprint:[{id:'implementation',objective:'Implement a change',requiredSkills:['software_development']}],
    actionProvider:async()=>{throw new Error('Worker must not re-implement pending verification');}
  });

  const result=await secondRunner.run({project,goal:'Survive a restart while CI verification is pending'});
  assert.equal(result.status,'COMPLETED');
  assert.equal(result.execution.complete,true);
  assert.equal(result.orchestrator.getTask('implementation').status,'COMPLETED');
  assert.equal(recovered.length,0,'Pending verification should remain WAITING, not be recovered as READY');

  fs.rmSync(dir,{recursive:true,force:true});
  console.log('restart during pending verification: PASS');
}

if(require.main===module) run().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={run};
