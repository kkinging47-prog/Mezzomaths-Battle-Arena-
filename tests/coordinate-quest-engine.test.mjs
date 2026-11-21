import assert from 'node:assert/strict'
import {QUEST_LEVELS,createQuest,questMission,chooseQuestPoint,shiftQuest,checkQuest,nextQuest,questSummary,isSquare,isIsosceles,findRoute,samePoint,inGrid} from '../src/coordinate-quest-engine.js'
let seed=918;const rng=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296)
assert(isSquare([[1,1],[3,1],[1,3],[3,3]]));assert(isSquare([[4,5],[6,5],[5,4],[5,6]]));assert(!isSquare([[1,1],[4,1],[1,3],[4,3]]));assert(!isSquare([[1,1],[1,1],[3,3],[3,1]]));assert(isIsosceles([[2,2],[6,2],[4,5]]));assert(!isIsosceles([[2,2],[6,2],[4,2]]));assert(!isIsosceles([[1,1],[4,1],[2,3]]))
const route=findRoute([1,1],[5,5],[[3,3],[3,4]]);assert(route&&samePoint(route[0],[1,1])&&samePoint(route.at(-1),[5,5]));for(let i=1;i<route.length;i++){assert.equal(Math.abs(route[i][0]-route[i-1][0])+Math.abs(route[i][1]-route[i-1][1]),1);assert(![[3,3],[3,4]].some(p=>samePoint(p,route[i])))}assert.equal(findRoute([1,1],[3,3],[[3,3]]),null)
for(let level=1;level<=5;level++){
 const g=createQuest(level,rng);assert.equal(g.missions.length,QUEST_LEVELS[level-1].count);assert.equal(nextQuest(g),false)
 while(g.phase!=='finished'){
  const m=questMission(g);assert.equal(chooseQuestPoint(g,[-1,2]).ok,false)
  if(m.type==='navigate'){assert(chooseQuestPoint(g,m.target).ok);assert(g.trace.every(inGrid))}
  if(m.type==='rectangle')chooseQuestPoint(g,m.target)
  if(m.type==='translate'){assert(shiftQuest(g,m.vector,true).ok);assert.equal(shiftQuest(g,[100,0],true).ok,false)}
  if(m.type==='square'){const [a,b]=m.fixed;chooseQuestPoint(g,[a[0],a[1]+2]);chooseQuestPoint(g,[b[0],b[1]+2]);assert(checkQuest(g).partial);assert.equal(g.phase,'mission');chooseQuestPoint(g,[a[0],a[1]+2]);chooseQuestPoint(g,[b[0],b[1]+2]);assert.equal(checkQuest(g).ok,false);g.marks=[];chooseQuestPoint(g,[a[0],a[1]-2]);chooseQuestPoint(g,[b[0],b[1]-2])}
  if(m.type==='triangle'){const [a,b]=m.fixed,x=(a[0]+b[0])/2;chooseQuestPoint(g,[x,a[1]+1]);assert(checkQuest(g).partial);chooseQuestPoint(g,[x,a[1]+2])}
  assert(checkQuest(g).ok);assert.equal(checkQuest(g).ok,false);assert.equal(chooseQuestPoint(g,[2,2]).ok,false);assert(nextQuest(g))
 }
 const s=questSummary(g);assert(s.complete);assert.equal(s.stars,3);assert.equal(s.solved,s.total);assert.equal(s.unlocked,Math.min(5,level+1));assert.equal(nextQuest(g),false)
}
const bad=createQuest(1,rng);assert.equal(checkQuest(bad).ok,false);assert.equal(bad.mistakes,1);assert.equal(questSummary(bad).complete,false);assert.equal(questSummary(bad).stars,0)
// All three integer-grid squares for the same two horizontal vertices are accepted.
for(const extra of [[[4,7],[6,7]],[[4,3],[6,3]],[[5,4],[5,6]]])assert(isSquare([[4,5],[6,5],...extra]));
console.log('PASS all five complete areas, route adjacency/obstacles, grid bounds, rectangles, rigid translations, three square placements, multiple isosceles solutions, duplicate rejection, phase guards and progression')
