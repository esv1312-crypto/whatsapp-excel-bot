class HeartbeatManager {
  constructor(options={}) {
    this.intervalMs=options.intervalMs||5000;
    this.eventBus=options.eventBus||null;
    this.executions=new Map();
    this.timer=null;
  }

  start(execution) {
    if(!execution || !execution.executionId) throw new Error('Execution is required');
    const record={...execution,lastHeartbeatAt:execution.lastHeartbeatAt||new Date().toISOString()};
    this.executions.set(record.executionId,record);
    this._emit('agent.heartbeat',record);
    return record;
  }

  beat(executionId,patch={}) {
    const current=this.executions.get(executionId);
    if(!current) throw new Error('Execution not found: '+executionId);
    const updated={...current,...patch,lastHeartbeatAt:new Date().toISOString()};
    this.executions.set(executionId,updated);
    this._emit('agent.heartbeat',updated);
    return updated;
  }

  stop(executionId,patch={}) {
    const current=this.executions.get(executionId);
    if(!current) return null;
    const updated={...current,...patch,status:patch.status||'STOPPED',finishedAt:patch.finishedAt||new Date().toISOString()};
    this.executions.set(executionId,updated);
    this._emit('agent.heartbeat.stopped',updated);
    return updated;
  }

  get(executionId){return this.executions.get(executionId)||null;}
  list(){return [...this.executions.values()];}

  _emit(type,data){if(this.eventBus)this.eventBus.emit(type,data);}
}
module.exports={HeartbeatManager};
