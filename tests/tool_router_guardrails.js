const assert=require('assert');
const {ToolRouter,TOOL_RISK}=require('../core/tool_router');

(async()=>{
  const events=[];
  const bus={emit:(type,payload)=>events.push({type,payload})};
  const router=new ToolRouter({
    eventBus:bus,
    tools:[
      {name:'read',risk:TOOL_RISK.READ,execute:async()=>({ok:true})},
      {name:'write',risk:TOOL_RISK.WRITE,execute:async()=>({ok:true})},
      {name:'commit',risk:TOOL_RISK.COMMIT,execute:async()=>({sha:'abc'})}
    ]
  });
  assert(router.canUse('read',{allowedTools:['read'],maxRisk:TOOL_RISK.READ}).allowed);
  assert.strictEqual(router.canUse('write',{allowedTools:['write'],maxRisk:TOOL_RISK.READ}).reason,'RISK_LIMIT');
  assert.strictEqual(router.canUse('commit',{allowedTools:['commit']}).reason,'APPROVAL_REQUIRED');
  await assert.rejects(()=>router.execute('commit',{}, {allowedTools:['commit']}),/APPROVAL_REQUIRED/);
  assert(events.some(e=>e.type==='approval.requested'),'Approval event missing');
  const result=await router.execute('commit',{}, {allowedTools:['commit'],approved:true});
  assert.strictEqual(result.sha,'abc');
  assert(events.some(e=>e.type==='tool.requested'),'Tool requested event missing');
  assert(events.some(e=>e.type==='tool.completed'),'Tool completed event missing');
  console.log('tool guardrails tests: OK');
})().catch(error=>{console.error(error);process.exitCode=1;});
