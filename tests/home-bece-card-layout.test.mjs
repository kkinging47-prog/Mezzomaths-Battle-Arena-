import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import vm from 'node:vm'
const source=(await fs.readFile(new URL('../src/home-bece-card-enhancer.js',import.meta.url),'utf8')).replace("import './home-bece-card.css'",'')
let moves=0,grouped=true
const section={},bot={parentElement:section,textContent:'Compete With Bot',matches(){return true}},bece={nextElementSibling:null,matches(){return false}}
const grid={classList:{contains:()=>grouped},querySelector:()=>bece,querySelectorAll:()=>[bece,bot],lastElementChild:null,insertBefore(){moves++;assert.equal(bot.parentElement,grid)},appendChild(){moves++}}
vm.runInNewContext(source+'\ninstallBeceHomeCard();',{document:{querySelector:()=>grid,body:{}},MutationObserver:class{observe(){}},window:{addEventListener(){}},setTimeout(){},requestAnimationFrame(){}})
assert.equal(moves,0,'grouped homepage cards must stay in their sections')
grouped=false
vm.runInNewContext(source+'\ninstallBeceHomeCard();',{document:{querySelector:()=>grid,body:{}},MutationObserver:class{observe(){}},window:{addEventListener(){}},setTimeout(){},requestAnimationFrame(){}})
assert.equal(moves,0,'nested cards must not be passed to grid.insertBefore')
bot.parentElement=grid
vm.runInNewContext(source+'\ninstallBeceHomeCard();',{document:{querySelector:()=>grid,body:{}},MutationObserver:class{observe(){}},window:{addEventListener(){}},setTimeout(){},requestAnimationFrame(){}})
assert.equal(moves,2,'legacy flat layouts retain their card order')
console.log('PASS homepage card grouping avoids invalid moves while preserving flat-layout placement.')
