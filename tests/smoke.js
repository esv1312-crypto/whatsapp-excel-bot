const office=require('../core');

const events=[];
const bus=new office.EventBus();
for(const type of ['task.ready','task.completed','agent.started','agent.tool_called','agent.completed','task.verifying']){
  bus.on(type,event=>events.push(event.type));
}

const specialists=[
  {id:'product',skills:['product_management']},
  {id:'architect',skills:['architecture']},
  {id:'developer',skills:['software_development']},
  {id:'qa',skills:['testing']}
];

const orchestrator=new office.Orchestrator({
  eventBus:bus,
  specialists,
  tools:{echo:input=>({echo:input})},
  maxSteps:10
});

const foundation=office.createTask({id:'foundation',objective:'Foundation task',requiredSkills:['software_development']});
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
const agent=orchestrator.start('foundation');
if(agent.state!=='RUNNING')throw new Error('Agent did not start');

orchestrator.runAgent('foundation',[
  {type:'tool',name:'echo',input:'hello'},
  {type:'complete',result:{ok:true}}
]);

if(foundation.status!=='VERIFYING')throw new Error('Implemented task should enter VERIFYING');
orchestrator.verify('foundation',true,{checked:true});

if(foundation.status!=='COMPLETED')throw new Error('Foundation task should be COMPLETED');
if(dependent.status!=='READY')throw new Error('Dependent task did not become READY');

const team=office.buildTeam(
  ['software_development'],
  [{id:'developer',skills:['software_development']}]
);
if(!team.complete)throw new Error('Team builder failed');

const plan=office.planAndAssign('Build the AI-OFFICE simulator',{
  project:'office-simulator',
  specialists
});

if(plan.tasks.length!==4)throw new Error('Chief did not create the expected plan');
if(!plan.team.complete)throw new Error('Chief could not assemble the required team');
if(plan.readyTasks.length!==1||plan.readyTasks[0]!=='product')throw new Error('Initial ready task is incorrect');

for(const type of ['agent.started','agent.tool_called','agent.completed','task.verifying','task.completed']){
  if(!events.includes(type))throw new Error('Missing event: '+type);
}

console.log('AI-OFFICE smoke test: PASS');
