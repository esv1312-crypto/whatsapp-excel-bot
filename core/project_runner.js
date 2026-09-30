const {createProject,bootstrapProject}=require('./project_engine');
const {Orchestrator}=require('./orchestrator');
const {WorkerEngine}=require('./worker_engine');
const {OfficeScheduler}=require('./scheduler');
const {Watchdog}=require('./watchdog');

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
  }

  async run(input={}) {
    if(!input.goal) throw new Error('Project goal is required');
    this._bindEventStore();

    const project=input.project||{id:input.projectId,name:input.projectName||input.goal,repository:input.repository,branch:input.branch||'main'};
    const boot=bootstrapProject(project,{goal:input.goal,blueprint:input.blueprint,specialists:this.specialists});

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
      plan:boot.plan,
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
