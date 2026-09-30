class CIController {
  constructor(options = {}) {
    for (const name of ['trigger','getRun']) {
      if (typeof options[name] !== 'function') throw new Error(`CIController requires ${name}`);
    }
    this.trigger=options.trigger;
    this.getRun=options.getRun;
    this.sleep=options.sleep || (ms=>new Promise(resolve=>setTimeout(resolve,ms)));
    this.maxPolls=options.maxPolls || 30;
    this.pollIntervalMs=options.pollIntervalMs || 1000;
  }

  async run(input = {}) {
    if (!input.repository || !input.commitSha) throw new Error('repository and commitSha are required');
    const started=await this.trigger(input);
    const runId=started.runId || started.id;
    if (!runId) throw new Error('CI trigger did not return runId');

    const history=[];
    for(let attempt=0; attempt<this.maxPolls; attempt++){
      const run=await this.getRun({repository:input.repository,runId});
      history.push({status:run.status,conclusion:run.conclusion});
      if(run.status === 'completed' || run.conclusion) {
        return {runId,status:run.status,conclusion:run.conclusion,run,history};
      }
      if(attempt < this.maxPolls-1) await this.sleep(this.pollIntervalMs);
    }
    return {runId,status:'timeout',conclusion:null,run:null,history};
  }
}
module.exports={CIController};
