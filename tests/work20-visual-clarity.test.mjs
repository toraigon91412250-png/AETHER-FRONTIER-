import assert from 'node:assert/strict';
import {test} from 'node:test';
import {computeVisualProfile,createReadabilityMaterials} from '../playtest/work20/visual-clarity.js';

test('starting clear daylight stays bright and moderately fogged',()=>{
  const p=computeVisualProfile('city','lite',{daylight:1,suggestedSunIntensity:1.45,suggestedFogDensity:.001});
  assert.ok(p.exposure>=1.4);
  assert.ok(p.ambientIntensity>=2.2);
  assert.ok(p.fogDensity<.00125);
});
test('night and storm remain legible while retaining atmosphere',()=>{
  const p=computeVisualProfile('wilds','lite',{daylight:0,suggestedSunIntensity:.15,suggestedFogDensity:.007});
  assert.ok(p.ambientIntensity>=1.8);
  assert.ok(p.sunIntensity>=1);
  assert.ok(p.fogDensity<=.00185);
});
test('interiors get independent fill and lighter fog',()=>{
  for(const z of ['lab','vault']){
    const p=computeVisualProfile(z,'high',{daylight:0,suggestedSunIntensity:0,suggestedFogDensity:.007});
    assert.ok(p.exposure>=1.5);
    assert.ok(p.ambientIntensity>=2);
    assert.ok(p.fogDensity<.00025);
  }
});
test('high and lite keep distinct distant city LODs',()=>{
  const a=computeVisualProfile('city','lite'),b=computeVisualProfile('city','high');
  assert.ok(a.cityDetailRange<b.cityDetailRange);
});
test('metal reflectance clamp is reversible and touches only Standard materials',()=>{
  const mat={isMeshStandardMaterial:true,metalness:.88,roughness:.22};
  const other={isMeshBasicMaterial:true};
  const root={traverse(fn){fn({material:mat});fn({material:[mat,other]});}};
  const m=createReadabilityMaterials(root);
  assert.equal(m.count,1);
  m.setQuality('lite');
  assert.equal(mat.metalness,.56);assert.equal(mat.roughness,.45);
  m.setQuality('high');
  assert.equal(mat.metalness,.67);assert.equal(mat.roughness,.36);
  assert.deepEqual(other,{isMeshBasicMaterial:true});
});
test('bad lighting values cannot break renderer values',()=>{
  const p=computeVisualProfile('air','lite',{daylight:NaN,suggestedSunIntensity:Infinity,suggestedFogDensity:-Infinity});
  for(const v of Object.values(p))assert.ok(Number.isFinite(v));
});
