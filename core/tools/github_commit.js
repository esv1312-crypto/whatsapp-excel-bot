class GitHubCommitTool {
  constructor(options = {}) {
    for (const name of ['getRef','createTree','createCommit','updateRef']) {
      if (typeof options[name] !== 'function') throw new Error(`GitHubCommitTool requires ${name}`);
    }
    this.getRef=options.getRef;
    this.createTree=options.createTree;
    this.createCommit=options.createCommit;
    this.updateRef=options.updateRef;
  }

  async commit(input = {}) {
    if (!input.repository || !input.branch || !input.message) {
      throw new Error('repository, branch and message are required');
    }
    if (!Array.isArray(input.changes) || !input.changes.length) {
      throw new Error('at least one change is required');
    }

    const head=await this.getRef({repository:input.repository,branch:input.branch});
    const parentSha=head.object?.sha || head.sha;
    if (!parentSha) throw new Error('Could not resolve branch head');

    const tree=await this.createTree({
      repository:input.repository,
      baseTreeSha:head.treeSha || head.object?.treeSha || null,
      changes:input.changes
    });
    const treeSha=tree.sha;
    if (!treeSha) throw new Error('Could not create tree');

    const commit=await this.createCommit({
      repository:input.repository,
      message:input.message,
      treeSha,
      parentSha
    });
    if (!commit.sha) throw new Error('Could not create commit');

    await this.updateRef({
      repository:input.repository,
      branch:input.branch,
      sha:commit.sha
    });

    return {commitSha:commit.sha, branch:input.branch, parentSha, treeSha};
  }

  tools() {
    return [{
      name:'github.commit',
      description:'Create a commit from file changes and update a GitHub branch',
      risk:'write',
      execute:input=>this.commit(input)
    }];
  }
}
module.exports={GitHubCommitTool};
