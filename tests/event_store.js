const assert=require('assert');
const fs=require('fs');
const os=require('os');
const path=require('path');
const {StateStore}=require('../core/state_store');
const {EventStore}=require('../core/event_store');

(()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ai-office-events-'));
  const state=new StateStore({filePath:path.join(dir,'state.json')});
  const events=new EventStore({stateStore:state});
  events.append({type:'task.created',taskId:'t1',project:'pognali3'});
  events.append({type:'task.failed',taskId:'t1',project:'pognali3'});
  events.append({type:'task.completed',taskId:'t2',project:'other'});
  assert.strictEqual(events.list({taskId:'t1'}).length,2);
  assert.strictEqual(events.list({project:'pognali3'}).length,2);

  const restored=new EventStore({stateStore:state});
  restored.load();
  assert.strictEqual(restored.list({taskId:'t1'}).length,2);
  assert.strictEqual(restored.list({type:'task.failed'}).length,1);

  console.log('event store tests: OK');
})();
