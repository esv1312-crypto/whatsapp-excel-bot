const {TASK_STATUS, transitionTask, dependenciesReady}=require('./task_engine');

const RECOVERABLE_INTERRUPTED = new Set([
  TASK_STATUS.ASSIGNED,
  TASK_STATUS.IN_PROGRESS
]);

class RecoveryManager {
  constructor(options={}) {
    this.orchestrator=options.orchestrator||null;
    this.stateStore=options.stateStore||this.orchestrator?.stateStore||null;
    this.eventBus=options.eventBus||this.orchestrator?.eventBus||null;
  }

  recoverExecution(execution={}) {
    if(!execution.taskId) return {recovered:false,reason:'NO_TASK_ID'};
    const task=this.orchestrator.getTask(execution.taskId);
    if(!task) return {recovered:false,reason:'TASK_NOT_FOUND',taskId:execution.taskId};

    if(task.status!==TASK_STATUS.IN_PROGRESS && task.status!==TASK_STATUS.ASSIGNED) {
      return {recovered:false,reason:'TASK_NOT_INTERRUPTED',taskId:task.id,status:task.status};
    }

    const previousStatus=task.status;
    task.status=TASK_STATUS.READY;
    task.assignee=null;
    task.history=Array.isArray(task.history)?task.history:[];
    task.history.push({
      status:TASK_STATUS.READY,
      at:new Date().toISOString(),
      reason:'RECOVERY_AFTER_HEARTBEAT_TIMEOUT',
      previousStatus,
      executionId:execution.executionId||null
    });
    this._emit('task.recovered',{
      taskId:task.id,
      previousStatus,
      status:task.status,
      reason:'RECOVERY_AFTER_HEARTBEAT_TIMEOUT',
      executionId:execution.executionId||null
    });
    this.orchestrator.refresh();
    this._persist();
    return {recovered:true,taskId:task.id,previousStatus,status:task.status,reason:'RECOVERY_AFTER_HEARTBEAT_TIMEOUT'};
  }

  recover() {
    if(!this.orchestrator) throw new Error('Orchestrator is required');

    const tasks=this.orchestrator.listTasks();
    const byId=Object.fromEntries(tasks.map(task=>[task.id,task]));
    const recovered=[];
    const waiting=[];
    const unchanged=[];

    for(const task of tasks) {
      if(RECOVERABLE_INTERRUPTED.has(task.status)) {
        const previousStatus=task.status;
        task.status=TASK_STATUS.READY;
        task.history=Array.isArray(task.history)?task.history:[];
        task.history.push({
          status:TASK_STATUS.READY,
          at:new Date().toISOString(),
          reason:'RECOVERY_AFTER_RESTART',
          previousStatus
        });
        recovered.push({taskId:task.id,previousStatus,status:task.status});
        this._emit('task.recovered',{
          taskId:task.id,
          previousStatus,
          status:task.status,
          reason:'RECOVERY_AFTER_RESTART'
        });
        continue;
      }

      if(task.status===TASK_STATUS.WAITING) {
        if(task.waitingForVerification) {
          waiting.push(task.id);
          continue;
        }
        if(dependenciesReady(task,byId)) {
          transitionTask(task,TASK_STATUS.READY);
          recovered.push({taskId:task.id,previousStatus:TASK_STATUS.WAITING,status:TASK_STATUS.READY,reason:'DEPENDENCIES_ALREADY_COMPLETE'});
          this._emit('task.recovered',{
            taskId:task.id,
            previousStatus:TASK_STATUS.WAITING,
            status:TASK_STATUS.READY,
            reason:'DEPENDENCIES_ALREADY_COMPLETE'
          });
        } else {
          waiting.push(task.id);
        }
        continue;
      }

      unchanged.push(task.id);
    }

    this.orchestrator.refresh();
    this._persist();

    return {
      recovered,
      waiting,
      unchanged,
      resumedTaskIds:recovered.filter(item=>item.status===TASK_STATUS.READY).map(item=>item.taskId)
    };
  }

  _persist() {
    if(this.stateStore && typeof this.stateStore.update==='function') {
      this.stateStore.update({
        tasks:Object.fromEntries(this.orchestrator.listTasks().map(task=>[task.id,task]))
      });
    }
  }

  _emit(type,payload) {
    if(this.eventBus && typeof this.eventBus.emit==='function') this.eventBus.emit(type,payload);
  }
}

module.exports={RecoveryManager,RECOVERABLE_INTERRUPTED};
