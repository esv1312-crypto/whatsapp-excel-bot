const {ProjectDiscovery}=require('../core/project_discovery');

(async()=>{
  const discovery=new ProjectDiscovery({
    githubReader:{
      readTree:async()=>({tree:[
        {path:'app/src/main/MainActivity.java',type:'blob'},
        {path:'app/build/outputs/apk/debug/app-debug.apk',type:'blob'},
        {path:'app/src/main/assets/pognali_final.html',type:'blob'},
        {path:'.github/workflows/android.yml',type:'blob'},
        {path:'README.md',type:'blob'}
      ]})
    }
  });
  const result=await discovery.inspect({id:'pognali3',repository:'esv1312-crypto/pognali3',branch:'main'});
  if(result.sourceFiles.includes('app/build/outputs/apk/debug/app-debug.apk')) throw new Error('Build artifact leaked into sourceFiles');
  if(result.buildArtifacts.length!==1) throw new Error('Build artifact detection failed');
  if(result.ciWorkflows.length!==1) throw new Error('CI discovery failed');
  console.log('Project discovery test: PASS');
})().catch(error=>{console.error(error);process.exitCode=1;});
