const assert=require('assert');
const office=require('../core');

(()=>{
  const result=office.bootstrapProject(
    {id:'bootstrap-test',name:'Bootstrap Test',repository:'owner/repo'},
    {
      goal:'Build a verified feature',
      specialists:[
        {id:'product',skills:['product_management']},
        {id:'architect',skills:['architecture']},
        {id:'developer',skills:['software_development']},
        {id:'qa',skills:['testing']}
      ]
    }
  );
  assert.strictEqual(result.project.id,'bootstrap-test');
  assert.strictEqual(result.project.repository,'owner/repo');
  assert.strictEqual(result.plan.tasks.length,4);
  assert.deepStrictEqual(result.project.tasks,result.plan.tasks.map(t=>t.id));
  assert.strictEqual(result.plan.team.complete,true);
  console.log('project bootstrap tests: OK');
})();
