function plan(goal){if(!goal)throw new Error('Goal is required');return{goal,requiredSkills:[],tasks:[],status:'PLANNED'};}
module.exports={plan};
