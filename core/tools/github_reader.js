class GitHubReader {
  constructor(options = {}) {
    if (typeof options.fetch !== 'function') {
      throw new Error('GitHubReader requires fetch function');
    }
    this.fetch = options.fetch;
  }

  async readFile(input = {}) {
    if (!input.repository || !input.path) {
      throw new Error('repository and path are required');
    }
    const ref = input.ref ? `?ref=${encodeURIComponent(input.ref)}` : '';
    return this.fetch(`/repos/${input.repository}/contents/${input.path}${ref}`);
  }

  async readTree(input = {}) {
    if (!input.repository) throw new Error('repository is required');
    const ref = input.ref || 'HEAD';
    return this.fetch(`/repos/${input.repository}/git/trees/${encodeURIComponent(ref)}?recursive=1`);
  }

  async readCommit(input = {}) {
    if (!input.repository || !input.sha) {
      throw new Error('repository and sha are required');
    }
    return this.fetch(`/repos/${input.repository}/commits/${input.sha}`);
  }

  tools() {
    return [
      { name: 'github.read_file', description: 'Read a file from a GitHub repository', risk: 'low', execute: input => this.readFile(input) },
      { name: 'github.read_tree', description: 'Inspect the repository tree', risk: 'low', execute: input => this.readTree(input) },
      { name: 'github.read_commit', description: 'Read commit metadata and changed files', risk: 'low', execute: input => this.readCommit(input) }
    ];
  }
}

module.exports = { GitHubReader };
