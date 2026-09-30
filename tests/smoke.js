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
  maxSteps:20
});

const foundation=office.createTask({id:'foundation',objective:'Foundation task',requiredSkills:['software_development']});
const dependent=office.createTask({
  id:'dependent',
  objective:'Dependent task',
  dependencies:['foundation'],
  requiredSkills:['testing']
});

orchestrator.addTasks([dependent,foundation]);

const worker=new office.WorkerEngine({
  orchestrator,
  maxTicks:10,
  actionProvider:task=>[
    {type:'tool',name:'echo',input:task.id},
    {type:'complete',result:{ok:true,taskId:task.id}}
  ],
  verifier:task=>({passed:true,details:{verifiedBy:'smoke'}})
});

const result=worker.run();

if(!result.complete)throw new Error('Worker did not complete the project');
if(result.ticks!==3)throw new Error('Worker should use two execution ticks plus one completion check');
if(orchestrator.getTask('foundation').status!=='COMPLETED')throw new Error('Foundation not completed');
if(orchestrator.getTask('dependent').status!=='COMPLETED')throw new Error('Dependent not completed');

for(const type of ['agent.started','agent.tool_called','agent.completed','task.verifying','task.completed']){
  if(!events.includes(type))throw new Error('Missing event: '+type);
}

const plan=office.planAndAssign('Build the AI-OFFICE simulator',{
  project:'office-simulator',
  specialists
});
if(plan.tasks.length!==4)throw new Error('Chief did not create the expected plan');
if(!plan.team.complete)throw new Error('Chief could not assemble the required team');
if(plan.readyTasks.length!==1||plan.readyTasks[0]!=='product')throw new Error('Initial ready task is incorrect');

console.log('AI-OFFICE smoke test: PASS');
