class VerificationController {
  constructor(options = {}) {
    if (!options.supervisor || typeof options.supervisor.evaluate !== 'function') throw new Error('VerificationController requires supervisor');
    if (!options.evidenceCollector || typeof options.evidenceCollector.collect !== 'function') throw new Error('VerificationController requires evidenceCollector');
    this.policy = options.policy || null;
    this.interpreter = options.interpreter || null;
    this.supervisor = options.supervisor;
    this.evidenceCollector = options.evidenceCollector;
  }
  async verifyTask(task = {}) {
    if (!task.id || !task.project || !task.commitSha) throw new Error('task.id, task.project and task.commitSha are required');
    const evidence = await this.evidenceCollector.collect({ repository: task.project, commitSha: task.commitSha });
    const verification = {
      passed: evidence.workflowRuns.length > 0
        ? evidence.workflowRuns.every(run => run.conclusion === 'success')
        : (evidence.status && evidence.status.statuses.length > 0
          ? evidence.status.statuses.every(status => status.state === 'success')
          : false),
      evidence
    };
    const evaluation = this.supervisor.evaluate({
      ...task,
      result: task.result || evidence.commit,
      verification
    });
    return { taskId: task.id, verification, evaluation, shouldFix: this.supervisor.shouldFix(evaluation) };
  }
}
module.exports={VerificationController};
