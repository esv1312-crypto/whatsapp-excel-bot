class ProjectMemory {
  constructor() {
    this.byProject = new Map();
  }

  addLesson(project, lesson) {
    if (!project) throw new Error('project is required');
    if (!lesson || !lesson.lesson || lesson.verified !== true) throw new Error('Only verified lessons can enter project memory');
    const list = this.byProject.get(project) || [];
    const stored = {...lesson, scope: 'project', project};
    list.push(stored);
    this.byProject.set(project, list);
    return stored;
  }

  search(project, query = '') {
    const text = String(query).toLowerCase();
    return (this.byProject.get(project) || []).filter(item => item.lesson.toLowerCase().includes(text));
  }

  list(project) { return [...(this.byProject.get(project) || [])]; }
}

module.exports = { ProjectMemory };
