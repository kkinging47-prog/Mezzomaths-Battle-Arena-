import test from 'node:test'
import assert from 'node:assert/strict'
import { isCambridgeBattle, battleTopicFor, battleMatchKey, CAMBRIDGE_BATTLE_TOPIC } from '../src/battle-question-policy.js'
test('Cambridge matches span all topics without mixing grades',()=>{
  assert.equal(isCambridgeBattle('Cambridge'),true)
  assert.equal(battleTopicFor('Cambridge','Fractions'),CAMBRIDGE_BATTLE_TOPIC)
  assert.equal(battleMatchKey('Grade 5','Cambridge','Fractions'),battleMatchKey('Grade 5','Cambridge','Geometry'))
  assert.notEqual(battleMatchKey('Grade 4','Cambridge','Fractions'),battleMatchKey('Grade 5','Cambridge','Fractions'))
})
test('GES and Pearson Edexcel retain topic-specific matches',()=>{
  assert.equal(isCambridgeBattle('GES'),false)
  assert.notEqual(battleMatchKey('Grade 5','GES','Fractions'),battleMatchKey('Grade 5','GES','Geometry'))
  assert.equal(battleTopicFor('Pearson Edexcel','Geometry'),'Geometry')
})
