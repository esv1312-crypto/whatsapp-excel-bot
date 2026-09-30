const TASK_STATUS=Object.freeze({CREATED:'CREATED',READY:'READY',ASSIGNED:'ASSIGNED',IN_PROGRESS:'IN_PROGRESS',WAITING:'WAITING',IMPLEMENTED:'IMPLEMENTED',VERIFYING:'VERIFYING',COMPLETED:'COMPLETED',FAIL:'FAIL',FIXING:'FIXING',RETEST:'RETEST'});
function createTask(input={}){if(!input.objective)throw new Error('Task objective is required');return{id:input.id||'task_'+Date.now(),project:input.project||null,requiredSkills:input.requiredSkills||[],status:TASK_STATUS.CREATED,dependencies:input.dependencies||[],objective:input.objective,result:null,verification:null,history:[]};}
function transitionTask(task,next){task.status=next;task.history.push({status:next,at:new Date().toISOString()});return task;}
module.exports={TASK_STATUS,createTask,transitionTask};
