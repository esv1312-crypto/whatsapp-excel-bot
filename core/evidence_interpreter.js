class EvidenceInterpreter {
  interpret(evidence = {}) {
    const runs = evidence.runs || [];
    const completedRuns = runs.filter(run => run.status === 'completed' || (!run.status && run.conclusion));
    const pending = runs.some(run => run.status && run.status !== 'completed');
    const jobs = runs.flatMap(run => run.jobs || []);
    const steps = runs.flatMap(run => run.steps || []).flatMap(group => group.steps || []);
    const artifacts = runs.flatMap(run => run.artifacts || []);
    const checks = {
      commit: !!evidence.commit,
      ci: completedRuns.length > 0 ? completedRuns.every(run => run.conclusion === 'success') : null,
      jobs: jobs.length === 0 ? null : jobs.every(job => job.conclusion === 'success'),
      steps: steps.length === 0 ? null : steps.every(step => step.conclusion === 'success'),
      artifacts: artifacts.length === 0 ? null : artifacts.length > 0
    };
    const applicable = Object.values(checks).filter(v => v !== null);
    const passed = !pending && applicable.length > 0 && applicable.every(Boolean);
    return {passed,pending,checks,counts:{runs:runs.length,jobs:jobs.length,steps:steps.length,artifacts:artifacts.length}};
  }
}
module.exports={EvidenceInterpreter};
