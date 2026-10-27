import assert from 'node:assert/strict'
import {RALLY_WORLDS,RALLY_CARS,RALLY_COLOURS,cupStars,garagePrefs,worldFor,colourFor,paintWorld} from '../src/maths-rally-adventure.js'
assert.equal(RALLY_WORLDS.length,5);assert.equal(RALLY_CARS.length,5);assert.equal(RALLY_COLOURS.length,6)
assert.equal(cupStars({sprint:3,oval:2,evil:100,circle:-5}),5);assert.equal(cupStars({sprint:200}),3)
assert.deepEqual(garagePrefs({world:'bogus',car:'prototype',colour:'gold'},{}),{world:'coast',car:'starter',colour:'lime'})
const cup={sprint:3,oval:3,circle:3,triangle:3,zigzag:3,spiral:3,eight:3};assert.equal(garagePrefs({world:'forest',car:'prototype',colour:'gold'},cup).car,'prototype');assert.equal(garagePrefs({colour:'gold'},cup).colour,'gold');assert.equal(garagePrefs({car:'coupe'},{sprint:3}).car,'coupe')
assert.equal(worldFor('unknown').id,'coast');assert.equal(colourFor('<script>').id,'lime')
const gradient={addColorStop(){}};const ctx=new Proxy({createLinearGradient:()=>gradient}, {get:(o,k)=>k in o?o[k]:(()=>{}),set:(o,k,v)=>{o[k]=v;return true}});for(const world of RALLY_WORLDS)paintWorld(ctx,1100,900,world.id,10)
console.log('PASS five scenery renderers, five cars, six paint colours, bounded earned-star totals, unlock rules, preference validation and safe defaults')

assert.equal(cupStars({monster:3}),3);assert.equal(garagePrefs({car:'monster'},{}).car,'monster')
