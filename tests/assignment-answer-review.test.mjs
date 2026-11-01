import assert from 'node:assert/strict'
import {responseOutcome,displayAnswer,studentAnswerReview} from '../src/assignment-answer-review.js'
const q={position:1,question_text:'2 + 2 < 5?',option_a:'4',option_b:'5',correct_answer:'A',explanation:'Add two.'}
assert.equal(displayAnswer(q,'a'),'A. 4')
assert.equal(displayAnswer({question_type:'short_text'},'A'),'A')
for(const [r,key] of [[null,'missing'],[{grading_status:'pending'},'pending'],[{selected_answer:''},'unanswered'],[{selected_answer:'B',is_correct:false},'wrong'],[{selected_answer:'A',is_correct:true},'correct'],[{selected_answer:'working',awarded_marks:1,max_marks:2},'partial']])assert.equal(responseOutcome(r).key,key)
const a={id:'a1',participant_name:'<script>alert(1)</script>',score:1,total:2}
const html=studentAnswerReview(a,[{position:2,question_text:'Explain',question_type:'reasoning',marking:'teacher_review',correct_answer:'Model'},q],[{attempt_id:'a1',question_position:1,selected_answer:'B',correct_answer:'A',is_correct:false,awarded_marks:0,max_marks:1},{attempt_id:'a1',question_position:2,selected_answer:'My working',grading_status:'pending',max_marks:1},{attempt_id:'other',question_position:1,selected_answer:'PRIVATE OTHER ANSWER',is_correct:true}])
assert(html.includes('B. 5'));assert(html.includes('A. 4'));assert(html.includes('Wrong'));assert(html.includes('Awaiting marking'));assert(!html.includes('PRIVATE OTHER ANSWER'));assert(!html.includes('<script>'));assert(html.includes('&lt;script&gt;'));assert(html.indexOf('Question 1')<html.indexOf('Question 2'))
console.log('PASS correct/wrong/partial/unanswered/pending states, answer labels, student isolation, question order and HTML escaping.')
