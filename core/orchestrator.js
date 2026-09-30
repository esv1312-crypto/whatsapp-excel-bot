const {TASK_STATUS,markReadyIfPossible,transitionTask}=require('./task_engine');
const {AgentRuntime}=require('./agent_runtime');
const {ToolRouter}=require('./tool_router');

class Orchestrator{
  constructor(options={}){
    this.maxSteps=options.maxSteps||30;
    this.steps=0;
    this.eventBus=options.eventBus||null;
    this.tasks=new Map();
    this.specialists=options.specialists||[];
    this.tools=options.tools||{};
    this.toolRouter=options.toolRouter||new ToolRouter({tools:Object.entries(this.tools).map(([name,execute])=>({name,execute})),eventBus:this.eventBus});
    this.agentFactory=options.agentFactory||((opts)=>new AgentRuntime(opts));
    this.verificationController=options.verificationController||null;
    this.activeAgents=new Map();
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
    const agent=this.agentFactory({specialist,task,tools:this.tools,toolRouter:this.toolRouter,eventBus:this.eventBus,maxSteps:10});
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
    if(result.evaluation.passed){
      transitionTask(task,TASK_STATUS.COMPLETED); this._emit('task.completed',task); this.activeAgents.delete(taskId); this.refresh();
    } else { transitionTask(task,TASK_STATUS.FAIL); this._emit('task.failed',task); this.activeAgents.delete(taskId); }
    return result;
  }

  verify(taskId,passed,details=null){
    const task=this._requireTask(taskId);
    task.verification={passed,details};
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
    transitionTask(task,TASK_STATUS.READY);
    this._emit('task.ready',task);
    return task;
  }

  retest(taskId){
    const task=this._requireTask(taskId);
    transitionTask(task,TASK_STATUS.RETEST);
    this._emit('task.retest',task);
    transitionTask(task,TASK_STATUS.VERIFYING);
    return task;
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
    if(this.eventBus) this.eventBus.emit(type,{taskId:task.id,status:task.status,task});
  }
}
module.exports={Orchestrator};
