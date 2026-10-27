const TAU=Math.PI*2
const curve=(fn,n=600)=>Array.from({length:n+1},(_,i)=>fn(i/n))
const polygon=points=>points.map(([x,y])=>({x,y}))
export const RALLY_TRACKS=[
 {id:'sprint',name:'Straight Sprint',shape:'Straight',description:'A clean dash to the flag.',color:'#4b9771',closed:false,points:polygon([[.12,.5],[.88,.5]])},
 {id:'oval',name:'Oval Speedway',shape:'Oval',description:'Long straights and sweeping bends.',color:'#517caa',closed:true,points:curve(t=>({x:.5+.38*Math.cos(TAU*t-Math.PI/2),y:.5+.25*Math.sin(TAU*t-Math.PI/2)}))},
 {id:'circle',name:'Circle Circuit',shape:'Circular',description:'One complete lap around the arena.',color:'#ae8549',closed:true,points:curve(t=>({x:.5+.34*Math.cos(TAU*t-Math.PI/2),y:.5+.34*Math.sin(TAU*t-Math.PI/2)}))},
 {id:'triangle',name:'Triangle Challenge',shape:'Triangular',description:'Three sides, three decisive corners.',color:'#9471b1',closed:true,points:polygon([[.5,.14],[.88,.8],[.12,.8],[.5,.14]])},
 {id:'zigzag',name:'Zigzag Rush',shape:'Zigzag',description:'Power through a chain of sharp turns.',color:'#529b93',closed:false,points:polygon([[.13,.15],[.86,.15],[.15,.38],[.85,.59],[.15,.82],[.86,.82]])},
 {id:'spiral',name:'Spiral Summit',shape:'Spiral',description:'Wind from the outer loop to the centre.',color:'#a4674b',closed:false,points:curve(t=>{const r=.4-.32*t,a=TAU*1.8*t-Math.PI/2;return{x:.5+r*Math.cos(a),y:.5+r*Math.sin(a)}})},
 {id:'eight',name:'Figure-Eight Flyover',shape:'Figure eight',description:'Cross the centre and sweep through both loops.',color:'#586fa2',closed:true,points:curve(t=>({x:.5+.38*Math.sin(TAU*t),y:.5+.31*Math.sin(2*TAU*t)}))},
 {id:'snake',name:'Serpentine Run',shape:'S-curve',description:'Flow through a winding mountain road.',color:'#5d9254',closed:false,points:curve(t=>({x:.5+.32*Math.sin(TAU*1.5*t),y:.13+.74*t}))},
 {id:'diamond',name:'Diamond Dash',shape:'Diamond',description:'Four straight sectors and four corners.',color:'#9a667e',closed:true,points:polygon([[.5,.12],[.88,.5],[.5,.88],[.12,.5],[.5,.12]])},
 {id:'star',name:'Star Grand Prix',shape:'Star',description:'The final course: ten alternating corners.',color:'#aa8746',closed:true,points:polygon(Array.from({length:11},(_,i)=>{const a=i*TAU/10-Math.PI/2,r=i%2?.23:.4;return[.5+r*Math.cos(a),.5+r*Math.sin(a)]}))}
]
function prepare(track){let total=0;const cumulative=[0];for(let i=1;i<track.points.length;i++){total+=Math.hypot(track.points[i].x-track.points[i-1].x,track.points[i].y-track.points[i-1].y);cumulative.push(total)}return{...track,total,cumulative}}
const tracks=RALLY_TRACKS.map(prepare)
export function getTrack(id){return tracks.find(track=>track.id===id)||tracks[0]}
// Arc-length interpolation gives equal progress for all track shapes.
export function trackPoint(track,progress,lane=0,laneSpacing=.012){
 const target=Math.max(0,Math.min(1,progress))*track.total
 let lo=1,hi=track.cumulative.length-1
 while(lo<hi){const mid=(lo+hi)>>1;if(track.cumulative[mid]<target)lo=mid+1;else hi=mid}
 const i=lo,a=track.points[i-1],b=track.points[i],length=track.cumulative[i]-track.cumulative[i-1],f=length?(target-track.cumulative[i-1])/length:0
 const angle=Math.atan2(b.y-a.y,b.x-a.x),offset=(lane-1.5)*laneSpacing
 return{x:a.x+(b.x-a.x)*f-Math.sin(angle)*offset,y:a.y+(b.y-a.y)*f+Math.cos(angle)*offset,angle}
}
export function raceStars(summary){if(!summary.finished)return 0;if(summary.position===1&&summary.accuracy>=80)return 3;if(summary.accuracy>=60)return 2;return 1}
