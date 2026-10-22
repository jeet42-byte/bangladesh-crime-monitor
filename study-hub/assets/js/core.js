// Shared registry. Every data file calls HUB.add(kind, ...items), so adding a
// course/quiz/resource only means adding a data file and one <script> tag.
window.HUB = {
  courses: [],
  quizzes: [],
  resources: [],
  assignments: [],
  events: [],
  notices: [],
  classes: [],
  grading: null,
  views: {},

  add(kind, ...items) {
    this[kind].push(...items);
  },

  course(id) {
    return this.courses.find((c) => c.id === id);
  },
};
