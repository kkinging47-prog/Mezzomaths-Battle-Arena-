import fs from 'node:fs'
import vm from 'node:vm'
import assert from 'node:assert/strict'
import {webcrypto} from 'node:crypto'
const data=new Map(),root={innerHTML:''},listeners={},alerts=[]
const context=vm.createContext({console,Date,JSON,Math,Uint8Array,crypto:webcrypto,TOPICS:[],supabase:null,isSupabaseConfigured:true,localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},document:{body:{},getElementById:()=>root,querySelector:()=>null,querySelectorAll:()=>[],addEventListener:(name,fn)=>listeners[name]=fn},window:{addEventListener(){}},MutationObserver:class{observe(){}},setInterval(){},setTimeout(){},requestAnimationFrame(){},alert:m=>alerts.push(m),FormData:class{constructor(form){this.form=form}entries(){return Object.entries(this.form.values)}},AbortSignal,fetch:async()=>({ok:false,json:async()=>({error:'Test connection failure'})})})
const source=fs.readFileSync(new URL('../src/bece-sunday-trial-window-v2.js',import.meta.url),'utf8').replace(/^import .*\n/gm,'')
vm.runInContext(source,context)
const original=JSON.stringify({candidate_id:'MSB-111111111111111111',full_name:'First candidate',registration_status:'confirmed'})
data.set('mezzo_bece_sunday_candidate',original)
const click=selector=>listeners.click({target:{closest:s=>s===selector?{}:null},preventDefault(){},stopImmediatePropagation(){}})
vm.runInContext('renderSundayHome()',context)
assert.ok(root.innerHTML.includes('data-sunday-new-candidate'))
click('[data-sunday-new-candidate]')
assert.ok(root.innerHTML.includes('Register a New Candidate'))
assert.ok(root.innerHTML.includes('data-sunday-cancel-new-candidate'))
assert.equal(data.get('mezzo_bece_sunday_candidate'),original)
click('[data-sunday-cancel-new-candidate]')
assert.ok(root.innerHTML.includes('First candidate'))
assert.equal(data.get('mezzo_bece_sunday_candidate'),original)
click('[data-sunday-new-candidate]')
context.supabase={};context.form={values:{full_name:'Second candidate',contact:'test-only',school_name:'Test',location:'Test',region:'Greater Accra',class_level:'Grade 9'},querySelector:()=>null}
await vm.runInContext('register(form)',context)
assert.equal(data.get('mezzo_bece_sunday_candidate'),original)
assert.ok(alerts.includes('Test connection failure'))
context.fetch=async()=>({ok:true,json:async()=>({candidate_id:'MSB-222222222222222222',full_name:'Second candidate',registration_status:'confirmed'})})
await vm.runInContext('register(form)',context)
assert.equal(JSON.parse(data.get('mezzo_bece_sunday_candidate')).full_name,'Second candidate')
assert.equal(vm.runInContext('registeringAnotherCandidate',context),false)
assert.equal(vm.runInContext('active',context),null)
console.log('PASS new form/cancel preserve old profile, failed registration preserves it, confirmed registration switches to the new candidate')
