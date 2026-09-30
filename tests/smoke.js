const office=require('../core');

const events=[];
const bus=new office.EventBus();
bus.on('task.ready',event=>events.push(event.type));
bus.on('task.completed',event=>events.push(event.type));

const orchestrator=new office.Orchestrator({eventBus:bus,maxSteps:10});

const foundation=office.createTask({id:'foundation',objective:'Foundation task'});
const dependent=office.createTask({
  id:'dependent',
  objective:'Dependent task',
  dependencies:['foundation']
});

orchestrator.addTask(dependent);
if(dependent.status!=='CREATED')throw new Error('Dependency task should remain CREATED');

orchestrator.addTask(foundation);
if(foundation.status!=='READY')throw new Error('Foundation task should become READY');

orchestrator.assign('foundation');
orchestrator.start('foundation');
orchestrator.implement('foundation',{ok:true});
orchestrator.verify('foundation',true,{checked:true});

if(dependent.status!=='READY')throw new Error('Dependent task did not become READY');

const team=office.buildTeam(
  ['software_development'],
  [{id:'developer',skills:['software_development']}]
);
if(!team.complete)throw new Error('Team builder failed');

if(!events.includes('task.ready'))throw new Error('Ready event missing');
if(!events.includes('task.completed'))throw new Error('Completed event missing');

console.log('AI-OFFICE smoke test: PASS');
