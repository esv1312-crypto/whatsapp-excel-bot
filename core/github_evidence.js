class GitHubEvidenceCollector {
  constructor(options = {}) {
    if (typeof options.fetchCommit !== 'function') throw new Error('GitHubEvidenceCollector requires fetchCommit');
    if (typeof options.fetchWorkflowRuns !== 'function') throw new Error('GitHubEvidenceCollector requires fetchWorkflowRuns');
    this.fetchCommit = options.fetchCommit;
    this.fetchWorkflowRuns = options.fetchWorkflowRuns;
    this.getCombinedStatus = options.getCombinedStatus;
  }
  async collect(input = {}) {
    if (!input.repository || !input.commitSha) throw new Error('repository and commitSha are required');
    const commit = await this.fetchCommit({ repository: input.repository, sha: input.commitSha });
    const runsResult = await this.fetchWorkflowRuns({ repo_full_name: input.repository, commit_sha: input.commitSha });
    const workflowRuns = runsResult.workflow_runs || [];
    const evidence = { commit: input.commitSha, changedFiles: this.changedFiles(commit), workflowRuns };
    if (typeof this.getCombinedStatus === 'function') evidence.status = await this.getCombinedStatus({ repo_full_name: input.repository, commit_sha: input.commitSha });
    evidence.runs = [];
    for (const run of workflowRuns) {
      const runEvidence = { id: run.id, status: run.status, conclusion: run.conclusion };
      if (run.id && typeof this.fetchJobs === 'function') {
        const jobsResult = await this.fetchJobs({ repo_full_name: input.repository, run_id: run.id });
        runEvidence.jobs = jobsResult.jobs || [];
        if (typeof this.fetchSteps === 'function') {
          runEvidence.steps = [];
          for (const job of runEvidence.jobs) {
            if (job.id) { const s = await this.fetchSteps({ repo_full_name: input.repository, job_id: job.id }); runEvidence.steps.push({ jobId: job.id, steps: s.steps || [] }); }
          }
        }
        if (typeof this.fetchArtifacts === 'function') { const a = await this.fetchArtifacts({ repo_full_name: input.repository, run_id: run.id }); runEvidence.artifacts = a.artifacts || []; }
      }
      evidence.runs.push(runEvidence);
    }
    return evidence;
  }
  changedFiles(commit) {
    const files = commit && (commit.files || (commit.commit && commit.commit.files));
    return Array.isArray(files) ? files.map(file => file.filename || file.path).filter(Boolean) : [];
  }
}
module.exports={GitHubEvidenceCollector};
