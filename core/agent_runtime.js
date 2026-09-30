class AgentRuntime {
  constructor(options = {}) {
    if (!options.specialist) throw new Error('Specialist is required');
    if (!options.task) throw new Error('Task is required');
    this.specialist = options.specialist;
    this.task = options.task;
    this.tools = options.tools || {};
    this.eventBus = options.eventBus || null;
    this.maxSteps = options.maxSteps || 10;
    this.steps = 0;
    this.state = 'IDLE';
  }

  context() {
    return {
      specialist: this.specialist,
      task: this.task,
      allowedTools: Object.keys(this.tools),
      expectedOutput: this.task.objective
    };
  }

  start() {
    this.state = 'RUNNING';
    this._emit('agent.started');
    return this.context();
  }

  run(action) {
    if (this.state !== 'RUNNING') throw new Error('Agent is not running');
    if (this.steps >= this.maxSteps) throw new Error('Agent step limit reached');
    if (!action || typeof action !== 'object') throw new Error('Action is required');

    this.steps++;

    if (action.type === 'tool') {
      return this.callTool(action.name, action.input);
    }

    if (action.type === 'complete') {
      this.state = 'COMPLETED';
      this._emit('agent.completed', { result: action.result });
      return { completed: true, result: action.result };
    }

    throw new Error('Unknown agent action: ' + action.type);
  }

  callTool(name, input) {
    const tool = this.tools[name];
    if (typeof tool !== 'function') throw new Error('Tool not allowed: ' + name);
    this._emit('agent.tool_called', { name, input });
    const result = tool(input);
    this._emit('tool.completed', { name, result });
    return result;
  }

  _emit(type, data = {}) {
    if (this.eventBus) {
      this.eventBus.emit(type, {
        specialistId: this.specialist.id,
        taskId: this.task.id,
        ...data
      });
    }
  }
}

module.exports = { AgentRuntime };
