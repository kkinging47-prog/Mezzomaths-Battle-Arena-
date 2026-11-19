import assert from 'node:assert/strict'
import {schoolSummaryHtml} from '../src/bece-school-report-utils.js'
const school={school_name:'Test School',summary:{registered:3,submitted:2,average_percent:48.75,not_started:1,not_submitted:0},topics:[{topic:'Fractions',correct:1,total:4,accuracy:25}],topic_coverage:{classified:4,total:4},students:[{full_name:'Ama <script>',status:'Submitted',score:22,total:40,percent:55},{full_name:'Kojo',status:'Submitted',score:17,total:40,percent:42.5},{full_name:'Esi',status:'Not started',score:null,total:null,percent:null}]}
const html=schoolSummaryHtml({week:'2026-11-15',mode:'sunday',is_final:true},school)
assert(html.includes('Student results'));assert(html.includes('Ama &lt;script&gt;'));assert(!html.includes('Ama <script>'));assert(html.includes('22/40'));assert(html.includes('55.0%'));assert(html.includes('17/40'));assert(html.includes('Esi'));assert(html.includes('Not started'));assert(!html.includes('null/null'));assert(html.includes('Fractions'));assert(html.includes('25% correct'));assert(html.includes('(4/4)'))
console.log('PASS summary student names, marks, percentages, non-submission status, topic priorities, and escaped HTML')
