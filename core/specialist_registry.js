const registry=new Map();
function registerSpecialist(s){if(!s||!s.id||!Array.isArray(s.skills)||!s.skills.length)throw new Error('Specialist id and skills are required');const n={...s,skills:[...new Set(s.skills)],tools:s.tools||[],constraints:s.constraints||[]};registry.set(n.id,n);return n;}
function findBySkills(skills=[]){const req=new Set(skills);return [...registry.values()].filter(s=>[...req].every(x=>s.skills.includes(x)));}
function listSpecialists(){return[...registry.values()];}
module.exports={registerSpecialist,findBySkills,listSpecialists};
