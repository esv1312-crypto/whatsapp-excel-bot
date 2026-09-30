const {TASK_STATUS,markReadyIfPossible,transitionTask}=require('./task_engine');
const {AgentRuntime}=require('./agent_runtime');
const {ToolRouter}=require('./tool_router');
const {HeartbeatManager}=require('./heartbeat');
const {FailureClassifier}=require('./failure_classifier');

class Orchestrator{
  constructor(options={}){
    this.maxSteps=options.maxSteps||30;
    this.steps=0;
    this.eventBus=options.eventBus||null;
    this.stateStore=options.stateStore||null;
    this.tasks=new Map();
    this.specialists=options.specialists||[];
    this.tools=options.tools||{};
    this.toolRouter=options.toolRouter||new ToolRouter({tools:Object.entries(this.tools).map(([name,execute])=>({name,execute})),eventBus:this.eventBus});
    this.agentFactory=options.agentFactory||((opts)=>new AgentRuntime(opts));
    this.verificationController=options.verificationController||null;
    this.activeAgents=new Map();
    this.heartbeat=options.heartbeat||new HeartbeatManager({eventBus:this.eventBus});
    this.failureClassifier=options.failureClassifier||new FailureClassifier();
    this.experienceStore=options.experienceStore||null;
    this.lessonEngine=options.lessonEngine||null;
    this.companyMemory=options.companyMemory||null;
    this.projectMemory=options.projectMemory||null;
    this._loadState();
  }

  _loadState(){
    if(!this.stateStore || typeof this.stateStore.load!=='function') return;
    const state=this.stateStore.load()||{};
    for(const task of Object.values(state.tasks||{})) this.tasks.set(task.id,task);
  }

  _persistState(){
    if(!this.stateStore || typeof this.stateStore.update!=='function') return;
    const tasks=Object.fromEntries(this.tasks);
    this.stateStore.update({tasks,specialists:this.specialists});
  }

  canContinue(){return this.steps<this.maxSteps;}
  step(){
    if(!this.canContinue()) throw new Error('Execution step limit reached');
    return ++this.steps;
  }

  addTask(task){
    this.tasks.set(task.id,task);
    this._emit('task.created',task);
    this.refresh();
    return task;
  }

  addTasks(tasks=[]){tasks.forEach(task=>this.addTask(task));return tasks;}
  getTask(id){return this.tasks.get(id)||null;}
  listTasks(){return [...this.tasks.values()];}

  refresh(){
    for(const task of this.tasks.values()){
      if(markReadyIfPossible(task,Object.fromEntries(this.tasks))) this._emit('task.ready',task);
    }
    return this.listTasks();
  }

  assign(taskId,specialist){
    const task=this._requireTask(taskId);
    if(task.status!==TASK_STATUS.READY) throw new Error('Task is not READY');
    const selected=specialist||this._findSpecialist(task.requiredSkills);
    if(!selected) throw new Error('No specialist matches required skills');
    task.assignee=selected.id;
    transitionTask(task,TASK_STATUS.ASSIGNED);
    this._emit('task.assigned',task);
    return task;
  }

  start(taskId){
    const task=this._requireTask(taskId);
    if(!task.assignee) throw new Error('Task must be assigned before start');
    transitionTask(task,TASK_STATUS.IN_PROGRESS);
    const specialist=this._findSpecialistById(task.assignee);
    const memory=this._findExperience(task);
    const agent=this.agentFactory({specialist,task,tools:this.tools,toolRouter:this.toolRouter,eventBus:this.eventBus,maxSteps:10,memory,heartbeat:this.heartbeat,executionId:`${specialist.id}:${task.id}`});
    if(memory.length) task.priorExperience=memory;
    this.activeAgents.set(task.id,agent);
    agent.start();
    this._emit('task.started',task);
    return agent;
  }

  async runAgent(taskId,actions=[]){
    const agent=this.activeAgents.get(taskId);
    if(!agent) throw new Error('No active agent for task: '+taskId);
    const task=this._requireTask(taskId);
    for(const action of actions){
      this.step();
      const result=await agent.run(action);
      if(result&&result.completed){
        this.implement(taskId,result.result);
        break;
      }
    }
    return task;
  }

  implement(taskId,result){
    const task=this._requireTask(taskId);
    task.result=result;
    transitionTask(task,TASK_STATUS.IMPLEMENTED);
    this._emit('task.implemented',task);
    transitionTask(task,TASK_STATUS.VERIFYING);
    this._emit('task.verifying',task);
    return task;
  }

  async verifyWithEvidence(taskId){
    if(!this.verificationController) throw new Error('VerificationController is not configured');
    const task=this._requireTask(taskId);
    const result=await this.verificationController.verifyTask(task);
    task.verification=result.verification;
    if(!result.evaluation.passed) task.failure=this.failureClassifier.classify({reason:result.evaluation.missing||result.evaluation.missingChecks,source:result.evaluation.source,failureClass:result.evaluation.failureClass});
    this._learn(task,result);
    if(result.verification?.pending){
      task.waitingForVerification=true;
      transitionTask(task,TASK_STATUS.WAITING);
      this._emit('task.waiting',task);
    } else if(result.evaluation.passed){
      task.waitingForVerification=false;
      transitionTask(task,TASK_STATUS.COMPLETED); this._emit('task.completed',task); this.activeAgents.delete(taskId); this.refresh();
    } else {
      task.waitingForVerification=false;
      transitionTask(task,TASK_STATUS.FAIL); this._emit('task.failed',task); this.activeAgents.delete(taskId);
    }
    return result;
  }

  verify(taskId,passed,details=null){
    const task=this._requireTask(taskId);
    task.verification={passed,details,evidence:details?.evidence||null};
    if(!passed) task.failure=this.failureClassifier.classify({reason:details?.reason||details?.missing,source:details?.source,failureClass:details?.failureClass});
    this._learn(task,{verification:task.verification});
    transitionTask(task,passed?TASK_STATUS.COMPLETED:TASK_STATUS.FAIL);
    this._emit(passed?'task.completed':'task.failed',task);
    this.activeAgents.delete(taskId);
    if(passed) this.refresh();
    return task;
  }

  beginFix(taskId){
    const task=this._requireTask(taskId);
    transitionTask(task,TASK_STATUS.FIXING);
    this._emit('task.fixing',task);
    return task;
  }

  retest(taskId){
    const task=this._requireTask(taskId);
    transitionTask(task,TASK_STATUS.RETEST);
    this._emit('task.retest',task);
    transitionTask(task,TASK_STATUS.VERIFYING);
    return task;
  }

  _findExperience(task){
    if(!this.experienceStore || typeof this.experienceStore.findSimilar!=='function') return [];
    return this.experienceStore.findSimilar({project:task.project,objective:task.objective,requiredSkills:task.requiredSkills}).slice(0,5);
  }

  _learn(task,result){
    if(!this.experienceStore || !this.lessonEngine) return null;
    const experience=this.experienceStore.record({
      taskId:task.id, project:task.project, specialist:task.assignee,
      action:task.objective, result:task.result || result.verification || result,
      verification:{...(task.verification || {}),...(result.verification || {})},
      evidence:result.verification?.evidence || task.verification?.evidence || null,
      failure:result.evaluation?.missing || null,
      solution:task.result?.solution || null,
      lesson:task.result?.lesson || task.lesson || result.lesson || null
    });
    const lesson=this.lessonEngine.extract(experience);
    if(!lesson || lesson.verified!==true) return lesson;
    if(this.companyMemory) this.companyMemory.addLesson(lesson);
    if(this.projectMemory && task.project) this.projectMemory.addLesson(task.project,lesson);
    this._emit('lesson.created',task);
    return lesson;
  }

  _findSpecialist(skills=[]){return this.specialists.find(s=>skills.every(skill=>(s.skills||[]).includes(skill)))||null;}
  _findSpecialistById(id){
    const specialist=this.specialists.find(s=>s.id===id);
    if(!specialist) throw new Error('Specialist not found: '+id);
    return specialist;
  }
  _requireTask(taskId){
    const task=this.getTask(taskId);
    if(!task) throw new Error('Task not found: '+taskId);
    return task;
  }
  _emit(type,task){
    this._persistState();
    if(this.eventBus) this.eventBus.emit(type,{taskId:task.id,status:task.status,task});
  }
}
module.exports={Orchestrator};
