class AgentRuntime {
  constructor(options = {}) {
    if (!options.specialist) throw new Error('Specialist is required');
    if (!options.task) throw new Error('Task is required');
    this.specialist = options.specialist;
    this.task = options.task;
    this.toolRouter = options.toolRouter || null;
    this.tools = options.tools || {};
    this.eventBus = options.eventBus || null;
    this.maxSteps = options.maxSteps || 10;
    this.steps = 0;
    this.state = 'IDLE';
    this.heartbeat=options.heartbeat||null;
    this.executionId=options.executionId||`${this.specialist.id}:${this.task.id}`;
    this.currentAction=null;
  }

  context() {
    return {
      specialist: this.specialist,
      task: this.task,
      allowedTools: this.specialist.allowedTools || Object.keys(this.tools),
      expectedOutput: this.task.objective
    };
  }

  start() {
    this.state = 'RUNNING';
    this._emit('agent.started',{executionId:this.executionId});
    if(this.heartbeat) this.heartbeat.start({executionId:this.executionId,agentId:this.specialist.id,taskId:this.task.id,status:'RUNNING',currentStep:0});
    return this.context();
  }

  async run(action) {
    if (this.state !== 'RUNNING') throw new Error('Agent is not running');
    if (this.steps >= this.maxSteps) throw new Error('Agent step limit reached');
    if (!action || typeof action !== 'object') throw new Error('Action is required');
    this.steps++;
    this.currentAction=action;
    if(this.heartbeat) this.heartbeat.beat(this.executionId,{status:'RUNNING',currentStep:this.steps,currentAction:action.type+(action.name?`:${action.name}`:'')});
    if (action.type === 'tool') return this.callTool(action.name, action.input);
    if (action.type === 'complete') {
      this.state = 'COMPLETED';
      this._emit('agent.completed', {result:action.result,executionId:this.executionId});
      if(this.heartbeat) this.heartbeat.stop(this.executionId,{status:'COMPLETED',result:action.result});
      return {completed:true,result:action.result};
    }
    throw new Error('Unknown agent action: '+action.type);
  }

  async callTool(name,input) {
    this._emit('agent.tool_called',{name,input});
    if (this.toolRouter) return this.toolRouter.execute(name,input,this.context());
    const tool=this.tools[name];
    if (typeof tool!=='function') throw new Error('Tool not allowed: '+name);
    const result=await tool(input);
    this._emit('tool.completed',{name,result});
    return result;
  }

  _emit(type,data={}){
    if(this.eventBus) this.eventBus.emit(type,{specialistId:this.specialist.id,taskId:this.task.id,...data});
  }
}
module.exports={AgentRuntime};
