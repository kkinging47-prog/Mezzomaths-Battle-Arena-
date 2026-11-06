import assert from 'node:assert/strict'
import {createFootballer,animateFootballer,footballBallGeometry,pitchPoint,footballCameraPose} from '../src/football-3d-models.js'
import {createAttack,shootAttack,tickAttack} from '../src/football-career.js'
import {footballPresentation,readFootballPresentation,saveFootballPresentation} from '../src/football-presentation.js'
const player=createFootballer();let meshes=0
player.traverse(node=>{if(!node.isMesh)return;meshes++;for(const v of node.geometry.attributes.position.array)assert(Number.isFinite(v))});assert(meshes>20)
for(const state of [{speed:160,time:1},{kick:.5},{celebrate:.5},{dive:.9},{speed:160,reduced:true}]){animateFootballer(player,state);player.updateMatrixWorld();player.traverse(node=>{assert([...node.matrixWorld.elements].every(Number.isFinite))})}
animateFootballer(player,{speed:150,time:1});const leg=player.userData.hips[0].rotation.x;animateFootballer(player,{speed:150,time:1.2});assert.notEqual(player.userData.hips[0].rotation.x,leg);animateFootballer(player,{speed:150,time:2,reduced:true});assert(Math.abs(player.userData.hips[0].rotation.x)<.00001)
const ball=footballBallGeometry();assert.equal(ball.attributes.position.count/3,180);for(const v of ball.attributes.position.array)assert(Number.isFinite(v));assert([...ball.attributes.color.array].some(v=>v<.1))
assert.deepEqual(pitchPoint(450,62).toArray(),[0,0,0]);for(const level of [1,5])for(const mode of ['chase','broadcast']){const f=createAttack(level),p=footballCameraPose(f,mode);assert([...p.eye.toArray(),...p.target.toArray()].every(Number.isFinite));assert(p.eye.y>0);assert(p.eye.z>p.target.z)}
const run=(f,seconds)=>{for(let t=0;t<seconds&&!f.result;t+=.0125)tickAttack(f,.0125)}
let f=createAttack();shootAttack(f,{x:535,y:53});run(f,.2);assert(f.ball.height>.115);assert(f.ball.spin>0)
f=createAttack();f.loft=true;shootAttack(f,{x:535,y:53});run(f,2);assert.equal(f.result,'over','a long chip can clear the crossbar')
f=createAttack();f.player={x:450,y:310,vx:0,vy:0,angle:-Math.PI/2};tickAttack(f,.0125);f.loft=true;shootAttack(f,{x:450,y:53});run(f,2);assert.equal(f.result,'goal','a closer chip can clear the keeper and stay below the bar')
assert.equal(footballPresentation({view:'unknown'}).view,'3d');assert.equal(readFootballPresentation({getItem(){throw Error()}}).quality,'medium');let saved;saveFootballPresentation({setItem(k,v){saved=JSON.parse(v)}},{view:'2d',quality:'low',camera:'broadcast'});assert.equal(saved.camera,'broadcast')
console.log('PASS detailed articulated players, run/kick/celebration/dive transforms, reduced motion, patterned football, camera geometry, airborne drive/chip outcomes and graphics preference recovery.')
