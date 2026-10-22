// Important dates, notices and the weekly class routine.
// `date` is YYYY-MM-DD (or YYYY-MM-DDTHH:MM). Use null while a date is still TBA —
// visitors can set a personal date for TBA items on the Forecast page.
HUB.add(
  'events',
  {
    id: 'rm-quiz-ch3',
    course: 'research-methods',
    type: 'Quiz',
    title: 'Quiz — Chapter 3: Qualitative Research Approaches',
    date: null,
    tentative: 'Expected around mid-September; room to be confirmed',
    note: 'MCQ + short essay. Slides (Class 4 & 5) + Bachman & Schutt pp. 235–247. FGDs excluded.',
    link: '#/exams/rm-ch3',
  },
  {
    id: 'rm-final',
    course: 'research-methods',
    type: 'Final exam',
    title: 'Research Methodology — Final exam',
    date: null,
    tentative: 'Date not announced yet',
    note: 'Final is marked out of 50 — use the Grade planner to see what you need.',
    link: '#/grades',
  }
);

HUB.add('notices', {
  course: 'research-methods',
  date: null,
  title: 'Quiz syllabus announced',
  body: 'Chapter 3: Qualitative Research Approaches — lecture content from slides (Class 4 and 5) and pages 235 to 247 of Coursebook 3, "Research in Criminology and Criminal Justice" by Bachman & Schutt. No need to go through FGDs for the quiz. Questions: a mix of multiple choice and short essay. Date to be announced; a room is likely to be available towards mid-September.',
});

// Weekly routine, e.g. { course: 'research-methods', day: 'Sunday', start: '10:00', end: '11:30', room: '' }
HUB.add('classes');
