const assert=require('assert');
const {VerificationPolicy}=require('../core/verification_policy');
(()=>{
 const p=new VerificationPolicy({requireJobs:true,requireArtifacts:true,artifactNames:['pognali-debug-apk']});
 const e={commit:'abc',runs:[{conclusion:'success',jobs:[{conclusion:'success'}],artifacts:[{name:'pognali-debug-apk'}]}]};
 let r=p.evaluate(e); assert.strictEqual(r.passed,true);
 r=p.evaluate({commit:'abc',runs:[{conclusion:'success',jobs:[{conclusion:'failure'}],artifacts:[]}]});
 assert.strictEqual(r.passed,false);
 console.log('verification policy tests passed');
})();
