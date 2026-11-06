import assert from 'node:assert/strict'
import * as T from 'three'
import {createSoftwareFootballRenderer} from '../src/football-software-3d.js'
let paths=0,calls=0,lastFill=''
const context=new Proxy({}, {get(_t,key){if(key==='createLinearGradient')return()=>({addColorStop(){}});return(...args)=>{calls++;if(key==='fill')paths++;for(const value of args)if(typeof value==='number')assert(Number.isFinite(value),key+' received nonfinite coordinates')}},set(_t,key,value){if(key==='fillStyle')lastFill=value;return true}})
const canvas={width:320,height:200,getContext:()=>context},scene=new T.Scene(),camera=new T.PerspectiveCamera(52,1.6,.1,100)
const plane=new T.Mesh(new T.PlaneGeometry(30,30),new T.MeshStandardMaterial({color:'#307f39'}));plane.rotation.x=-Math.PI/2;plane.userData.softwareLayer=-1;scene.add(plane);const actor=new T.Mesh(new T.BoxGeometry(1,2,1),new T.MeshBasicMaterial({color:'#ff0000'}));actor.position.set(0,1,-3);scene.add(actor)
// The near pitch edge is behind the camera: clipping must retain the visible part of the floor.
camera.position.set(0,3,2);camera.lookAt(0,0,-6)
const renderer=createSoftwareFootballRenderer(canvas);renderer.setPixelRatio(1);renderer.setSize(320,200);renderer.render(scene,camera);assert(paths>0);assert(calls>10);assert.equal(lastFill,'rgb(255,0,0)','ground must render before actors so it cannot cover them');renderer.dispose();const previous=calls;renderer.render(scene,camera);assert.equal(calls,previous)
console.log('PASS software perspective rasterisation, floor clipping through the camera plane, finite projected coordinates and disposal.')
