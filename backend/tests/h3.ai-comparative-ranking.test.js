import assert from 'node:assert/strict';
import test from 'node:test';
import { scoreComparativePreferences, COMPARATIVE_SCORES } from '../services/ai-advisor/comparative/scoring.service.js';
const base = { action:'apply', softPreferences:{preferDifferentColor:true,referenceColors:['blue'],preferDifferentMaterial:false,referenceMaterials:[],preferDifferentStyle:false,referenceStyles:[],preferSimilarCategory:null,similarColors:[],similarMaterials:[],similarStyles:[],similarPriceMin:null,similarPriceMax:null} };
test('comparative scorer gives bounded soft bonuses without filtering candidates', () => {
  assert.equal(scoreComparativePreferences({color:'trang'},base),COMPARATIVE_SCORES.differentColor);
  assert.equal(scoreComparativePreferences({color:'xanh'},base),0);
});
