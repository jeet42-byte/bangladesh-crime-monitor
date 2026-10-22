// Grading scale and default mark distribution used by the Grade & CGPA planner.
// Edit `components` to match your course outline; the final is out of `finalMax`.
HUB.grading = {
  scaleName: 'UGC Bangladesh uniform grading system',
  scale: [
    { min: 80, grade: 'A+', gp: 4.0 },
    { min: 75, grade: 'A', gp: 3.75 },
    { min: 70, grade: 'A-', gp: 3.5 },
    { min: 65, grade: 'B+', gp: 3.25 },
    { min: 60, grade: 'B', gp: 3.0 },
    { min: 55, grade: 'B-', gp: 2.75 },
    { min: 50, grade: 'C+', gp: 2.5 },
    { min: 45, grade: 'C', gp: 2.25 },
    { min: 40, grade: 'D', gp: 2.0 },
    { min: 0, grade: 'F', gp: 0.0 },
  ],
  components: [
    { name: 'Midterm', max: 20 },
    { name: 'Presentation', max: 10 },
    { name: 'Quiz', max: 10 },
    { name: 'Assignment', max: 5 },
    { name: 'Attendance', max: 5 },
  ],
  finalMax: 50,
};
