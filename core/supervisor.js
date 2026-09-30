class ProjectSupervisor {
  constructor(options = {}) { this.requireEvidence = options.requireEvidence !== false; }
  evaluate(task = {}) {
    const evidence = task.verification && task.verification.evidence ? task.verification.evidence : {};
    const checks = {
      result: task.result !== null && task.result !== undefined && task.result !== '',
      verification: !!(task.verification && task.verification.passed === true),
      evidence: !this.requireEvidence || this.hasEvidence(evidence)
    };
    const passed = Object.values(checks).every(Boolean);
    return { passed, checks, missing: Object.keys(checks).filter(k => !checks[k]), evidence };
  }
  hasEvidence(evidence) {
    if (!evidence || typeof evidence !== 'object') return false;
    return ['commit','tests','build','qa'].some(key => {
      const value = evidence[key];
      return value !== undefined && value !== null && value !== '' && (!Array.isArray(value) || value.length > 0);
    });
  }
  shouldFix(evaluation) { return !evaluation || evaluation.passed !== true; }
  createFixTask(task, evaluation) {
    if (!task.id) throw new Error('Task id is required');
    return { id: task.id + ':fix', parentTask: task.id, project: task.project, objective: 'Fix verification failures for task ' + task.id, requiredSkills: task.requiredSkills || [], reason: evaluation.missing || [] };
  }
}
module.exports={ProjectSupervisor};
