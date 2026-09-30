const FAILURE_CLASS=Object.freeze({
  PRODUCT:'PRODUCT',
  AGENT:'AGENT',
  TOOL:'TOOL',
  INFRASTRUCTURE:'INFRASTRUCTURE',
  TEST:'TEST',
  UNKNOWN:'UNKNOWN'
});

class FailureClassifier {
  constructor(options={}) { this.rules=options.rules||[]; }

  classify(input={}) {
    for(const rule of this.rules) {
      if(typeof rule.when==='function' && rule.when(input)) return {class:rule.class||FAILURE_CLASS.UNKNOWN,confidence:rule.confidence||'rule'};
    }
    if(input.failureClass && Object.values(FAILURE_CLASS).includes(input.failureClass)) return {class:input.failureClass,confidence:'explicit'};
    const source=String(input.source||input.errorType||input.reason||'').toLowerCase();
    if(/network|timeout|emulator|runner|ci|environment|connection|infrastructure/.test(source)) return {class:FAILURE_CLASS.INFRASTRUCTURE,confidence:'heuristic'};
    if(/tool|permission|denied|api/.test(source)) return {class:FAILURE_CLASS.TOOL,confidence:'heuristic'};
    if(/agent|model|prompt|planner/.test(source)) return {class:FAILURE_CLASS.AGENT,confidence:'heuristic'};
    if(/test|assert|flaky|false negative/.test(source)) return {class:FAILURE_CLASS.TEST,confidence:'heuristic'};
    if(/product|feature|behavior|bug/.test(source)) return {class:FAILURE_CLASS.PRODUCT,confidence:'heuristic'};
    return {class:FAILURE_CLASS.UNKNOWN,confidence:'none'};
  }
}
module.exports={FailureClassifier,FAILURE_CLASS};
