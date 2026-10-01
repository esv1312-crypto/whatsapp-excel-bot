const {ProjectRunner}=require('./project_runner');
class OfficeRuntime {
  constructor(options={}) { this.runner=options.runner||new ProjectRunner(options); }
  async launch(input={}) {
    if(!input || typeof input!=='object') throw new Error('Launch input is required');
    if(!input.goal || typeof input.goal!=='string' || !input.goal.trim()) throw new Error('Launch goal is required');
    const startedAt=new Date().toISOString();
    const result=await this.runner.run({...input,goal:input.goal.trim()});
    return {status:result.status,goal:input.goal.trim(),project:result.project,startedAt,execution:result.execution,recovery:result.recovery,orchestrator:result.orchestrator,worker:result.worker};
  }
}
module.exports={OfficeRuntime};
