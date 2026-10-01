const office=require('../core');
const {run:runWorkerFixRetest}=require('./worker_fix_retest');
const {run:runRecoveryManager}=require('./recovery_manager');
const {run:runProjectRunnerRestart}=require('./project_runner_restart');
const {run:runMultiStateRecovery}=require('./multi_state_recovery');
const {run:runWatchdogRecovery}=require('./watchdog_recovery');
const {run:runLiveWatchdogRecovery}=require('./live_watchdog_recovery');
const {run:runFullOfficeLifecycle}=require('./full_office_lifecycle');
const {run:runFullE2ELifecycle}=require('./full_e2e_lifecycle');
require('./tool_router_guardrails');
require('./state_store');
require('./event_store');
require('./scheduler');
require('./project_bootstrap');
require('./project_runner');
require('./execution_observability');
require('./ci_controller');
require('./github_evidence');
require('./verification_controller');

(async()=>{
const learningStore=new office.ExperienceStore();
const learningExperience=learningStore.record({taskId:'learning-task',project:'office-simulator',action:'repair CI',result:'CI passed',verification:{passed:true},evidence:{tests:'success'},failure:'test failure',solution:'repair source',lesson:'Run validation before release'});
const lesson=new office.LessonEngine().extract(learningExperience);
if(!lesson || !lesson.verified) throw new Error('Learning lesson was not verified');
if(new office.ProjectMemory().search('office-simulator','repair').length!==0) throw new Error('Project memory should not contain unadded lessons');

const events=[];
const bus=new office.EventBus();
for(const type of ['task.ready','task.completed','agent.started','agent.tool_called','agent.completed','task.verifying','tool.requested','tool.completed']) bus.on(type,event=>events.push(event.type));

const specialists=[
  {id:'product',skills:['product_management']},
  {id:'architect',skills:['architecture']},
  {id:'developer',skills:['software_development']},
  {id:'qa',skills:['testing']}
];

const orchestrator=new office.Orchestrator({eventBus:bus,specialists,tools:{echo:async input=>({echo:input})},maxSteps:20});
const foundation=office.createTask({id:'foundation',objective:'Foundation task',requiredSkills:['software_development']});
const dependent=office.createTask({id:'dependent',objective:'Dependent task',dependencies:['foundation'],requiredSkills:['testing']});
orchestrator.addTasks([dependent,foundation]);

const worker=new office.WorkerEngine({
  orchestrator,
  maxTicks:10,
  actionProvider:async task=>[
    {type:'tool',name:'echo',input:task.id},
    {type:'complete',result:{ok:true,taskId:task.id}}
  ],
  verifier:async task=>({passed:true,details:{verifiedBy:'smoke'}})
});

const learningStore2=new office.ExperienceStore();
const learningLessons2=new office.LessonEngine();
const learningCompany2=new office.CompanyMemory();
const learningProject2=new office.ProjectMemory();
const learningBus2=new office.EventBus();
const learningEvents=[];
learningBus2.on('lesson.created',event=>learningEvents.push(event));
const learningOrchestrator=new office.Orchestrator({
  eventBus:learningBus2,
  specialists:[{id:'developer',skills:['software_development']}],
  tools:{echo:async input=>({echo:input})},
  experienceStore:learningStore2,
  lessonEngine:learningLessons2,
  companyMemory:learningCompany2,
  projectMemory:learningProject2,
  maxSteps:10
});
const learningTask=office.createTask({id:'learning-cycle',project:'learning-project',objective:'Repair validation failure',requiredSkills:['software_development']});
learningOrchestrator.addTask(learningTask);
learningOrchestrator.refresh();
learningOrchestrator.assign(learningTask.id);
learningOrchestrator.start(learningTask.id);
await learningOrchestrator.runAgent(learningTask.id,[{type:'complete',result:{ok:true,lesson:'Validated repair flow after successful verification'}}]);
learningOrchestrator.verify(learningTask.id,true,{passed:true,evidence:{tests:'smoke',commit:'learning'}});
if(learningStore2.list().length!==1) throw new Error('Learning cycle did not record experience');
if(learningCompany2.list().length!==1) throw new Error('Verified lesson did not reach company memory');
if(learningProject2.list('learning-project').length!==1) throw new Error('Verified lesson did not reach project memory');
if(!learningEvents.length) throw new Error('Learning event was not emitted');

const result=await worker.run();
if(!result.complete) throw new Error('Worker did not complete the project');
if(result.ticks!==3) throw new Error('Worker should use two execution ticks plus one completion check');
if(orchestrator.getTask('foundation').status!=='COMPLETED') throw new Error('Foundation not completed');
if(orchestrator.getTask('dependent').status!=='COMPLETED') throw new Error('Dependent not completed');
for(const type of ['agent.started','agent.tool_called','agent.completed','task.verifying','task.completed','tool.requested','tool.completed']) if(!events.includes(type)) throw new Error('Missing event: '+type);

const routed=orchestrator.toolRouter.canUse('echo',{allowedTools:['echo']});
if(!routed.allowed) throw new Error('ToolRouter did not allow permitted tool');
const denied=orchestrator.toolRouter.canUse('echo',{allowedTools:['other']});
if(denied.allowed) throw new Error('ToolRouter allowed forbidden tool');

const fakeCalls=[];
const gateway=new office.GitHubGateway({
  fetch:async path=>{fakeCalls.push(['fetch',path]);return {ok:true,path};},
  updateFile:async input=>{fakeCalls.push(['update',input.path]);return {commit_sha:'test-update'};},
  createFile:async input=>{fakeCalls.push(['create',input.path]);return {commit_sha:'test-create'};}
});
const githubRouter=new office.ToolRouter({tools:gateway.tools(),eventBus:bus});
const read=await githubRouter.execute('github.read_file',{repository:'owner/repo',path:'README.md'},{allowedTools:['github.read_file']});
if(!read.ok||fakeCalls[0][1]!=='/repos/owner/repo/contents/README.md') throw new Error('GitHub Reader adapter failed');
const write=await githubRouter.execute('github.write_file',{repository:'owner/repo',path:'README.md',content:'# test',sha:'blob-sha'},{allowedTools:['github.write_file']});
if(write.commit_sha!=='test-update') throw new Error('GitHub Writer adapter failed');
if(githubRouter.canUse('github.write_file',{allowedTools:['github.read_file']}).allowed) throw new Error('GitHub Writer permission check failed');

const plan=office.planAndAssign('Build the AI-OFFICE simulator',{project:'office-simulator',specialists});
if(plan.tasks.length!==4) throw new Error('Chief did not create the expected plan');
if(!plan.team.complete) throw new Error('Chief could not assemble the required team');
if(plan.readyTasks.length!==1||plan.readyTasks[0]!=='product') throw new Error('Initial ready task is incorrect');
await runWorkerFixRetest();
await runRecoveryManager();
await runProjectRunnerRestart();
await runMultiStateRecovery();
await runWatchdogRecovery();
await runLiveWatchdogRecovery();
await runFullOfficeLifecycle();
await runFullE2ELifecycle();

const memory=new office.CompanyMemory();
memory.addLesson(lesson);
if(memory.search('validation').length!==1) throw new Error('Company memory retrieval failed');
console.log('AI-OFFICE smoke test: PASS');
})().catch(error=>{console.error(error);process.exitCode=1;});
