const office=require('../core');
const task=office.createTask({objective:'AI-OFFICE smoke test'});
office.transitionTask(task,office.TASK_STATUS.READY);
if(task.status!=='READY')throw new Error('Task engine failed');
const team=office.buildTeam(['software_development'],[{id:'developer',skills:['software_development']}]);
if(!team.complete)throw new Error('Team builder failed');
console.log('AI-OFFICE smoke test: PASS');
