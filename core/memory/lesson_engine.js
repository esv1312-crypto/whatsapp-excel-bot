class LessonEngine {
  constructor(options = {}) {
    this.minEvidence = options.minEvidence !== false;
  }

  extract(experience = {}) {
    if (!experience.taskId) throw new Error('taskId is required');
    const verification = experience.verification || {};
    const passed = verification.passed === true || verification.evaluation?.passed === true;
    if (this.minEvidence && !this.hasEvidence(experience.evidence, verification)) return null;
    if (!experience.failure && !experience.solution && !experience.lesson) return null;

    return {
      id: experience.id ? `${experience.id}:lesson` : `lesson-${Date.now()}`,
      taskId: experience.taskId,
      project: experience.project || null,
      lesson: experience.lesson || (experience.failure && experience.solution
        ? `Failure: ${experience.failure}. Solution: ${experience.solution}.`
        : null),
      sourceExperience: experience.id || null,
      verified: passed,
      createdAt: new Date().toISOString()
    };
  }

  hasEvidence(evidence, verification) {
    return !!evidence || verification.passed === true || !!verification.evidence;
  }
}

module.exports = { LessonEngine };
