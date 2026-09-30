function verify(task){const missing=[];if(task.result===null||task.result===undefined||task.result==='')missing.push('result');if(!task.verification||task.verification.passed!==true)missing.push('verification');return{passed:missing.length===0,missing};}
module.exports={verify};
