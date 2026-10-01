class HttpActionProvider {
  constructor(options = {}) {
    this.url = options.url || process.env.OFFICE_ACTION_PROVIDER_URL;
    this.token = options.token || process.env.OFFICE_ACTION_PROVIDER_TOKEN || null;
    this.timeoutMs = options.timeoutMs || 120000;
    if (!this.url) throw new Error('OFFICE_ACTION_PROVIDER_URL is required');
  }

  async execute(task, orchestrator) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const body = {
        task,
        context: typeof orchestrator?.listTasks === 'function' ? orchestrator.listTasks() : []
      };
      const headers = { 'content-type': 'application/json' };
      if (this.token) headers.authorization = 'Bearer ' + this.token;
      const response = await fetch(this.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });
      const text = await response.text();
      if (!response.ok) throw new Error('Action provider HTTP ' + response.status + ': ' + text.slice(0, 500));
      let payload;
      try { payload = JSON.parse(text); } catch (_) { throw new Error('Action provider returned invalid JSON'); }
      if (!Array.isArray(payload.actions)) throw new Error('Action provider response must contain actions[]');
      return payload.actions;
    } finally {
      clearTimeout(timeout);
    }
  }
}

module.exports = { HttpActionProvider };
