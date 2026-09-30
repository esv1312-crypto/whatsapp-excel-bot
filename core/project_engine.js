function createProject(input={}){if(!input.name)throw new Error('Project name is required');return{id:input.id||('project_'+Date.now()),name:input.name,status:'ACTIVE',knowledgeScope:[],tasks:[],decisions:[],createdAt:new Date().toISOString()};}
module.exports={createProject};
