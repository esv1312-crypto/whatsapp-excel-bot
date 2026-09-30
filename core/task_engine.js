const TASK_STATUS=Object.freeze({
  CREATED:'CREATED',
  READY:'READY',
  ASSIGNED:'ASSIGNED',
  IN_PROGRESS:'IN_PROGRESS',
  WAITING:'WAITING',
  IMPLEMENTED:'IMPLEMENTED',
  VERIFYING:'VERIFYING',
  COMPLETED:'COMPLETED',
  FAIL:'FAIL',
  FIXING:'FIXING',
  RETEST:'RETEST'
});

const ALLOWED_TRANSITIONS=Object.freeze({
  CREATED:[TASK_STATUS.READY,TASK_STATUS.WAITING],
  READY:[TASK_STATUS.ASSIGNED,TASK_STATUS.WAITING],
  ASSIGNED:[TASK_STATUS.IN_PROGRESS,TASK_STATUS.WAITING],
  IN_PROGRESS:[TASK_STATUS.IMPLEMENTED,TASK_STATUS.WAITING, TASK_STATUS.FAIL],
  WAITING:[TASK_STATUS.READY,TASK_STATUS.ASSIGNED],
  IMPLEMENTED:[TASK_STATUS.VERIFYING],
  VERIFYING:[TASK_STATUS.COMPLETED,TASK_STATUS.FAIL],
  FAIL:[TASK_STATUS.FIXING],
  FIXING:[TASK_STATUS.RETEST,TASK_STATUS.FAIL],
  RETEST:[TASK_STATUS.VERIFYING,TASK_STATUS.FAIL],
  COMPLETED:[]
});

function createTask(input={}){
  if(!input.objective) throw new Error('Task objective is required');
  return {
    id:input.id||'task_'+Date.now(),
    project:input.project||null,
    requiredSkills:input.requiredSkills||[],
    status:TASK_STATUS.CREATED,
    dependencies:input.dependencies||[],
    objective:input.objective,
    result:null,
    verification:null,
    history:[{status:TASK_STATUS.CREATED,at:new Date().toISOString()}]
  };
}

function canTransition(current,next){
  return (ALLOWED_TRANSITIONS[current]||[]).includes(next);
}

function transitionTask(task,next){
  if(!canTransition(task.status,next)){
    throw new Error(`Invalid task transition: ${task.status} -> ${next}`);
  }
  task.status=next;
  task.history.push({status:next,at:new Date().toISOString()});
  return task;
}

function dependenciesReady(task,tasksById){
  return (task.dependencies||[]).every(id=>tasksById[id]?.status===TASK_STATUS.COMPLETED);
}

function markReadyIfPossible(task,tasksById){
  if(task.status!==TASK_STATUS.CREATED) return false;
  if(!dependenciesReady(task,tasksById)) return false;
  transitionTask(task,TASK_STATUS.READY);
  return true;
}

module.exports={
  TASK_STATUS,
  ALLOWED_TRANSITIONS,
  createTask,
  canTransition,
  transitionTask,
  dependenciesReady,
  markReadyIfPossible
};
