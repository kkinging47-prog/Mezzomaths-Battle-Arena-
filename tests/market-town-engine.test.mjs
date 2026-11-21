import assert from 'node:assert/strict'
import {MARKET_LEVELS,GOODS,CASH,money,parseMoney,createMarket,currentOrder,packGood,checkBasket,checkPrice,addCash,cashTotal,checkChange,nextCustomer,marketSummary} from '../src/market-town-engine.js'
let seed=874;const rng=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296)
assert.equal(parseMoney('7.50'),750);assert.equal(parseMoney('7.5'),750);assert.equal(parseMoney('0.05'),5);assert.equal(parseMoney('8'),800);for(const s of ['','-1','1.234','1e2','0x12','NaN','7,50'])assert.equal(parseMoney(s),null);assert.equal(money(25),'GH¢0.25')
for(const difficulty of ['foundation','core','challenge'])for(let level=1;level<=5;level++){
 const g=createMarket(level,difficulty,rng);assert.equal(g.orders.length,MARKET_LEVELS[level-1].orders)
 for(const order of g.orders){assert.equal(order.total,Object.entries(order.target).reduce((sum,[id,q])=>sum+q*order.prices[id],0));assert.equal(order.change,order.paid-order.total);assert(order.change>0);assert(Number.isInteger(order.total));assert(Object.values(order.target).every(q=>Number.isInteger(q)&&q>0&&q<=12));if(order.clue)assert.equal(order.clue.total/order.clue.bundle,order.prices[order.clue.id])}
 while(g.phase!=='finished'){
  const o=currentOrder(g);assert.equal(checkPrice(g,o.total).ok,false);assert.equal(checkChange(g).ok,false);assert.equal(packGood(g,'fake',1),false)
  for(const [id,n] of Object.entries(o.target))for(let i=0;i<n;i++)assert(packGood(g,id,1));assert(checkBasket(g).ok);assert.equal(packGood(g,Object.keys(o.target)[0],1),false)
  assert(checkPrice(g,o.total).ok);let left=o.change;for(const v of CASH){while(left>=v){assert(addCash(g,v));left-=v}}assert.equal(cashTotal(g),o.change);assert(checkChange(g).ok);assert.equal(checkChange(g).ok,false);assert(nextCustomer(g))
 }
 const s=marketSummary(g);assert(s.complete);assert.equal(s.stars,3);assert.equal(s.served,s.total);assert.equal(s.firstTry,s.total);assert.equal(s.unlockedLevel,Math.min(5,level+1));assert.equal(nextCustomer(g),false)
}
const wrong=createMarket(1,'core',rng),o=currentOrder(wrong);assert.equal(checkBasket(wrong).ok,false);assert.equal(wrong.phase,'pack');assert.equal(wrong.mistakes,1);for(const [id,q] of Object.entries(o.target))for(let i=0;i<q;i++)packGood(wrong,id,1);assert(checkBasket(wrong).ok);assert.equal(checkPrice(wrong,o.total+1).ok,false);assert.equal(wrong.phase,'price');assert(checkPrice(wrong,o.total).ok);assert.equal(checkChange(wrong).ok,false);assert.equal(wrong.phase,'change');assert.equal(wrong.revenue,0)
addCash(wrong,50);addCash(wrong,50,-1);assert.equal(cashTotal(wrong),0);assert.equal(addCash(wrong,123),false);assert.equal(marketSummary(wrong).complete,false);assert.equal(marketSummary(wrong).stars,0)
// Accept a non-greedy combination: all change in 5p tokens.
for(let i=0;i<o.change/5;i++)addCash(wrong,5);assert.equal(cashTotal(wrong),o.change);assert(checkChange(wrong).ok);assert.equal(wrong.records[0].firstTry,false)
assert.equal(GOODS.length,9);console.log('PASS money parsing, all 15 level/difficulty combinations, ratios/fractions, exact packs, unknown-price clues, totals/change, alternative cash, wrong-phase guards, corrections, complete shifts and unlocks')
