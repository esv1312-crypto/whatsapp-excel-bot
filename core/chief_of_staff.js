const {createTask}=require('./task_engine');
const {buildTeam}=require('./team_builder');

function plan(goal,options={}){
  if(!goal) throw new Error('Goal is required');

  const project=options.project||'ai-office';
  const blueprint=options.blueprint||defaultBlueprint(goal);
  const tasks=[];
  const byKey={};

  for(const item of blueprint){
    const task=createTask({
      id:item.id,
      project,
      objective:item.objective,
      requiredSkills:item.requiredSkills||[],
      dependencies:(item.dependencies||[]).map(key=>byKey[key]?.id||key)
    });
    tasks.push(task);
    byKey[item.id]=task;
  }

  const requiredSkills=[...new Set(tasks.flatMap(t=>t.requiredSkills))];
  const team=buildTeam(requiredSkills,options.specialists||[]);

  return {
    goal,
    project,
    requiredSkills,
    tasks,
    team,
    status:'PLANNED'
  };
}

function defaultBlueprint(goal){
  return [
    {
      id:'product',
      objective:`Define product requirements and acceptance criteria for: ${goal}`,
      requiredSkills:['product']
    },
    {
      id:'architecture',
      objective:`Design the technical architecture for: ${goal}`,
      requiredSkills:['architecture'],
      dependencies:['product']
    },
    {
      id:'implementation',
      objective:`Implement the solution for: ${goal}`,
      requiredSkills:['software_development'],
      dependencies:['architecture']
    },
    {
      id:'qa',
      objective:`Verify the implementation for: ${goal}`,
      requiredSkills:['quality_assurance'],
      dependencies:['implementation']
    }
  ];
}

function planAndAssign(goal,options={}){
  const result=plan(goal,options);
  return {
    ...result,
    teamAssignment:result.team.team.map(member=>({
      specialistId:member.specialistId,
      skills:member.skills
    })),
    readyTasks:result.tasks.filter(task=>task.dependencies.length===0).map(task=>task.id)
  };
}

module.exports={plan,planAndAssign,defaultBlueprint};
