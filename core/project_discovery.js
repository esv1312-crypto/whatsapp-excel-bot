class ProjectDiscovery {
  constructor(options = {}) {
    if (!options.githubReader || typeof options.githubReader.readTree !== 'function') {
      throw new Error('ProjectDiscovery requires githubReader');
    }
    this.githubReader = options.githubReader;
  }

  async inspect(project) {
    if (!project || !project.repository) {
      throw new Error('Project repository is required');
    }

    const tree = await this.githubReader.readTree({
      repository: project.repository,
      ref: project.branch || 'HEAD'
    });

    const entries = tree.tree || tree;
    const files = Array.isArray(entries) ? entries : [];

    const sourceFiles = files
      .filter(item => item.type === 'blob')
      .map(item => item.path)
      .filter(path => !this.isBuildArtifact(path));

    return {
      projectId: project.id,
      repository: project.repository,
      branch: project.branch || 'HEAD',
      sourceFiles,
      buildArtifacts: files
        .filter(item => item.type === 'blob')
        .map(item => item.path)
        .filter(path => this.isBuildArtifact(path)),
      ciWorkflows: sourceFiles.filter(path => path.startsWith('.github/workflows/')),
      entrypoints: sourceFiles.filter(path =>
        path.endsWith('MainActivity.java') || path.endsWith('pognali_final.html')
      )
    };
  }

  isBuildArtifact(path) {
    return path.startsWith('app/build/') ||
      path.startsWith('build/') ||
      path.endsWith('.apk') ||
      path.endsWith('.zip');
  }
}

module.exports = { ProjectDiscovery };
