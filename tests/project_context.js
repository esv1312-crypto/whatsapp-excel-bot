const assert = require('assert');
const {ProjectContextBuilder}=require('../core/project_context');

const files = {
  'build.gradle': "plugins { id 'com.android.application' version '9.4.0' apply false }",
  'settings.gradle': "rootProject.name='Pognali'",
  'app/build.gradle': "compileSdk 35",
  'app/src/main/java/com/pognali/app/MainActivity.java': "WebView webView; setGeolocationEnabled(true); onShowFileChooser",
  '.github/workflows/android.yml': "uses: actions/checkout@v4\nrun: gradle :app:assembleDebug",
  'README.txt': 'Pognali Android test build 1.1'
};

(async()=>{
  const calls=[];
  const builder=new ProjectContextBuilder({
    fetchFile: async input => {
      calls.push(input.path);
      if (!files[input.path]) throw new Error('unexpected file: '+input.path);
      return {content:files[input.path]};
    }
  });

  const project={
    id:'pognali3',
    name:'Погнали',
    repository:'esv1312-crypto/pognali3',
    branch:'main',
    type:'android',
    sourceRoots:['app/src','app/build.gradle','build.gradle','settings.gradle'],
    buildArtifacts:['app/build','build','*.apk','*.zip']
  };
  const discovery={
    projectId:'pognali3',
    sourceFiles:Object.keys(files),
    buildArtifacts:['app/build/outputs/apk/debug/app-debug.apk'],
    ciWorkflows:['.github/workflows/android.yml'],
    entrypoints:['app/src/main/java/com/pognali/app/MainActivity.java']
  };

  const context=await builder.build(project,discovery);
  assert.strictEqual(context.project.repository, project.repository);
  assert(context.importantFiles.includes('app/build.gradle'));
  assert(context.capabilities.includes('android'));
  assert(context.capabilities.includes('android_webview'));
  assert(context.capabilities.includes('geolocation'));
  assert(context.capabilities.includes('image_file_selection'));
  assert(context.capabilities.includes('github_actions_ci'));
  assert(!context.importantFiles.some(path=>path.endsWith('.apk')));
  assert(calls.every(path=>!path.startsWith('app/build/')));
  assert.throws(
    ()=>builder.build(project,{projectId:'other'}),
    /does not match project/
  );

  console.log('project_context tests passed');
})().catch(error=>{ console.error(error); process.exit(1); });
