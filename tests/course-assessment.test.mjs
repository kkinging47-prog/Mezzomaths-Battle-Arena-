import assert from 'node:assert/strict'
import {assessmentHtml,assessmentResultsHtml,gradeAssessment,assessmentQuestions} from '../src/course-assessment.js'
const q=[{q:'Which point is the vertex?',options:['P','Q','R','All'],answer:'B',explanation:'PRIVATE_EXPLANATION: the middle point Q is the vertex.'}]
assert.ok(!assessmentHtml(q,'final','final').includes('PRIVATE_EXPLANATION'))
assert.equal(gradeAssessment(q,{}),null)
assert.equal(assessmentResultsHtml(q,{}),'')
assert.equal(gradeAssessment(q,{0:'B'}).score,100)
assert.ok(assessmentResultsHtml(q,{0:'A'}).includes('PRIVATE_EXPLANATION'))
assert.ok(assessmentResultsHtml(q,{0:'A'}).includes('Incorrect'))
assert.ok(assessmentResultsHtml(q,{0:'B'}).includes('Correct ✓'))
const c={chapters:[{lessons:[{classwork_questions:q}],quiz:q}],final:q}
assert.equal(assessmentQuestions(c,'classwork','0-0'),q)
assert.equal(assessmentQuestions(c,'chapter','0'),q)
assert.equal(assessmentQuestions(c,'final','final'),q)
console.log('PASS: no explanation before submission, unanswered blocking, scores and explanations after submission, lesson classwork questions.')
