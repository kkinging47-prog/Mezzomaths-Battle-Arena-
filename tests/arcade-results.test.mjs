import assert from 'node:assert/strict'
import {createFootballResultsStore} from '../src/football-results-store.js'
const db=[],cache=new Map(),storage={getItem:k=>cache.get(k)||null,setItem:(k,v)=>cache.set(k,v)}
let offline=false
const client={from(){const filters={};return{async insert(row){if(offline)return{error:{code:'NETWORK'}};if(db.some(r=>r.id===row.id))return{error:{code:'23505'}};db.push(row);return{error:null}},select(){return this},eq(k,v){filters[k]=v;return this},order(){return this},limit(){return this},then(resolve){return Promise.resolve({data:db.filter(r=>Object.entries(filters).every(([k,v])=>r[k]===v)),error:null}).then(resolve)}}}}
const create=mode=>createFootballResultsStore({client,storage,mode,cachePrefix:'mezzo_'+mode+'_v1'})
const kart=create('rally_kart'),space=create('space_defender'),football=create('maths_football'),summary={correct:4,total:5,level:1,unlockedLevel:2,passed:true,answers:[]},config={class_level:'Grade 4',curriculum:'Cambridge',topic:'All topics'}
for(const s of [kart,space,football])s.setOwner('learner-a')
assert.equal(create('space_defender').save(summary,config,'guest'),false)
space.save({...summary,unlockedLevel:4},config,'space-1');await space.sync();kart.save(summary,config,'kart-1');await kart.sync();await football.sync();assert.equal(space.getUnlockedLevel(),4);assert.equal(kart.getUnlockedLevel(),2);assert.equal(football.getRecords().length,0)
assert.equal(space.getRecords()[0].mode,'space_defender');assert.equal(kart.getRecords()[0].mode,'rally_kart');assert.equal(db.length,2)
const restored=create('space_defender');restored.setOwner('learner-a');assert.equal(restored.getUnlockedLevel(),4);restored.setOwner('learner-b');assert.equal(restored.getUnlockedLevel(),1);await restored.sync();assert.equal(restored.getRecords().length,0)
offline=true;kart.save(summary,config,'kart-pending');await kart.sync();assert.equal(kart.getStatus(),'offline');const retry=create('rally_kart');retry.setOwner('learner-a');offline=false;await retry.sync();assert(db.some(r=>r.id==='kart-pending'))
console.log('PASS new-game mode/cache separation, independent unlocks, Football compatibility, guest exclusion, account isolation and offline kart receipt recovery.')

const basketball=create('basketball_challenge');basketball.setOwner('learner-a');await basketball.sync();assert.equal(basketball.getUnlockedLevel(),1);basketball.save({...summary,points:9,target:4,made:3,attempts:5},config,'basket-1');await basketball.sync();assert.equal(basketball.getUnlockedLevel(),2);assert.equal(basketball.getRecords()[0].mode,'basketball_challenge');assert.equal(space.getUnlockedLevel(),4);basketball.setOwner('learner-b');assert.equal(basketball.getRecords().length,0)
