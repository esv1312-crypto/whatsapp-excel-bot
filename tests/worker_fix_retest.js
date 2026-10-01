const assert=require('assert');
const office=require('../core');

async function run(){
  const store=new office.ExperienceStore();
  const lessons=new office.LessonEngine();
  const company=new office.CompanyMemory();
  const project=new office.ProjectMemory();

  let parentVerificationCount=0;
  const orchestrator=new office.Orchestrator({
    specialists:[{id:'developer',skills:['software_development']}],
    tools:{},
    experienceStore:store,
    lessonEngine:lessons,
    companyMemory:company,
    projectMemory:project,
    maxSteps:20
  });

  const parent=office.createTask({
    id:'repair-cycle',
    project:'pognali3',
    objective:'Implement feature with validation',
    requiredSkills:['software_development']
  });
  orchestrator.addTask(parent);

  const worker=new office.WorkerEngine({
    orchestrator,
    maxTicks:10,
    maxFixesPerTask:2,
    actionProvider:async task=>{
      if(task.parentTask){
        return [{type:'complete',result:{
          ok:true,
          commitSha:'fix-commit-123',
          lesson:'When validation fails, repair the implementation and rerun verification.'
        }}];
      }
      return [{type:'complete',result:{ok:true}}];
    },
    verifier:async task=>{
      if(task.parentTask) return {passed:true,details:{verifiedBy:'repair-test',evidence:{tests:'fix-task'}}};
      parentVerificationCount++;
      if(parentVerificationCount===1){
        return {
          passed:false,
          details:{
            verifiedBy:'repair-test',
            evidence:{tests:'failed'},
            evaluation:{missing:['validation check failed']}
          }
        };
      }
      return {
        passed:true,
        details:{
          verifiedBy:'repair-test',
          evidence:{tests:'passed',commit:'fix-commit-123'}
        }
      };
    }
  });

  const result=await worker.run();
  console.log('DEBUG_WORKER_RESULT',JSON.stringify({result,tasks:orchestrator.listTasks().map(t=>({id:t.id,status:t.status,parentTask:t.parentTask,commitSha:t.commitSha,result:t.result}))},null,2));
  assert.strictEqual(result.complete,true,'Worker did not finish repair cycle');

  const finishedParent=orchestrator.getTask('repair-cycle');
  const fix=orchestrator.getTask('repair-cycle:fix:1');

  assert(fix,'Fix task was not created');
  assert.strictEqual(fix.status,'COMPLETED','Fix task was not completed');
  assert.strictEqual(finishedParent.status,'COMPLETED','Parent was not completed after retest');
  assert.strictEqual(finishedParent.commitSha,'fix-commit-123','Repair commit was not propagated');
  assert.strictEqual(parentVerificationCount,2,'Parent was not verified before and after repair');

  const experiences=store.list({project:'pognali3'});
  assert(experiences.length>=2,'Failure and repair experiences were not retained');
  const failed=experiences.find(e=>e.taskId==='repair-cycle'&&e.verification?.passed===false);
  assert(failed,'Initial failed experience was not retained');
  assert.strictEqual(company.list().length,1,'Only the verified repair lesson should enter company memory');
  assert.strictEqual(project.list('pognali3').length,1,'Verified repair lesson should enter project memory');
  assert.strictEqual(fix.priorExperience?.some(e=>e.taskId==='repair-cycle'),true,'Fix task did not receive prior project experience');

  console.log('worker fix/retest E2E: OK');
}

module.exports={run};

if(require.main===module){
  run().catch(error=>{console.error(error);process.exitCode=1;});
}
