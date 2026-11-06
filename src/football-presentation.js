// Only presentation preferences are device-wide; questions, results and unlocks remain account-scoped.
export const FOOTBALL_GRAPHICS_KEY='mezzo_football_graphics_v1'
export function footballPresentation(value={}){return {view:['3d','2d'].includes(value.view)?value.view:'3d',quality:['low','medium','high'].includes(value.quality)?value.quality:'medium',camera:['chase','broadcast'].includes(value.camera)?value.camera:'chase'}}
export function readFootballPresentation(storage){try{return footballPresentation(JSON.parse(storage.getItem(FOOTBALL_GRAPHICS_KEY)||'{}'))}catch{return footballPresentation()}}
export function saveFootballPresentation(storage,value){try{storage.setItem(FOOTBALL_GRAPHICS_KEY,JSON.stringify(footballPresentation(value)))}catch{}}
