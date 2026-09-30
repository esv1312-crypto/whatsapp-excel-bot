class GitHubRuntimeAdapter {
  constructor(options = {}) {
    const required = ['fetchFile','createFile','updateFile'];
    for (const name of required) {
      if (typeof options[name] !== 'function') {
        throw new Error(`GitHubRuntimeAdapter requires ${name}`);
      }
    }
    this.fetchFile = options.fetchFile;
    this.createFile = options.createFile;
    this.updateFile = options.updateFile;
  }

  async readFile(input = {}) {
    return this.fetchFile(input);
  }

  async writeFile(input = {}) {
    if (!input.repository || !input.path || typeof input.content !== 'string') {
      throw new Error('repository, path and content are required');
    }

    if (input.sha) {
      return this.updateFile(input);
    }

    try {
      const current = await this.fetchFile({
        repository: input.repository,
        path: input.path,
        ref: input.ref
      });

      return this.updateFile({
        ...input,
        sha: current.sha
      });
    } catch (error) {
      if (!input.allowCreate) throw error;

      return this.createFile(input);
    }
  }

  tools() {
    return [
      {
        name: 'github.read_file',
        description: 'Read a file through the runtime GitHub adapter',
        risk: 'low',
        execute: input => this.readFile(input)
      },
      {
        name: 'github.write_file',
        description: 'Create or update a file through the runtime GitHub adapter',
        risk: 'write',
        execute: input => this.writeFile(input)
      }
    ];
  }
}

module.exports = { GitHubRuntimeAdapter };
