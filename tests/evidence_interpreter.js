const assert=require('assert');
const {EvidenceInterpreter}=require('../core/evidence_interpreter');
(()=>{
 const i=new EvidenceInterpreter();
 let r=i.interpret({commit:'abc',runs:[{conclusion:'success',jobs:[{conclusion:'success'}],steps:[{steps:[{conclusion:'success'}]}],artifacts:[{name:'apk'}]}]});
 assert.strictEqual(r.passed,true);
 r=i.interpret({commit:'abc',runs:[{conclusion:'failure'}]});
 assert.strictEqual(r.passed,false);
 r=i.interpret({commit:'abc',runs:[{status:'in_progress',conclusion:null}]});
 assert.strictEqual(r.pending,true);
 assert.strictEqual(r.passed,false);
 assert.strictEqual(r.checks.ci,null);
 console.log('evidence interpreter tests passed');
})();
