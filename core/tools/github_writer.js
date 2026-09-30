class GitHubWriter {
  constructor(options = {}) {
    if (typeof options.updateFile !== 'function' && typeof options.createFile !== 'function') {
      throw new Error('GitHubWriter requires updateFile or createFile function');
    }
    this.updateFile = options.updateFile;
    this.createFile = options.createFile;
  }

  async writeFile(input = {}) {
    if (!input.repository || !input.path || typeof input.content !== 'string') {
      throw new Error('repository, path and content are required');
    }

    const payload = {
      repository_full_name: input.repository,
      path: input.path,
      content: input.content,
      message: input.message || `office: update ${input.path}`,
      sha: input.sha,
      branch: input.branch || null
    };

    if (input.sha) {
      if (typeof this.updateFile !== 'function') throw new Error('Update operation is not configured');
      return this.updateFile(payload);
    }

    if (typeof this.createFile !== 'function') throw new Error('Create operation is not configured');
    delete payload.sha;
    return this.createFile(payload);
  }

  tools() {
    return [
      {
        name: 'github.write_file',
        description: 'Create or update a file in a GitHub repository',
        risk: 'write',
        execute: input => this.writeFile(input)
      }
    ];
  }
}

module.exports = { GitHubWriter };
