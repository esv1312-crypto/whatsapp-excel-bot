class CompanyMemory {
  constructor() {
    this.lessons = [];
  }

  addLesson(lesson) {
    if (!lesson || !lesson.lesson || lesson.verified !== true) throw new Error('Only verified lessons can enter company memory');
    this.lessons.push({...lesson, scope: 'company'});
    return this.lessons[this.lessons.length - 1];
  }

  search(query = '') {
    const text = String(query).toLowerCase();
    return this.lessons.filter(item => item.lesson.toLowerCase().includes(text));
  }

  list() { return [...this.lessons]; }
}

module.exports = { CompanyMemory };
