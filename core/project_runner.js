const {createProject,bootstrapProject}=require('./project_engine');
const {Orchestrator}=require('./orchestrator');
const {WorkerEngine}=require('./worker_engine');
const {OfficeScheduler}=require('./scheduler');
const {Watchdog}=require('./watchdog');
const {ProjectDiscovery}=require('./project_discovery');
const {ProjectContextBuilder}=require('./project_context');
const {analyzeProjectContext,planFromContext}=require('./project_state');
const {RecoveryManager}=require('./recovery_manager');

class ProjectRunner {
  constructor(options={}) {
    this.options=options;
    this.specialists=options.specialists||[];
    this.tools=options.tools||{};
    this.stateStore=options.stateStore||null;
    this.eventBus=options.eventBus||null;
    this.eventStore=options.eventStore||null;
    this.experienceStore=options.experienceStore||null;
    this.lessonEngine=options.lessonEngine||null;
    this.companyMemory=options.companyMemory||null;
    this.projectMemory=options.projectMemory||null;
    this.verificationController=options.verificationController||null;
    this.verifier=options.verifier||null;
    this.actionProvider=options.actionProvider;
    this.maxTicks=options.maxTicks||50;
    this.maxSteps=options.maxSteps||100;
    this.watchdog=options.watchdog||null;
    this._eventStoreBound=false;
    this.discovery=options.discovery||null;
    this.contextBuilder=options.contextBuilder||null;
  }

  async run(input={}) {
    if(!input.goal) throw new Error('Project goal is required');
    this._bindEventStore();

    const project=input.project||{id:input.projectId,name:input.projectName||input.goal,repository:input.repository,branch:input.branch||'main'};
    let reconnaissance=null;
    let projectContext=null;
    let contextAnalysis=null;
    let contextPlan=null;
    if(project.repository && this.options.githubReader){
      const discovery=this.discovery||new ProjectDiscovery({githubReader:this.options.githubReader});
      reconnaissance=await discovery.inspect(project);
      const builder=this.contextBuilder||new ProjectContextBuilder({fetchFile:this.options.githubReader.readFile.bind(this.options.githubReader)});
      projectContext=await builder.build(project,reconnaissance);
      contextAnalysis=analyzeProjectContext(projectContext);
      contextPlan=planFromContext(projectContext,{goal:input.goal});
    }
    const existingState=this.stateStore&&typeof this.stateStore.load==='function'?this.stateStore.load():null;
    const existingProject=existingState&&existingState.projects?existingState.projects[project.id]:null;
    const persistedTaskMap=existingState&&existingState.tasks?existingState.tasks:{};
    const boot=bootstrapProject(project,{goal:input.goal,blueprint:input.blueprint,specialists:this.specialists});
    if(existingProject){
      boot.project={...boot.project,...existingProject,status:existingProject.status||'ACTIVE'};
      const existingTaskIds=Array.isArray(existingProject.tasks)?existingProject.tasks:[];
      const persistedTasks=existingTaskIds.map(id=>persistedTaskMap[id]).filter(Boolean);
      if(persistedTasks.length) boot.plan.tasks=persistedTasks;
      boot.project.tasks=boot.plan.tasks.map(task=>task.id);
    }

    const orchestrator=new Orchestrator({
      eventBus:this.eventBus,
      stateStore:this.stateStore,
      specialists:this.specialists,
      tools:this.tools,
      verificationController:this.verificationController,
      experienceStore:this.experienceStore,
      lessonEngine:this.lessonEngine,
      companyMemory:this.companyMemory,
      projectMemory:this.projectMemory,
      maxSteps:this.maxSteps,
      heartbeat:this.options.heartbeat,
      failureClassifier:this.options.failureClassifier,
      toolRouter:this.options.toolRouter
    });

    for(const task of boot.plan.tasks) orchestrator.addTask(task);

    const watchdog=this.watchdog||new Watchdog({eventBus:this.eventBus,timeoutMs:this.options.heartbeatTimeoutMs||30000});

    const worker=new WorkerEngine({
      orchestrator,
      actionProvider:this.actionProvider,
      verifier:this.verifier,
      maxTicks:this.maxTicks,
      maxFixesPerTask:this.options.maxFixesPerTask||3,
      watchdog
    });

    const recoveryManager=this.options.recoveryManager||new RecoveryManager({orchestrator,stateStore:this.stateStore,eventBus:this.eventBus});
    const recovery=recoveryManager.recover();

    const scheduler=new OfficeScheduler({
      worker,
      maxCycles:this.options.maxCycles||this.maxTicks,
      intervalMs:this.options.intervalMs,
      onCycle:this.options.onCycle
    });

    const execution=await scheduler.run();
    if(this.stateStore && typeof this.stateStore.update==='function') {
      this.stateStore.update({projects:{[boot.project.id]:boot.project}});
    }
    return {
      project:boot.project,
      reconnaissance,
      projectContext,
      contextAnalysis,
      contextPlan,
      plan:boot.plan,
      recovery,
      execution,
      orchestrator,
      worker,
      scheduler,
      status:execution.complete?'COMPLETED':'INCOMPLETE'
    };
  }
  _bindEventStore(){
    if(this._eventStoreBound || !this.eventBus || !this.eventStore || typeof this.eventBus.on!=='function' || typeof this.eventStore.append!=='function') return;
    const types=['task.created','task.ready','task.assigned','task.started','task.implemented','task.verifying','task.completed','task.failed','task.fixing','task.retest','agent.started','agent.completed','agent.heartbeat','agent.heartbeat.stopped','tool.requested','tool.completed','tool.failed','tool.denied','approval.requested','watchdog.stalled','watchdog.recovered','watchdog.escalated','lesson.created'];
    for(const type of types) this.eventBus.on(type,event=>this.eventStore.append({...event,type,project:event.project||event.task?.project||null}));
    if(typeof this.eventStore.load==='function') this.eventStore.load();
    this._eventStoreBound=true;
  }
}

module.exports={ProjectRunner};
