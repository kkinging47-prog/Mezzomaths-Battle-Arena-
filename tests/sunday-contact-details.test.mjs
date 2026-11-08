import assert from 'node:assert/strict'
import handler from '../server/bece-sunday-candidate-access.js'
import {normaliseSundayPhone,sundayContactDetails} from '../src/sunday-contact-details.js'
import {signHistoryAccess} from '../server/bece-sunday-history.js'
process.env.SUPABASE_URL='https://mock.supabase.co';process.env.SUPABASE_SERVICE_ROLE_KEY='test';process.env.BECE_SUNDAY_SESSION_SECRET='test'
assert.equal(normaliseSundayPhone('024 123 4567'),'+233241234567');assert.equal(normaliseSundayPhone('00233241234567'),'+233241234567');assert.equal(normaliseSundayPhone('+44 7700 900123'),'+447700900123');assert.equal(normaliseSundayPhone('not-a-phone'),'')
assert.throws(()=>sundayContactDetails({email:'test@example.com'}),/phone number/);assert.throws(()=>sundayContactDetails({phone_number:'0241234567'}),/email address/);assert.equal(sundayContactDetails({phone_number:'0241234567',email:' TEST@EXAMPLE.COM '}).email,'test@example.com');assert.equal(sundayContactDetails({phone_number:'0241234567',email:'test@example.com'}).reminder_opt_in,false)
const id='MSB-1234567890ABCDEF12';let registration,patch,requests=0
const reply=value=>new Response(JSON.stringify(value))
globalThis.fetch=async(url,opts={})=>{requests++;if(url.includes('register_or_recover_sunday_candidate')){registration=JSON.parse(opts.body).p_details;return reply({candidate_id:id,contact:registration.contact})}if(url.includes('bece_sunday_trial_registrations')){if(opts.method==='PATCH'){patch=JSON.parse(opts.body);assert(url.includes(id));return reply([{}])}return reply([{reminder_opt_in:false,reminder_consent_at:null}])}if(url.includes('school-suggestions'))return reply([]);return reply([])}
const run=async body=>{let result;await handler({method:'POST',body,headers:{}},{status(n){this.code=n;return this},setHeader(){},json(body){result={status:this.code,body}}});return result}
const base={action:'register',full_name:'Synthetic Test Candidate',school_name:'Synthetic Test School',location:'Accra',region:'Greater Accra',class_level:'Grade 9'}
assert.equal((await run({...base,email:'test@example.com'})).status,400);assert.equal((await run({...base,phone_number:'0241234567'})).status,400);assert.equal(requests,0)
assert.equal((await run({...base,phone_number:'0241234567',email:'TEST@example.com',reminder_opt_in:true})).status,200);assert.equal(registration.phone_number,'+233241234567');assert.equal(registration.email,'test@example.com');assert.equal(registration.contact,'+233241234567');assert.equal(registration.reminder_opt_in,true)
assert.equal((await run({action:'restore-legacy',full_name:base.full_name,contact:'old@example.com'})).status,200);assert.equal(registration.recover_only,true)
assert.equal((await run({action:'update-contacts',candidate_id:id,phone_number:'0241234567',email:'test@example.com'})).status,403)
assert.equal((await run({action:'update-contacts',history_token:signHistoryAccess(id),phone_number:'0241234567',email:'test@example.com',reminder_opt_in:true})).status,200);assert(patch.reminder_consent_at);assert(!('contact' in patch));assert(!('candidate_id' in patch))
console.log('PASS compulsory phone and email, Ghana/international formats, opt-in default, legacy recovery, signed update proof and unchanged identity contact')
