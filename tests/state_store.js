const assert=require('assert');
const fs=require('fs');
const os=require('os');
const path=require('path');
const {StateStore}=require('../core/state_store');

(()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ai-office-state-'));
  const file=path.join(dir,'state.json');
  const first=new StateStore({filePath:file});
  first.update({tasks:{t1:{status:'IN_PROGRESS'}},projects:{p1:{status:'ACTIVE'}}});
  const second=new StateStore({filePath:file});
  const restored=second.load();
  assert.strictEqual(restored.tasks.t1.status,'IN_PROGRESS');
  assert.strictEqual(restored.projects.p1.status,'ACTIVE');
  assert(restored.updatedAt);
  second.update({tasks:{t1:{status:'COMPLETED'}}});
  assert.strictEqual(new StateStore({filePath:file}).load().tasks.t1.status,'COMPLETED');
  second.clear();
  assert.strictEqual(fs.existsSync(file),false);
  console.log('state store tests: OK');
})();
