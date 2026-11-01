import assert from 'node:assert/strict'
import {schoolNameSimilarity,schoolNameIndex,matchingSchool} from '../src/school-names.js'
import {buildSchoolReports} from '../src/bece-school-report-utils.js'
import access from '../server/bece-sunday-candidate-access.js'
assert.equal(schoolNameSimilarity(' NT. AIM  High School Complex ','ntaimhighschoolcomplex'),1)
assert.equal(schoolNameSimilarity('abcdefghij','abcxefghyz'),0.7)
assert.equal(matchingSchool('abcdefghij',['abcxefghyz']),'abcxefghyz')
assert.equal(matchingSchool('abcdefghij',['abcxefwxyz']),null)
assert.equal(matchingSchool('.',['NT Aim High School Complex']),null)
assert.equal(matchingSchool('Mart Beck International school',['Gracewill International School']),null)
assert.equal(matchingSchool('Springside School',['Springside Montessori School']),'Springside Montessori School')
const names=['NT Aim High School Complex','NT Aim High School Complex','nt.aim high school complex','NT Aim High School Complexx','Springside School','Springside School ','.']
const index=schoolNameIndex(names)
assert.deepEqual(index.schools,['NT Aim High School Complex','Springside School'])
assert.equal(index.canonical('NT Aim High School Complexx'),'NT Aim High School Complex')
assert.deepEqual(schoolNameIndex(names.slice().reverse()).schools,index.schools)
const registrations=names.map((school_name,i)=>({candidate_id:String(i),full_name:'Student '+i,school_name}))
const report=buildSchoolReports(registrations,[],{week:'2026-11-01'})
assert.equal(report.schools.length,3)
assert.equal(report.schools.find(s=>s.school_name==='NT Aim High School Complex').summary.registered,4)
assert.equal(registrations[2].school_name,'nt.aim high school complex')
process.env.SUPABASE_URL='https://mock.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test'
let registrationPayload
globalThis.fetch=async(url,options={})=>{
 if(url.includes('register_or_recover_sunday_candidate')) {registrationPayload=JSON.parse(options.body);return new Response(JSON.stringify({candidate_id:'MSB-123456789012345678'}))}
 if(url.includes('bece_sunday_trial_registrations?'))return new Response(JSON.stringify(names.map(school_name=>({school_name}))))
 if(url.includes('bece_sunday_schools?'))return new Response('[]')
 throw Error('Unexpected request '+url)
}
const run=async body=>{let out;await access({method:'POST',body},{setHeader(){},status(code){this.code=code;return this},json(data){out={code:this.code,data}}});return out}
const suggestions=await run({action:'school-suggestions'})
assert.equal(suggestions.code,200)
assert.deepEqual(suggestions.data,{schools:index.schools})
await run({action:'register',full_name:'Test Candidate',contact:'test@example.org',school_name:'NT Aim High School Complexx',location:'Test',region:'Eastern',class_level:'JHS 3'})
assert.equal(registrationPayload.p_details.school_name,'NT Aim High School Complex')
assert.equal((await run({action:'register',full_name:'Test Candidate',contact:'test@example.org',school_name:'.',location:'Test',region:'Eastern'})).code,400)
console.log('PASS exact 70% boundary, below-threshold separation, punctuation/case, deterministic canonical names, existing report grouping, originals preserved, public names-only suggestions and registration canonicalization')
