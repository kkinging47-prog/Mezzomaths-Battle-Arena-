import assert from 'node:assert/strict'
import {createFootballResultsStore} from '../src/football-results-store.js'
const cache=new Map(),storage={getItem:k=>cache.get(k)||null,setItem:(k,v)=>cache.set(k,v)},db=new Map()
let fail=false,acceptThenFail=false,insertGate=null,insertCalls=0
const client={from(table){assert.equal(table,'game_score_records');const filters={};let columns='';return{
 async insert(row){insertCalls++;if(insertGate){const wait=insertGate;insertGate=null;await wait}if(fail)return{error:{code:'OFFLINE'}};if(db.has(row.id))return{error:{code:'23505'}};db.set(row.id,row);if(acceptThenFail){acceptThenFail=false;return{error:{code:'NETWORK'}}}return{error:null}},
 select(value){columns=value;return this},eq(k,v){filters[k]=v;return this},order(){return this},limit(){return this},
 async maybeSingle(){const row=db.get(filters.id);return{data:row?.user_id===filters.user_id?{id:row.id}:null,error:null}},
 then(resolve,reject){assert.equal(filters.mode,'maths_football');return Promise.resolve({data:[...db.values()].filter(r=>r.user_id===filters.user_id&&r.mode===filters.mode),error:null}).then(resolve,reject)}
}}}
const config={class_level:'Grade 4',curriculum:'Cambridge',topic:'Fractions',kit:'gold',pace:'club',question_mode:'balanced'}
const summary={goals:3,opponentGoals:2,correct:4,answered:5,total:5,seconds:80,outcome:'Win',answers:[]}
const store=createFootballResultsStore({client,storage})
assert.equal(store.save(summary,config,'guest'),false);assert.equal(insertCalls,0)
store.setOwner('user-a');fail=true;store.save(summary,config,'match-1');await store.sync();assert.equal(store.getStatus(),'offline');assert.equal(store.getRecords().length,1)
const restored=createFootballResultsStore({client,storage});restored.setOwner('user-a');assert.equal(restored.getRecords()[0].id,'match-1')
fail=false;await restored.sync();assert.equal(restored.getStatus(),'saved');assert.equal(db.size,1);assert.equal(db.get('match-1').score,4);assert.equal(db.get('match-1').metadata.goals,3)
const secondDevice=createFootballResultsStore({client,storage:{getItem(){return null},setItem(){}}});secondDevice.setOwner('user-a');await secondDevice.sync();assert.equal(secondDevice.getRecords()[0].id,'match-1')
acceptThenFail=true;restored.save(summary,config,'match-2');await restored.sync();assert.equal(restored.getStatus(),'offline');await restored.sync();assert.equal(restored.getStatus(),'saved');assert.equal(db.size,2)
let release;insertGate=new Promise(resolve=>release=resolve);restored.save(summary,config,'match-3');restored.setOwner('user-b');release();await Promise.resolve();await restored.sync();assert.equal(restored.getRecords().length,0)
restored.setOwner('user-a');await restored.sync();assert.equal(db.size,3);assert.equal(restored.getRecords().length,3)
restored.setOwner(null);assert.equal(restored.getRecords().length,0);assert.equal(restored.getStatus(),'signed-out')
console.log('PASS account-only football saves, offline reload/retry, duplicate receipts after uncertain writes, second-device restore and isolation during account switches.')
// Progress survives history truncation, carries forward into later low-level games, and stays account-scoped.
restored.setOwner('user-a');await restored.sync();restored.save({...summary,level:4,passed:true,unlockedLevel:5},config,'career-5');await restored.sync();assert.equal(restored.getUnlockedLevel(),5)
restored.save({...summary,level:1,passed:false,unlockedLevel:1},config,'replay-1');await restored.sync();assert.equal(db.get('replay-1').metadata.unlockedLevel,5)
const freshCareer=createFootballResultsStore({client,storage:{getItem(){return null},setItem(){}}});freshCareer.setOwner('user-a');await freshCareer.sync();assert.equal(freshCareer.getUnlockedLevel(),5);freshCareer.setOwner('user-b');assert.equal(freshCareer.getUnlockedLevel(),1)
const oldWin={...db.get('career-5'),id:'old-win',created_at:'2020-01-01T00:00:00Z'}
let queriedCareer=false
const trimmedClient={from(){let columns;return {select(v){columns=v;return this},eq(){return this},order(){return this},limit(){return this},then(resolve){if(columns==='metadata')queriedCareer=true;return Promise.resolve({data:columns==='metadata'?[oldWin]:[{...db.get('replay-1'),metadata:{version:1,unlockedLevel:1}}],error:null}).then(resolve)}}}}
const recovered=createFootballResultsStore({client:trimmedClient,storage:{getItem(){return null},setItem(){}}});recovered.setOwner('user-a');await recovered.sync();assert(queriedCareer);assert.equal(recovered.getUnlockedLevel(),5)
console.log('PASS career unlock recovery outside recent history, monotonic carry-forward and account isolation.')
