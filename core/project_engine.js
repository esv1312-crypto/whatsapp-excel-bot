const {plan}=require('./chief_of_staff');
const {Orchestrator}=require('./orchestrator');
const {WorkerEngine}=require('./worker_engine');
const {OfficeScheduler}=require('./scheduler');

function createProject(input={}){
  if(!input.name) throw new Error('Project name is required');
  return {
    id:input.id||('project_'+Date.now()),
    name:input.name,
    status:'ACTIVE',
    repository:input.repository||null,
    branch:input.branch||'main',
    knowledgeScope:[],
    tasks:[],
    decisions:[],
    createdAt:new Date().toISOString()
  };
}

function bootstrapProject(input={},options={}){
  const project=createProject(input);
  if(!options.goal) throw new Error('Project goal is required');
  const blueprint=options.blueprint||null;
  const planned=plan(options.goal,{project:project.id,blueprint,specialists:options.specialists||[]});
  project.tasks=planned.tasks.map(task=>task.id);
  return {project,plan:planned};
}

async function runProject(input={},options={}){
  const boot=bootstrapProject(input,options);
  const orchestrator=options.orchestrator||new Orchestrator({
    stateStore:options.stateStore||null,
    eventBus:options.eventBus||null,
    specialists:options.specialists||[],
    tools:options.tools||{},
    toolRouter:options.toolRouter,
    agentFactory:options.agentFactory,
    verificationController:options.verificationController,
    experienceStore:options.experienceStore,
    lessonEngine:options.lessonEngine,
    companyMemory:options.companyMemory,
    projectMemory:options.projectMemory,
    maxSteps:options.maxSteps||100
  });
  orchestrator.addTasks(boot.plan.tasks);
  const worker=options.worker||new WorkerEngine({orchestrator,maxTicks:options.maxTicks||50,actionProvider:options.actionProvider,verifier:options.verifier,maxFixesPerTask:options.maxFixesPerTask||3});
  const scheduler=options.scheduler||new OfficeScheduler({worker,maxCycles:options.maxCycles||100,intervalMs:options.intervalMs,onCycle:options.onCycle});
  const execution=await scheduler.run();
  const complete=execution.complete||boot.plan.tasks.every(task=>orchestrator.getTask(task.id)?.status==='COMPLETED');
  boot.project.status=complete?'COMPLETED':'ACTIVE';
  return {project:boot.project,plan:boot.plan,orchestrator,worker,scheduler,execution,complete};
}

module.exports={createProject,bootstrapProject,runProject};
