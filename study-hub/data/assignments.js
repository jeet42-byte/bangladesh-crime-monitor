// Assignment guides. Every section is optional — omit what does not apply.
//   instructions  what the instructor asked for (quote it where possible)
//   structure     suggested headings, each { h, tip }
//   definitions   { term, def, cite }
//   theories      { name, gist, cite }
//   classification{ name, items: [] }
//   references    APA 7 entries, each { apa, intext }
HUB.add(
  'assignments',
  {
    id: 'rm-interview-guide',
    course: 'research-methods',
    title: 'Research report — Semi-structured interview guide',
    kind: 'Class exercise',
    due: null,
    instructions: [
      '"Create 10/12 semi-structured interview questions for your research report." (Chapter 3 slides, Class 5)',
    ],
    overview:
      'You are writing the data-collection instrument for your own qualitative research report. The questions must be open-ended and organized around core themes, with follow-up probes, so they let respondents describe their experiences in their own words (intensive interviewing) while keeping the interview focused on your research question.',
    structure: [
      { h: '1. Research title & research question', tip: 'One clear "how/why/what is it like" question — qualitative questions are exploratory, not hypotheses.' },
      { h: '2. Objectives of the interview', tip: '2–3 objectives that the question themes map onto.' },
      { h: '3. Why semi-structured interviews?', tip: 'Contrast with structured and unstructured interviews; justify the balance of focus and flexibility.' },
      { h: '4. Participants & sampling', tip: 'Who, how many, and how found — purposive, snowball or theoretical sampling.' },
      { h: '5. Ethics', tip: 'Informed consent, voluntary participation, confidentiality and anonymity, right to stop, researcher safety.' },
      { h: '6. Interview guide', tip: 'Opening/rapport questions → 8–10 core questions grouped by theme, each with 1–2 probes → closing question.' },
      { h: '7. References', tip: 'APA 7. Cite the textbook for every methodological claim.' },
    ],
    sample: {
      title: 'Example guide — Women\'s experiences of sexual harassment on public transport in Dhaka',
      items: [
        { q: 'To begin, could you tell me a little about how you usually travel around the city?', p: 'Which routes? At what times?', theme: 'Opening / rapport' },
        { q: 'How do you feel when you are travelling on a bus or leguna during rush hour?', p: 'Can you describe a typical journey?', theme: 'Lived experience' },
        { q: 'Could you describe an experience of harassment you faced or witnessed while travelling?', p: 'What happened next? How did others react?', theme: 'Lived experience' },
        { q: 'What went through your mind at that moment?', p: 'Why do you think you felt that way?', theme: 'Meaning-making' },
        { q: 'How, if at all, has this changed the way you travel?', p: 'Routes, clothing, travelling with others?', theme: 'Coping & adaptation' },
        { q: 'Who, if anyone, did you tell about it?', p: 'What made you decide to tell — or not tell?', theme: 'Help-seeking' },
        { q: 'What are your thoughts about reporting such incidents to the police?', p: 'Have you or anyone you know tried? What happened?', theme: 'Formal response' },
        { q: 'How do bus staff and other passengers usually respond?', p: 'Can you give an example?', theme: 'Bystanders' },
        { q: 'In your view, why does harassment happen so often on public transport?', p: 'What do you mean by …?', theme: 'Perceived causes' },
        { q: 'What would make you feel safer while travelling?', p: 'Who should be responsible for that?', theme: 'Solutions' },
        { q: 'Is there anything else about your experience that you think I should know?', p: '', theme: 'Closing' },
      ],
    },
    definitions: [
      { term: 'Semi-structured interview', def: 'Uses open-ended core questions; the interviewer can explore unexpected topics and ask follow-up probes while keeping the session focused.', cite: 'Lecture slides, Class 5' },
      { term: 'Intensive interviewing', def: 'Open-ended, relatively unstructured questioning in which the interviewer seeks in-depth information on the interviewee\'s feelings, experiences and/or perceptions.', cite: 'Bachman & Schutt, p. 237' },
      { term: 'Phenomenology', def: 'A qualitative approach that explores how individuals experience and make sense of phenomena — the subjective meanings of lived experience.', cite: 'Lecture slides, Class 5' },
      { term: 'Thick description', def: 'A rich description that conveys a sense of what it is like from the standpoint of the participants in that setting.', cite: 'Geertz (1973), in Bachman & Schutt, p. 240' },
      { term: 'Theoretical sampling', def: 'A sample drawn sequentially, with settings or individuals selected as earlier observations or interviews indicate that they are influential.', cite: 'Glaser & Strauss (1967), in Bachman & Schutt, p. 247' },
    ],
    theories: [
      { name: 'Inductive reasoning', gist: 'Start with exploratory questions and let categories emerge from participants\' own words (as Decker & Van Winkle did), instead of testing a hypothesis.', cite: 'Bachman & Schutt, pp. 237, 240' },
      { name: 'Phenomenology', gist: 'Frame core questions around "what is it like…" and "how did you make sense of…" to reach lived experience.', cite: 'Lecture slides; Moustakas (1994)' },
      { name: 'Grounded theory', gist: 'Collection and analysis proceed together; theoretical sampling decides whom to interview next.', cite: 'Glaser & Strauss (1967)' },
    ],
    classification: [
      { name: 'Interview types', items: ['Structured — fixed questions, fixed order', 'Semi-structured — core open questions + probes', 'Unstructured — broad opening, respondent leads'] },
      { name: 'Question types in a guide', items: ['Opening / rapport (innocuous, as Jody Miller did)', 'Core thematic questions', 'Probes ("Can you give an example?", "What do you mean by…?")', 'Closing ("Anything else…?")'] },
    ],
    tips: [
      'Ask open "how / what / describe" questions; avoid yes/no and leading questions ("Don\'t you think the police are useless?").',
      'One idea per question — no double-barrelled questions.',
      'Move from easy and non-sensitive to sensitive topics, as Jody Miller (2000) did to build rapport.',
      'Write probes under each core question; they are what make the interview semi-structured.',
      'Use language your respondents use (Whyte learned Italian; Decker & Van Winkle used gang members\' own categories).',
    ],
    references: [
      { apa: 'Bachman, R., & Schutt, R. K. (Year). <i>The practice of research in criminology and criminal justice</i> (ed.). SAGE.', intext: '(Bachman & Schutt, Year, p. 237)', note: 'Fill in the year and edition from your copy\'s title page.' },
      { apa: 'Decker, S. H., & Van Winkle, B. (1996). <i>Life in the gang: Family, friends, and violence</i>. Cambridge University Press.', intext: '(Decker & Van Winkle, 1996)' },
      { apa: 'Geertz, C. (1973). <i>The interpretation of cultures</i>. Basic Books.', intext: '(Geertz, 1973)' },
      { apa: 'Glaser, B. G., & Strauss, A. L. (1967). <i>The discovery of grounded theory: Strategies for qualitative research</i>. Aldine.', intext: '(Glaser & Strauss, 1967)' },
      { apa: 'Miller, J. (2000). <i>One of the guys: Girls, gangs, and gender</i>. Oxford University Press.', intext: '(Miller, 2000)' },
      { apa: 'Moustakas, C. (1994). <i>Phenomenological research methods</i>. SAGE.', intext: '(Moustakas, 1994)' },
      { apa: 'Whyte, W. F. (1943). <i>Street corner society: The social structure of an Italian slum</i>. University of Chicago Press.', intext: '(Whyte, 1943)' },
    ],
  },
  {
    id: 'rm-presentation',
    course: 'research-methods',
    title: 'Presentation — topic brief template',
    kind: 'Presentation',
    due: null,
    pending: 'Add your presentation topic and the instructor\'s guidelines in data/assignments.js to turn this template into a topic brief.',
    overview:
      'A reusable outline for a criminology presentation. Replace each heading\'s tip with content for your own topic.',
    structure: [
      { h: '1. Introduction & background', tip: 'Why the topic matters; a statistic or case from Bangladesh as a hook.' },
      { h: '2. Key definitions', tip: 'Define every core concept and cite the source (textbook first).' },
      { h: '3. Classification / types', tip: 'Break the phenomenon into types — a table works well on slides.' },
      { h: '4. Relevant theories', tip: 'Two or three theories; for each: core claim, how it explains the topic, one limitation.' },
      { h: '5. Research approach / evidence', tip: 'What studies exist and which method they used (ethnography, case study, interviews…).' },
      { h: '6. Bangladesh context / case study', tip: 'Apply the theories to a local case.' },
      { h: '7. Critical evaluation', tip: 'Strengths, gaps, ethical issues.' },
      { h: '8. Conclusion & recommendations', tip: 'Answer the opening question; 2–3 recommendations.' },
      { h: '9. References', tip: 'APA 7 — use the citation helper below.' },
    ],
  }
);
