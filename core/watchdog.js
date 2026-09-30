class Watchdog {
  constructor(options={}) {
    this.timeoutMs=options.timeoutMs||30000;
    this.eventBus=options.eventBus||null;
    this.heartbeat=options.heartbeat||null;
    this.onRecover=options.onRecover||null;
    this.onEscalate=options.onEscalate||null;
  }

  inspect(execution) {
    if(!execution || !execution.executionId) return {status:'UNKNOWN',reason:'INVALID_EXECUTION'};
    const last=execution.lastHeartbeatAt ? Date.parse(execution.lastHeartbeatAt) : 0;
    const age=last ? Date.now()-last : Infinity;
    if(execution.status==='COMPLETED'||execution.status==='STOPPED') return {status:'HEALTHY',ageMs:Math.max(0,age)};
    if(age<=this.timeoutMs) return {status:'HEALTHY',ageMs:age};
    const alert={executionId:execution.executionId,taskId:execution.taskId,ageMs:age,reason:'HEARTBEAT_TIMEOUT'};
    this._emit('watchdog.stalled',alert);
    return {status:'STALLED',...alert};
  }

  async recover(execution) {
    const inspection=this.inspect(execution);
    if(inspection.status!=='STALLED') return inspection;
    if(typeof this.onRecover==='function') {
      const result=await this.onRecover(execution,inspection);
      this._emit('watchdog.recovered',{...inspection,result});
      return {status:'RECOVERED',...inspection,result};
    }
    this._emit('watchdog.escalated',inspection);
    if(typeof this.onEscalate==='function') await this.onEscalate(execution,inspection);
    return {status:'ESCALATED',...inspection};
  }

  _emit(type,data){if(this.eventBus)this.eventBus.emit(type,data);}
}
module.exports={Watchdog};
