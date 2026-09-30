class ToolPolicy {
  constructor(options={}) {
    this.defaultMaxRisk=options.defaultMaxRisk||'read';
    this.rules=options.rules||[];
  }

  evaluate(tool,context={}){
    const risk=tool.risk||'read';
    const maxRisk=context.maxRisk||this.defaultMaxRisk;
    const order={read:0,write:1,commit:2,ci:3,release:4,dangerous:5};
    if(order[risk]>order[maxRisk]) return {allowed:false,reason:'RISK_LIMIT'};
    for(const rule of this.rules){
      if(typeof rule.when==='function' && rule.when(tool,context) && typeof rule.allow==='function' && !rule.allow(tool,context)){
        return {allowed:false,reason:rule.reason||'POLICY_DENIED'};
      }
    }
    return {allowed:true};
  }
}
module.exports={ToolPolicy};
