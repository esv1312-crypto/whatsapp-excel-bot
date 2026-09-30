const {createTask}=require('./task_engine');
const {plan}=require('./chief_of_staff');

function createProject(input={}){
  if(!input.name) throw new Error('Project name is required');
  return {
    id:input.id||('project_'+Date.now()),
    name:input.name,
    status:'ACTIVE',
    repository:input.repository||null,
    branch:input.branch||'main',
    knowledgeScope:[],
    tasks:[],
    decisions:[],
    createdAt:new Date().toISOString()
  };
}

function bootstrapProject(input={},options={}){
  const project=createProject(input);
  if(!options.goal) throw new Error('Project goal is required');
  const blueprint=options.blueprint||null;
  const planned=plan(options.goal,{project:project.id,blueprint,specialists:options.specialists||[]});
  project.tasks=planned.tasks.map(task=>task.id);
  return {project,plan:planned};
}

module.exports={createProject,bootstrapProject};
