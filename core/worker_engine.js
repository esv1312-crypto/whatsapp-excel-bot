class WorkerEngine {
  constructor(options = {}) {
    if (!options.orchestrator) throw new Error('Orchestrator is required');
    this.orchestrator = options.orchestrator;
    this.maxTicks = options.maxTicks || 20;
    this.ticks = 0;
    this.actionProvider = options.actionProvider || (() => [{ type: 'complete', result: { ok: true } }]);
    this.verifier = options.verifier || (() => ({ passed: true, details: { automatic: true } }));
  }

  canContinue() {
    return this.ticks < this.maxTicks && this.orchestrator.canContinue();
  }

  tick() {
    if (!this.canContinue()) return { progressed: false, reason: 'LIMIT_REACHED' };
    this.ticks++;

    this.orchestrator.refresh();

    const task = this.orchestrator.listTasks().find(item => item.status === 'READY');
    if (!task) {
      return {
        progressed: false,
        reason: this._isComplete() ? 'PROJECT_COMPLETE' : 'WAITING_FOR_READY_TASK'
      };
    }

    this.orchestrator.assign(task.id);
    this.orchestrator.start(task.id);

    const actions = this.actionProvider(task, this.orchestrator);
    this.orchestrator.runAgent(task.id, actions);

    const current = this.orchestrator.getTask(task.id);
    if (current.status === 'VERIFYING') {
      const verification = this.verifier(current, this.orchestrator);
      this.orchestrator.verify(current.id, verification.passed, verification.details);
    }

    return { progressed: true, taskId: task.id, status: this.orchestrator.getTask(task.id).status };
  }

  run() {
    const history = [];
    while (this.canContinue()) {
      const result = this.tick();
      history.push(result);
      if (!result.progressed) break;
    }
    return {
      history,
      complete: this._isComplete(),
      ticks: this.ticks
    };
  }

  _isComplete() {
    const tasks = this.orchestrator.listTasks();
    return tasks.length > 0 && tasks.every(task => task.status === 'COMPLETED');
  }
}

module.exports = { WorkerEngine };
