const {createProject,bootstrapProject}=require('./project_engine');
const {Orchestrator}=require('./orchestrator');
const {WorkerEngine}=require('./worker_engine');
const {OfficeScheduler}=require('./scheduler');

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
  }

  async run(input={}) {
    if(!input.goal) throw new Error('Project goal is required');

    const boot=bootstrapProject(
      input.project||{id:input.projectId,name:input.projectName||input.goal,repository:input.repository,branch:input.branch||'main'},
      {goal:input.goal,blueprint:input.blueprint,specialists:this.specialists}
    );

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
      maxSteps:this.maxSteps
    });

    for(const task of boot.plan.tasks) orchestrator.addTask(task);

    const worker=new WorkerEngine({
      orchestrator,
      actionProvider:this.actionProvider,
      verifier:this.verifier,
      maxTicks:this.maxTicks,
      maxFixesPerTask:this.options.maxFixesPerTask||3
    });

    const scheduler=new OfficeScheduler({
      worker,
      maxCycles:this.options.maxCycles||this.maxTicks,
      intervalMs:this.options.intervalMs,
      onCycle:this.options.onCycle
    });

    const execution=await scheduler.run();
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
}

module.exports={ProjectRunner};
