class GitHubCommitRuntimeAdapter {
  constructor(options = {}) {
    for (const name of ['getRef','createTree','createCommit','updateRef']) {
      if (typeof options[name] !== 'function') throw new Error(`GitHubCommitRuntimeAdapter requires ${name}`);
    }
    this.getRef=options.getRef; this.createTree=options.createTree; this.createCommit=options.createCommit; this.updateRef=options.updateRef;
  }

  async commit(input = {}) {
    const head=await this.getRef({repository:input.repository,branch:input.branch});
    const parentSha=head.object?.sha || head.sha;
    if (!parentSha) throw new Error('Could not resolve branch head');
    const tree=await this.createTree({repository:input.repository,baseTreeSha:head.treeSha || null,changes:input.changes});
    const commit=await this.createCommit({repository:input.repository,message:input.message,treeSha:tree.sha,parentSha});
    await this.updateRef({repository:input.repository,branch:input.branch,sha:commit.sha});
    return {commitSha:commit.sha,branch:input.branch,parentSha,treeSha:tree.sha};
  }

  tools(){ return [{name:'github.commit',description:'Create a commit and update a branch through the runtime adapter',risk:'write',execute:input=>this.commit(input)}]; }
}
module.exports={GitHubCommitRuntimeAdapter};
