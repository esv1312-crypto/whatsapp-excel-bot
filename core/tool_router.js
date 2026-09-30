const TOOL_RISK=Object.freeze({
  READ:'read',
  WRITE:'write',
  COMMIT:'commit',
  CI:'ci',
  RELEASE:'release',
  DANGEROUS:'dangerous'
});

const RISK_ORDER=Object.freeze({
  [TOOL_RISK.READ]:0,
  [TOOL_RISK.WRITE]:1,
  [TOOL_RISK.COMMIT]:2,
  [TOOL_RISK.CI]:3,
  [TOOL_RISK.RELEASE]:4,
  [TOOL_RISK.DANGEROUS]:5
});

class ToolRouter {
  constructor(options = {}) {
    this.tools = new Map();
    this.policies = options.policies || {};
    this.eventBus = options.eventBus;
    this.approvalPolicy = options.approvalPolicy || null;
    this.policy = options.policy || null;
    for (const tool of options.tools || []) this.register(tool);
  }

  register(tool) {
    if (!tool || !tool.name || typeof tool.execute !== 'function') {
      throw new Error('Tool must have name and execute function');
    }
    this.tools.set(tool.name, tool);
    return tool;
  }

  list() {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description || '',
      risk: tool.risk || TOOL_RISK.READ
    }));
  }

  canUse(name, context = {}) {
    const tool = this.tools.get(name);
    if (!tool) return { allowed: false, reason: 'UNKNOWN_TOOL' };

    if (this.policy && typeof this.policy.evaluate === 'function') {
      const policyDecision=this.policy.evaluate(tool,context);
      if (!policyDecision.allowed) return policyDecision;
    }

    const allowedTools = context.allowedTools;
    if (Array.isArray(allowedTools) && !allowedTools.includes(name)) {
      return { allowed: false, reason: 'TOOL_NOT_ALLOWED_FOR_AGENT' };
    }

    const policy = this.policies[name];
    if (policy && typeof policy === 'function' && !policy(context)) {
      return { allowed: false, reason: 'POLICY_DENIED' };
    }

    const risk = tool.risk || TOOL_RISK.READ;
    const threshold = context.maxRisk || null;
    if (threshold && RISK_ORDER[risk] > RISK_ORDER[threshold]) {
      return { allowed: false, reason: 'RISK_LIMIT' };
    }

    const approvalRequired = this._requiresApproval(tool, context);
    if (approvalRequired && context.approved!==true) {
      return { allowed: false, reason: 'APPROVAL_REQUIRED' };
    }

    return { allowed: true, risk, approvalRequired };
  }

  async execute(name, input, context = {}) {
    const decision = this.canUse(name, context);
    if (!decision.allowed) {
      this._emit(decision.reason === 'APPROVAL_REQUIRED' ? 'approval.requested' : 'tool.denied', {
        name, input, context, reason: decision.reason
      });
      throw new Error(`Tool ${name} denied: ${decision.reason}`);
    }

    const tool = this.tools.get(name);
    this._emit('tool.requested', { name, input, context, risk: decision.risk });
    const startedAt = Date.now();

    try {
      const result = await tool.execute(input, context);
      this._emit('tool.completed', {
        name,
        durationMs: Date.now() - startedAt,
        result
      });
      return result;
    } catch (error) {
      this._emit('tool.failed', {
        name,
        durationMs: Date.now() - startedAt,
        error: error.message
      });
      throw error;
    }
  }

  _requiresApproval(tool, context) {
    if (typeof this.approvalPolicy === 'function') return this.approvalPolicy(tool, context) === true;
    return RISK_ORDER[tool.risk || TOOL_RISK.READ] >= RISK_ORDER[TOOL_RISK.COMMIT];
  }
}

module.exports = { ToolRouter, TOOL_RISK, RISK_ORDER };