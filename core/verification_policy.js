class VerificationPolicy {
  constructor(options = {}) {
    this.requireCommit = options.requireCommit !== false;
    this.requireCI = options.requireCI !== false;
    this.requireJobs = options.requireJobs === true;
    this.requireSteps = options.requireSteps === true;
    this.requireArtifacts = options.requireArtifacts === true;
    this.artifactNames = options.artifactNames || [];
  }

  evaluate(evidence = {}) {
    const runs = evidence.runs || [];
    const jobs = runs.flatMap(run => run.jobs || []);
    const steps = runs.flatMap(run => run.steps || []).flatMap(group => group.steps || []);
    const artifacts = runs.flatMap(run => run.artifacts || []);

    const checks = {};
    if (this.requireCommit) checks.commit = !!evidence.commit;
    if (this.requireCI) checks.ci = runs.length > 0 && runs.every(run => run.conclusion === 'success');
    if (this.requireJobs) checks.jobs = jobs.length > 0 && jobs.every(job => job.conclusion === 'success');
    if (this.requireSteps) checks.steps = steps.length > 0 && steps.every(step => step.conclusion === 'success');
    if (this.requireArtifacts) {
      checks.artifacts = artifacts.length > 0;
      if (this.artifactNames.length) {
        checks.requiredArtifacts = this.artifactNames.every(name => artifacts.some(a => a.name === name));
      }
    }

    return { passed: Object.keys(checks).length > 0 && Object.values(checks).every(Boolean), checks };
  }
}

module.exports={VerificationPolicy};
