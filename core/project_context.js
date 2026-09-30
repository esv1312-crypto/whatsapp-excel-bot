class ProjectContextBuilder {
  constructor(options = {}) {
    if (!options.fetchFile || typeof options.fetchFile !== 'function') {
      throw new Error('ProjectContextBuilder requires fetchFile');
    }
    this.fetchFile = options.fetchFile;
  }

  async build(project, discovery) {
    if (!project || !project.id || !project.repository) {
      throw new Error('Project id and repository are required');
    }
    if (!discovery || discovery.projectId !== project.id) {
      throw new Error('Discovery result does not match project');
    }

    const paths = this._keyPaths(project, discovery);
    const files = {};
    for (const path of paths) {
      const result = await this.fetchFile({
        repository: project.repository,
        path,
        ref: project.branch || 'HEAD'
      });
      files[path] = result.content;
    }

    return {
      project: {
        id: project.id,
        name: project.name || project.id,
        type: project.type || 'unknown',
        repository: project.repository,
        branch: project.branch || 'HEAD',
        status: project.status || 'UNKNOWN'
      },
      sourceRoots: project.sourceRoots || [],
      buildArtifacts: project.buildArtifacts || discovery.buildArtifacts || [],
      sourceFiles: discovery.sourceFiles || [],
      entrypoints: discovery.entrypoints || [],
      ciWorkflows: discovery.ciWorkflows || [],
      importantFiles: Object.keys(files),
      capabilities: this._detectCapabilities(files),
      files
    };
  }

  _keyPaths(project, discovery) {
    const candidates = [
      ...(project.sourceRoots || []),
      ...(project.entrypoints || []),
      ...(discovery.entrypoints || []),
      ...(discovery.ciWorkflows || []),
      'README.md',
      'README.txt',
      'BUILD_PIPELINE.md',
      'build.gradle',
      'settings.gradle',
      'app/build.gradle'
    ];

    return [...new Set(candidates)].filter(path =>
      !this._isArtifact(path) &&
      (path.includes('/') || path.endsWith('.md') || path.endsWith('.txt') ||
       path === 'build.gradle' || path === 'settings.gradle')
    );
  }

  _isArtifact(path) {
    return path.startsWith('app/build/') ||
      path.startsWith('build/') ||
      path.endsWith('.apk') ||
      path.endsWith('.zip');
  }

  _detectCapabilities(files) {
    const text = Object.values(files).join('\\n');
    const capabilities = [];
    if (/com\.android\.application|compileSdk|assembleDebug/.test(text)) capabilities.push('android');
    if (/WebView|setJavaScriptEnabled|loadUrl\("file:/.test(text)) capabilities.push('android_webview');
    if (/GeolocationPermissions|setGeolocationEnabled|ACCESS_FINE_LOCATION/.test(text)) capabilities.push('geolocation');
    if (/onShowFileChooser|ACTION_OPEN_DOCUMENT|image\/\*/.test(text)) capabilities.push('image_file_selection');
    if (/github\/workflows|actions\/checkout|setup-java|gradle\/actions/.test(text)) capabilities.push('github_actions_ci');
    return capabilities;
  }
}

module.exports = { ProjectContextBuilder };
