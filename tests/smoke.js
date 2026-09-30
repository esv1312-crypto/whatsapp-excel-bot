const office=require('../core');

const events=[];
const bus=new office.EventBus();
bus.on('task.ready',event=>events.push(event.type));
bus.on('task.completed',event=>events.push(event.type));
bus.on('agent.started',event=>events.push(event.type));
bus.on('agent.tool_called',event=>events.push(event.type));
bus.on('agent.completed',event=>events.push(event.type));

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

const specialists=[
  {id:'product',skills:['product_management']},
  {id:'architect',skills:['architecture']},
  {id:'developer',skills:['software_development']},
  {id:'qa',skills:['testing']}
];

const plan=office.planAndAssign('Build the AI-OFFICE simulator',{
  project:'office-simulator',
  specialists
});

if(plan.tasks.length!==4)throw new Error('Chief did not create the expected plan');
if(!plan.team.complete)throw new Error('Chief could not assemble the required team');
if(plan.readyTasks.length!==1||plan.readyTasks[0]!=='product')throw new Error('Initial ready task is incorrect');

const runtime=new office.AgentRuntime({
  specialist:specialists[2],
  task:foundation,
  eventBus:bus,
  tools:{echo:input=>({echo:input})},
  maxSteps:3
});

runtime.start();
const toolResult=runtime.run({type:'tool',name:'echo',input:'hello'});
if(toolResult.echo!=='hello')throw new Error('Agent tool execution failed');

const completed=runtime.run({type:'complete',result:{ok:true}});
if(!completed.completed||runtime.state!=='COMPLETED')throw new Error('Agent completion failed');

if(!events.includes('agent.started')||!events.includes('agent.tool_called')||!events.includes('agent.completed')){
  throw new Error('Agent runtime events missing');
}

console.log('AI-OFFICE smoke test: PASS');
