const assert=require('assert');
const {ToolPolicy}=require('../core/tool_policy');

(()=>{
  const policy=new ToolPolicy({
    defaultMaxRisk:'read',
    rules:[{
      when:(tool,ctx)=>tool.name==='github.write_file',
      allow:(tool,ctx)=>ctx.project==='pognali3'&&ctx.taskType==='implementation',
      reason:'PROJECT_SCOPE_DENIED'
    }]
  });
  assert(policy.evaluate({name:'github.read_file',risk:'read'},{project:'other'}).allowed);
  assert.strictEqual(policy.evaluate({name:'github.write_file',risk:'write'},{project:'other',maxRisk:'write',taskType:'implementation'}).reason,'PROJECT_SCOPE_DENIED');
  assert(policy.evaluate({name:'github.write_file',risk:'write'},{project:'pognali3',maxRisk:'write',taskType:'implementation'}).allowed);
  assert.strictEqual(policy.evaluate({name:'github.commit',risk:'commit'},{project:'pognali3',maxRisk:'write'}).reason,'RISK_LIMIT');
  console.log('tool policy tests: OK');
})();
