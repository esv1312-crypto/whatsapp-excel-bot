const assert = require('assert');
const { ExperienceStore } = require('../core/memory/experience_store');
const { LessonEngine } = require('../core/memory/lesson_engine');
const { CompanyMemory } = require('../core/memory/company_memory');
const { ProjectMemory } = require('../core/memory/project_memory');

(async () => {
  const store = new ExperienceStore();
  const experience = store.record({
    taskId: 'task-1',
    project: 'pognali3',
    specialist: 'developer',
    action: 'fixed CI',
    result: 'CI passed',
    failure: 'syntax error',
    solution: 'restored source formatting',
    evidence: { commit: 'abc123' },
    verification: { passed: true }
  });

  assert.strictEqual(store.list({ project: 'pognali3' }).length, 1);
  assert.strictEqual(store.findSimilar({ objective: 'fix syntax error in CI' })[0].id, experience.id);

  const lessons = new LessonEngine();
  const lesson = lessons.extract(experience);
  assert(lesson);
  assert.strictEqual(lesson.verified, true);

  const company = new CompanyMemory();
  company.addLesson(lesson);
  assert.strictEqual(company.list().length, 1);

  const project = new ProjectMemory();
  project.addLesson('pognali3', lesson);
  assert.strictEqual(project.search('pognali3', 'syntax').length, 1);
  assert.strictEqual(project.search('other-project', 'syntax').length, 0);

  console.log('memory tests: OK');
})();
