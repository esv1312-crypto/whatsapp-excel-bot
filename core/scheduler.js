class OfficeScheduler {
  constructor(options={}) {
    if(!options.worker) throw new Error('WorkerEngine is required');
    this.worker=options.worker;
    this.intervalMs=options.intervalMs||1000;
    this.maxCycles=options.maxCycles||100;
    this.cycles=0;
    this.running=false;
    this.timer=null;
    this.onCycle=options.onCycle||null;
  }

  async cycle(){
    if(this.running) return {progressed:false,reason:'ALREADY_RUNNING'};
    if(this.cycles>=this.maxCycles) return {progressed:false,reason:'LIMIT_REACHED'};
    this.running=true;
    try{
      this.cycles++;
      const result=await this.worker.tick();
      if(typeof this.onCycle==='function') await this.onCycle(result,this);
      return result;
    } finally {
      this.running=false;
    }
  }

  async run(){
    const history=[];
    while(this.cycles<this.maxCycles){
      const result=await this.cycle();
      history.push(result);
      if(this.worker && typeof this.worker._isComplete==='function' && this.worker._isComplete()) return {history,cycles:this.cycles,complete:true};
      if(!result.progressed) break;
    }
    return {history,cycles:this.cycles,complete:!!history.at(-1)?.reason&&history.at(-1).reason==='PROJECT_COMPLETE'};
  }

  start(){
    if(this.timer) return false;
    this.timer=setInterval(()=>this.cycle().catch(()=>{}),this.intervalMs);
    return true;
  }

  stop(){
    if(!this.timer) return false;
    clearInterval(this.timer);
    this.timer=null;
    return true;
  }
}
module.exports={OfficeScheduler};
