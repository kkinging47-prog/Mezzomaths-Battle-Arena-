import {RALLY_TRACKS} from './maths-rally-tracks.js'

export const RALLY_MODES=Object.freeze({
 quick5:{label:'Quick race · 5 questions',questions:5,distance:600},
 quick10:{label:'Quick race · 10 questions',questions:10,distance:900},
 cup:{label:'Circuit Cup',distance:1200}
})
export function rallyMode(config){return Object.hasOwn(RALLY_MODES,config?.race_mode)?config.race_mode:'cup'}
export function quickRace(config){return rallyMode(config)!=='cup'}
export function racePlan(track,config){
 const mode=rallyMode(config),settings=RALLY_MODES[mode]
 return {mode,quick:mode!=='cup',distance:settings.distance,questions:settings.questions||5*(Math.max(0,RALLY_TRACKS.findIndex(t=>t.id===track))+1)}
}
