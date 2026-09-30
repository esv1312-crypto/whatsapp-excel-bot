class ToolRouter {
  constructor(options = {}) {
    this.tools = new Map();
    this.policies = options.policies || {};
    this.eventBus = options.eventBus;
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
      risk: tool.risk || 'low'
    }));
  }

  canUse(name, context = {}) {
    const tool = this.tools.get(name);
    if (!tool) return { allowed: false, reason: 'UNKNOWN_TOOL' };

    const allowedTools = context.allowedTools;
    if (Array.isArray(allowedTools) && !allowedTools.includes(name)) {
      return { allowed: false, reason: 'TOOL_NOT_ALLOWED_FOR_AGENT' };
    }

    const policy = this.policies[name];
    if (policy && typeof policy === 'function' && !policy(context)) {
      return { allowed: false, reason: 'POLICY_DENIED' };
    }

    return { allowed: true };
  }

  async execute(name, input, context = {}) {
    const decision = this.canUse(name, context);
    if (!decision.allowed) throw new Error(`Tool ${name} denied: ${decision.reason}`);

    const tool = this.tools.get(name);
    this._emit('tool.requested', { name, input, context });
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

  _emit(type, payload) {
    if (this.eventBus && typeof this.eventBus.emit === 'function') {
      this.eventBus.emit(type, { type, ...payload });
    }
  }
}

module.exports = { ToolRouter };
