class Orchestrator{constructor(options={}){this.maxSteps=options.maxSteps||30;this.steps=0;}canContinue(){return this.steps<this.maxSteps;}step(){if(!this.canContinue())throw new Error('Execution step limit reached');return ++this.steps;}}
module.exports={Orchestrator};
