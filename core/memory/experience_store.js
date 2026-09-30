class ExperienceStore {
  constructor(options = {}) {
    this.experiences = options.experiences || [];
    this.maxEntries = options.maxEntries || 1000;
  }

  record(experience = {}) {
    if (!experience.taskId) throw new Error('taskId is required');
    if (!experience.result) throw new Error('result is required');
    const entry = {
      id: experience.id || `experience-${Date.now()}-${this.experiences.length + 1}`,
      taskId: experience.taskId,
      project: experience.project || null,
      specialist: experience.specialist || null,
      action: experience.action || null,
      result: experience.result,
      verification: experience.verification || null,
      failure: experience.failure || null,
      solution: experience.solution || null,
      lesson: experience.lesson || null,
      evidence: experience.evidence || null,
      createdAt: experience.createdAt || new Date().toISOString()
    };
    this.experiences.push(entry);
    if (this.experiences.length > this.maxEntries) this.experiences.shift();
    return entry;
  }

  list(filters = {}) {
    return this.experiences.filter(entry =>
      (!filters.project || entry.project === filters.project) &&
      (!filters.specialist || entry.specialist === filters.specialist) &&
      (!filters.taskId || entry.taskId === filters.taskId)
    );
  }

  findSimilar(query = {}) {
    const text = [query.objective, query.failure, query.lesson, ...(query.requiredSkills || [])]
      .filter(Boolean).join(' ').toLowerCase();
    if (!text) return [];
    const terms = new Set(text.split(/\W+/).filter(term => term.length > 2));
    return this.experiences
      .map(entry => {
        const candidate = [entry.action, entry.result, entry.failure, entry.solution, entry.lesson, ...(entry.skills || [])]
          .filter(Boolean).join(' ').toLowerCase();
        const matches = [...terms].filter(term => candidate.includes(term)).length;
        return { entry, score: matches };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.entry);
  }
}

module.exports = { ExperienceStore };
