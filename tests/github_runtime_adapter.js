const office=require('../core');

(async()=>{
  const calls=[];
  const adapter=new office.GitHubRuntimeAdapter({
    fetchFile:async input=>{calls.push(['read',input.path]);return {sha:'current-sha',content:'old'};},
    updateFile:async input=>{calls.push(['update',input.path,input.sha]);return {commit_sha:'update-commit'};},
    createFile:async input=>{calls.push(['create',input.path]);return {commit_sha:'create-commit'};}
  });

  const result=await adapter.writeFile({
    repository:'owner/repo',
    path:'README.md',
    content:'# new'
  });

  if(result.commit_sha!=='update-commit') throw new Error('Runtime adapter did not update existing file');
  if(calls.length!==2||calls[0][0]!=='read'||calls[1][2]!=='current-sha') {
    throw new Error('Runtime adapter did not resolve current file SHA before update');
  }

  const created=new office.GitHubRuntimeAdapter({
    fetchFile:async()=>{throw new Error('NOT_FOUND');},
    updateFile:async()=>{throw new Error('Should not update');},
    createFile:async input=>({commit_sha:'create-commit'})
  });

  const createResult=await created.writeFile({
    repository:'owner/repo',
    path:'new.md',
    content:'# new',
    allowCreate:true
  });

  if(createResult.commit_sha!=='create-commit') throw new Error('Runtime adapter did not create missing file');

  console.log('GitHub runtime adapter test: PASS');
})().catch(error=>{console.error(error);process.exitCode=1;});
