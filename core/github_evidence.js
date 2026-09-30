class GitHubEvidenceCollector {\n  constructor(options = {}) {\n    if (typeof options.fetchCommit !== 'function') throw new Error('GitHubEvidenceCollector requires fetchCommit');\n    if (typeof options.fetchWorkflowRuns !== 'function') throw new Error('GitHubEvidenceCollector requires fetchWorkflowRuns');\n    this.fetchCommit = options.fetchCommit;\n    this.fetchWorkflowRuns = options.fetchWorkflowRuns;\n    this.getCombinedStatus = options.getCombinedStatus;\n  }\n  async collect(input = {}) {\n    if (!input.repository || !input.commitSha) throw new Error('repository and commitSha are required');\n    const commit = await this.fetchCommit({ repository: input.repository, sha: input.commitSha });\n    const runsResult = await this.fetchWorkflowRuns({ repo_full_name: input.repository, commit_sha: input.commitSha });\n    const workflowRuns = runsResult.workflow_runs || [];\n    const evidence = { commit: input.commitSha, changedFiles: this.changedFiles(commit), workflowRuns };\n    if (typeof this.getCombinedStatus === 'function') evidence.status = await this.getCombinedStatus({ repo_full_name: input.repository, commit_sha: input.commitSha });
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
    }\n    return evidence;\n  }\n  changedFiles(commit) {\n    const files = commit && (commit.files || (commit.commit && commit.commit.files));\n    return Array.isArray(files) ? files.map(file => file.filename || file.path).filter(Boolean) : [];\n  }\n}\nmodule.exports={GitHubEvidenceCollector};\n