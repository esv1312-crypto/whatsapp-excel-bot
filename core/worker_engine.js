class WorkerEngine {
  constructor(options={}) {
    if(!options.orchestrator) throw new Error('Orchestrator is required');
    this.orchestrator=options.orchestrator;
    this.maxTicks=options.maxTicks||20;
    this.ticks=0;
    this.actionProvider=options.actionProvider||(()=>[{type:'complete',result:{ok:true}}]);
    this.verifier=options.verifier||null;
    this.maxFixesPerTask=options.maxFixesPerTask||3;
    this.fixCounts=new Map();
    this.experienceStore=options.experienceStore||this.orchestrator.experienceStore||null;
    this.lessonEngine=options.lessonEngine||this.orchestrator.lessonEngine||null;
    // Recovery after process restart is owned by RecoveryManager.
    // WorkerEngine must not mutate persisted task state during construction.
    this.resumeOnStart=options.resumeOnStart===true;
    this.watchdog=options.watchdog||null;
  }

  canContinue(){return this.ticks<this.maxTicks&&this.orchestrator.canContinue();}

  async tick(){
    if(!this.canContinue()) return {progressed:false,reason:'LIMIT_REACHED'};
    this.ticks++;
    this.orchestrator.refresh();
    if(this.watchdog){
      for(const agent of this.orchestrator.heartbeat.list()) {
        const inspection=this.watchdog.inspect(agent);
        if(inspection.status==='STALLED') await this.watchdog.recover(agent);
      }
    }
    const pendingVerification=this.orchestrator.listTasks().find(item=>item.status==='VERIFYING' || item.status==='RETEST' || (item.status==='WAITING' && item.waitingForVerification));
    if(pendingVerification){
      if(pendingVerification.status==='WAITING' || pendingVerification.status==='RETEST') this.orchestrator.retest(pendingVerification.id);
      const verification=await this._verifyTask(pendingVerification);
      return {progressed:true,taskId:pendingVerification.id,status:this.orchestrator.getTask(pendingVerification.id).status,verification};
    }
    const task=this.orchestrator.listTasks().find(item=>item.status==='READY');
    if(!task) return {progressed:false,reason:this._isComplete()?'PROJECT_COMPLETE':'WAITING_FOR_READY_TASK'};
    this.orchestrator.assign(task.id);
    this.orchestrator.start(task.id);
    const actions=await this.actionProvider(task,this.orchestrator);
    await this.orchestrator.runAgent(task.id,actions);
    const current=this.orchestrator.getTask(task.id);
    if(current.status==='VERIFYING') await this._verifyTask(current);
    const finalTask=this.orchestrator.getTask(task.id);
    if(finalTask && finalTask.parentTask) this._completeRepair(finalTask);
    return {progressed:true,taskId:task.id,status:this.orchestrator.getTask(task.id).status};
  }

  async run(){
    const history=[];
    while(this.canContinue()){
      const result=await this.tick();
      history.push(result);
      if(!result.progressed) break;
    }
    return {history,complete:this._isComplete(),ticks:this.ticks};
  }

  async _verifyTask(task){
    if(typeof this.orchestrator.verifyWithEvidence === 'function' && this.orchestrator.verificationController){
      const verification=await this.orchestrator.verifyWithEvidence(task.id);
      if(!verification.verification?.pending && !verification.evaluation.passed) this._prepareFix(task,verification);
      return verification;
    }
    if(this.verifier){
      const verification=await this.verifier(task,this.orchestrator);
      this.orchestrator.verify(task.id,verification.passed,verification.details);
      if(!verification.pending && !verification.passed) this._prepareFix(task,{evaluation:verification});
      return verification;
    }
    return null;
  }

  _completeRepair(fixTask){
    const parent=this.orchestrator.getTask(fixTask.parentTask);
    if(!parent || parent.status!=='FIXING') return;
    if(fixTask.result && fixTask.result.commitSha) parent.commitSha=fixTask.result.commitSha;
    this.orchestrator.retest(parent.id);
  }

  _prepareFix(task, verification){
    const count=this.fixCounts.get(task.id)||0;
    if(count>=this.maxFixesPerTask) return null;
    this.fixCounts.set(task.id,count+1);
    if(typeof this.orchestrator.beginFix==='function') this.orchestrator.beginFix(task.id);
    if(typeof this.orchestrator.addTask==='function') {
      const evaluation=verification.evaluation||{};
      const fix={id:`${task.id}:fix:${count+1}`,project:task.project,parentTask:task.id,objective:`Fix verification failures for task ${task.id}`,requiredSkills:task.requiredSkills||[],dependencies:[],status:'CREATED',result:null,verification:null,waitingForVerification:false,history:[{status:'CREATED',at:new Date().toISOString()}],reason:evaluation.missing||evaluation.missingChecks||[],verification:evaluation};
      this.orchestrator.addTask(fix);
      if(this.experienceStore){
        if(typeof this.experienceStore.findSimilar==='function') fix.priorExperience=this.experienceStore.findSimilar({project:task.project,objective:fix.objective,requiredSkills:fix.requiredSkills}).slice(0,5);
        if((!fix.priorExperience||fix.priorExperience.length===0) && typeof this.experienceStore.list==='function') fix.priorExperience=this.experienceStore.list({project:task.project}).slice(-5);
      }
      return fix;
    }
    return null;
  }

  _isComplete(){
    const tasks=this.orchestrator.listTasks();
    return tasks.length>0&&tasks.every(task=>task.status==='COMPLETED');
  }
}
module.exports={WorkerEngine};
