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
  console.log('DEBUG_WATCHDOG',JSON.stringify({timeoutMs:watchdog.timeoutMs,inspection:watchdog.inspect(stale),hasOnRecover:typeof watchdog.onRecover}));
  const result=await watchdog.recover(stale);
  console.log('DEBUG_WATCHDOG_RESULT',JSON.stringify(result));

  assert.equal(result.status,'RECOVERED');
  assert.equal(recovered,true);
  assert.equal(events[0][0],'stalled');
  assert.equal(events[1][0],'recovered');

  const backgroundHeartbeat=new HeartbeatManager({eventBus:bus});
  backgroundHeartbeat.start({
    executionId:'worker:task-bg',
    taskId:'task-bg',
    status:'RUNNING',
    lastHeartbeatAt:new Date(Date.now()-1000).toISOString()
  });
  let backgroundRecovered=false;
  const backgroundWatchdog=new Watchdog({
    timeoutMs:100,
    intervalMs:10,
    heartbeat:backgroundHeartbeat,
    eventBus:bus,
    onRecover:async execution=>{
      backgroundRecovered=true;
      backgroundHeartbeat.stop(execution.executionId,{status:'RECOVERED'});
      return {action:'RESTART_EXECUTION',executionId:execution.executionId};
    }
  });
  backgroundWatchdog.start();
  await new Promise(resolve=>setTimeout(resolve,30));
  backgroundWatchdog.stop();
  assert.equal(backgroundRecovered,true);

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
