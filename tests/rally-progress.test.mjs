import assert from 'node:assert/strict'
import {mergeRallyProgress,mergeRallyPatch} from '../src/rally-progress-model.js'
import {createRallyProgressStore} from '../src/rally-progress-store.js'
const key=JSON.stringify(['Grade 4','GES','Fractions'])
const race=(id,date='2026-11-03T00:00:00Z')=>({id,completedAt:date,topic:'Fractions',correct:4,answered:5,total:5,finished:true,position:1,gaps:[{private:'unneeded answer details'}]})
const merged=mergeRallyProgress({cup:{sprint:3},progress:{[key]:['sprint']},history:[race('a')]},{cup:{sprint:1,oval:2},progress:{[key]:['oval']},history:[race('a'),race('b','2026-11-03T01:00:00Z')]})
assert.equal(merged.cup.sprint,3);assert.equal(merged.cup.oval,2);assert.deepEqual(merged.progress[key],['sprint','oval']);assert.deepEqual(merged.history.map(r=>r.id),['b','a']);assert(!JSON.stringify(merged).includes('private'))
assert(!Object.hasOwn(mergeRallyPatch({}, {cup:{sprint:1}}),'garage'))
assert.equal(mergeRallyProgress({}, {cup:{sprint:999},garage:{car:'prototype'}}).garage.car,'starter')
assert.equal(mergeRallyProgress({}, {history:Array.from({length:20},(_,i)=>race(String(i),new Date(1000+i).toISOString()))}).history.length,10)
const storage={data:new Map(),getItem(k){return this.data.get(k)||null},setItem(k,v){this.data.set(k,v)}}
let cloud={},offline=false,calls=0
const client={async rpc(name,{p_patch}){calls++;assert.equal(name,'sync_rally_progress');if(offline)return {error:Error('offline')};cloud=mergeRallyProgress(cloud,p_patch);return {data:cloud}}}
const store=createRallyProgressStore({client,storage});store.setOwner('alice');await store.sync();store.update({cup:{sprint:2},progress:{[key]:['sprint']},history:[race('a')]});await store.sync();assert.equal(store.getStatus(),'saved')
const secondDevice=createRallyProgressStore({client,storage:{getItem(){return null},setItem(){}}});secondDevice.setOwner('alice');await secondDevice.sync();assert.equal(secondDevice.getState().cup.sprint,2)
offline=true;store.update({cup:{oval:3}});await store.sync();assert.equal(store.getStatus(),'offline');const reloaded=createRallyProgressStore({client,storage});reloaded.setOwner('alice');assert.equal(reloaded.getState().cup.oval,3);offline=false;await reloaded.sync();assert.equal(cloud.cup.oval,3)
store.setOwner('bob');assert.deepEqual(store.getState().cup,{});store.setOwner(null);assert.deepEqual(store.getState().history,[])
// An old account's response must never populate the new account's screen or cache.
let release;const delayed=createRallyProgressStore({client:{rpc:()=>new Promise(resolve=>release=resolve)},storage});delayed.setOwner('old');const waiting=delayed.sync();delayed.setOwner('new');release({data:{cup:{sprint:3}}});await waiting;assert.deepEqual(delayed.getState().cup,{})
// A save made while another save is in flight gets a second atomic merge.
let firstRelease,first=true,patches=[]
const queued=createRallyProgressStore({storage,client:{rpc(_name,{p_patch}){patches.push(p_patch);if(first){first=false;return new Promise(resolve=>firstRelease=resolve)}return Promise.resolve({data:mergeRallyProgress({},p_patch)})}}});queued.setOwner('queue');const loading=queued.sync();queued.update({cup:{sprint:1}});firstRelease({data:{cup:{oval:2}}});await loading;assert.equal(queued.getState().cup.sprint,1);assert.equal(patches.length,2)
console.log('PASS achievement unions, star maxima, history retries, privacy, second-device restore, offline retry/reload, preference patches, account isolation and in-flight saves.')
