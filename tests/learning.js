const assert = require('assert');
const {ExperienceStore, LessonEngine, CompanyMemory, ProjectMemory} = require('../core');

const store = new ExperienceStore();
const experience = store.record({
  taskId: 'task-1',
  project: 'pognali3',
  action: 'fix CI SyntaxError',
  result: 'CI passed after source formatting repair',
  failure: 'SyntaxError from malformed newline encoding',
  solution: 'restore valid source formatting',
  verification: {passed: true},
  evidence: {commit: 'abc', tests: 'success'},
  lesson: 'Validate source syntax before running the full CI cycle.'
});
assert.strictEqual(store.findSimilar({failure:'SyntaxError newline'}).length, 1);

const engine = new LessonEngine();
const lesson = engine.extract(experience);
assert.ok(lesson);
assert.strictEqual(lesson.verified, true);

const company = new CompanyMemory();
company.addLesson(lesson);
assert.strictEqual(company.search('syntax').length, 1);

const project = new ProjectMemory();
project.addLesson('pognali3', lesson);
assert.strictEqual(project.search('pognali3', 'syntax').length, 1);
assert.strictEqual(project.search('other', 'syntax').length, 0);

console.log('Learning tests passed');
