// Cambridge 1v1 uses the whole active question pool at the selected grade.
// Other curricula retain their topic-specific matching and question selection.
export const CAMBRIDGE_BATTLE_TOPIC = 'All available topics'
export const isCambridgeBattle = curriculum => String(curriculum || '').trim().toLowerCase() === 'cambridge'
export const battleTopicFor = (curriculum, topic = '') => isCambridgeBattle(curriculum) ? CAMBRIDGE_BATTLE_TOPIC : String(topic || '')
export const battleMatchKey = (classLevel, curriculum, topic = '') => [classLevel, curriculum, battleTopicFor(curriculum, topic)].join('|')
