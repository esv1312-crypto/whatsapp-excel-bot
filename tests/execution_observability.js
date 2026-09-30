const assert=require('assert');
const {HeartbeatManager,Watchdog,FailureClassifier,FAILURE_CLASS,ToolRouter,ToolPolicy}=require('../core');

(async()=>{
  const events=[];
  const bus={emit:(type,data)=>events.push({type,data})};
  const heartbeat=new HeartbeatManager({eventBus:bus});
  heartbeat.start({executionId:'e1',agentId:'a1',taskId:'t1',status:'RUNNING'});
  heartbeat.beat('e1',{currentStep:2,currentAction:'tool'});
  assert.strictEqual(heartbeat.get('e1').currentStep,2);
  assert(events.some(e=>e.type==='agent.heartbeat'));

  const watchdog=new Watchdog({eventBus:bus,timeoutMs:1});
  const stalled={...heartbeat.get('e1'),lastHeartbeatAt:new Date(Date.now()-100).toISOString()};
  const inspection=watchdog.inspect(stalled);
  assert.strictEqual(inspection.status,'STALLED');
  assert(events.some(e=>e.type==='watchdog.stalled'));

  const classifier=new FailureClassifier();
  assert.strictEqual(classifier.classify({failureClass:'INFRASTRUCTURE'}).class,FAILURE_CLASS.INFRASTRUCTURE);
  assert.strictEqual(classifier.classify({source:'tool permission denied'}).class,FAILURE_CLASS.TOOL);

  const router=new ToolRouter({
    policy:new ToolPolicy({defaultMaxRisk:'read'}),
    tools:[{name:'write',risk:'write',execute:async()=>true}]
  });
  assert.strictEqual(router.canUse('write',{}).reason,'RISK_LIMIT');
  assert.strictEqual(router.canUse('write',{maxRisk:'write'}).allowed,true);

  console.log('execution observability test: PASS');
})().catch(error=>{console.error(error);process.exitCode=1;});
