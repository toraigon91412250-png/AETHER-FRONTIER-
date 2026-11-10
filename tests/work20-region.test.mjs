import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ARENA_CENTER,ARENA_RADIUS,isArenaFootprint} from '../playtest/work20/region-guards.js';
const inWilds=(x,z)=>x>=306&&x<=994&&z>=-424&&z<=264;
test('portal spawn is inside arena despite wilderness overlap',()=>{assert.equal(inWilds(345,-413),true);assert.equal(isArenaFootprint(345,-413),true);});
test('arena footprint includes center, spawn, and recovery relay',()=>{for(const [x,z] of [[345,-445],[345,-404],[345,-413],[380,-445],[310,-445]])assert.equal(isArenaFootprint(x,z),true);});
test('non-arena positions can remain wilds',()=>{assert.equal(isArenaFootprint(345,-390),false);assert.equal(inWilds(345,-390),true);});
test('arena has circular, not square, bounds',()=>{assert.equal(isArenaFootprint(ARENA_CENTER.x+ARENA_RADIUS,ARENA_CENTER.z),false);assert.equal(isArenaFootprint(ARENA_CENTER.x+ARENA_RADIUS-.01,ARENA_CENTER.z),true);assert.equal(isArenaFootprint(ARENA_CENTER.x+44,ARENA_CENTER.z+44),false);});
test('invalid positions are outside arena',()=>{for(const [x,z] of [[NaN,-445],[345,Infinity],[undefined,-445]])assert.equal(isArenaFootprint(x,z),false);});
