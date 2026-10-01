const assert=require('assert');
const {Watchdog}=require('../core/watchdog');
const {HeartbeatManager}=require('../core/heartbeat');
const {EventBus}=require('../core/event_bus');

async function run(){
  const bus=new EventBus();
  const heartbeat=new HeartbeatManager({eventBus:bus});
  const events=[];
  bus.on('watchdog.stalled',e=>events.push(['stalled',e]));
  bus.on('watchdog.recovered',e=>events.push(['recovered',e]));

  let recovered=false;
  const watchdog=new Watchdog({
    timeoutMs:100,
    eventBus:bus,
    heartbeat,
    onRecover:async(execution,inspection)=>{
      recovered=true;
      assert.equal(inspection.reason,'HEARTBEAT_TIMEOUT');
      return {action:'RESTART_EXECUTION',executionId:execution.executionId};
    }
  });

  const stale={
    executionId:'worker:task-1',
    taskId:'task-1',
    status:'RUNNING',
    lastHeartbeatAt:new Date(Date.now()-1000).toISOString()
  };
  const result=await watchdog.recover(stale);

  assert.equal(result.status,'RECOVERED');
  assert.equal(recovered,true);
  assert.equal(events[0][0],'stalled');
  assert.equal(events[1][0],'recovered');

  const fresh={
    executionId:'worker:task-2',
    taskId:'task-2',
    status:'RUNNING',
    lastHeartbeatAt:new Date().toISOString()
  };
  const healthy=await watchdog.recover(fresh);
  assert.equal(healthy.status,'HEALTHY');

  console.log('watchdog heartbeat recovery: PASS');
}
if(require.main===module)run().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={run};
