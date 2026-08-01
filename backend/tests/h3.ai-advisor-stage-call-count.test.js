import assert from 'node:assert/strict'; import test from 'node:test';
import { prepareAdvisorCandidates, completeAdvisorRecommendation } from '../services/ai-advisor/recommendation/advisor.service.js';
import { diversifyRecommendations } from '../services/ai-advisor/recommendation/diversification.service.js';
const resolvedIntent={intent:{category:'sofa',budget:{min:null,max:100,currency:'VND'},colors:[],materials:[],room:null,style:null,size:null},source:'merged',fallbackBudget:{},fallbackCategorySlug:null,fallbackAttributes:{colors:[],materials:[],rooms:[],styles:[],sizes:[],dimensions:{widthCm:null,heightCm:null,depthCm:null}}};
test('production Stage 1 calls injected dependencies once in order and never Stage 2 operations',async()=>{const calls=[];const p={id:1,price:90,stock:1,category:{slug:'sofa'},images:[]};const out=await prepareAdvisorCandidates({message:'sofa',resolvedIntent},{findCurrentProduct:async()=>{calls.push('current');return null;},retrieveCandidates:async()=>{calls.push('retrieve');return {candidates:[p],metadata:{primaryCount:1,retrievedCount:1,fallbackUsed:false,fallbackReason:'none'}};},enrichCandidatePromotions:async(x)=>{calls.push('enrich');return x;},applyCandidateEligibility:({candidates})=>{calls.push('eligibility');return {candidates,diagnostics:{beforeBudgetCount:1,afterBudgetCount:1,beforeAttributeCount:1,afterAttributeCount:1},noExactAttributeMatch:false};}});assert.deepEqual(calls,['retrieve','enrich','eligibility']);assert.equal(out.eligibility.candidates.length,1);});
test('production Stage 2 calls only injected completion dependencies in order',async()=>{const calls=[];const product={id:1,price:90,finalPrice:90,stock:1,category:{slug:'sofa',name:'Sofa'},images:[]};const prepared={eligibility:{candidates:[product]},stageContext:{message:'sofa',normalizedMessage:'sofa',keywords:[],budget:{intent:null,minPrice:null,maxPrice:null},categorySlug:'sofa',attributes:{colors:[],materials:[],rooms:[],styles:[],sizes:[],dimensions:{}},currentProduct:null,noExactAttributeMatch:false}};const result=await completeAdvisorRecommendation(prepared,{aggregateCandidateReviews:async()=>{calls.push('reviews');return new Map();},rankAdvisorCandidates:()=>{calls.push('rank');return [{product,score:1}];},selectAdvisorCandidates:(x)=>{calls.push('select');return x;},diversifyCandidates:({rankedCandidates})=>{calls.push('diversify');return {selectedCandidates:rankedCandidates.map(i=>i.product),diagnostics:{}};},buildGroundedReasons:()=>{calls.push('reasons');return new Map([[1,{reasonCodes:[],facts:{}}]]);},writeAdvisorResponse:async()=>{calls.push('writer');return {answer:'ok',reasons:[]};},validateWriterOutput:()=>{calls.push('validate');return {answer:'ok',reasonMap:new Map()};}});assert.deepEqual(calls,['reviews','rank','select','diversify','reasons','writer','validate']);assert.equal(result.recommendations.length,1);});

test('production Stage 2 preserves explicit-sort ranked order through diversification', async () => {
  const products = [
    { id: 3, name: 'C', price: 30, finalPrice: 30, stock: 1, category: { slug: 'sofa', name: 'Sofa' }, images: [] },
    { id: 2, name: 'B', price: 20, finalPrice: 20, stock: 1, category: { slug: 'sofa', name: 'Sofa' }, images: [] },
    { id: 1, name: 'A', price: 10, finalPrice: 10, stock: 1, category: { slug: 'sofa', name: 'Sofa' }, images: [] }
  ];
  const prepared = { eligibility: { candidates: products }, stageContext: { message: 'sofa', normalizedMessage: 'sofa', keywords: [], budget: { intent: null, minPrice: null, maxPrice: null }, categorySlug: 'sofa', attributes: { colors: [], materials: [], rooms: [], styles: [], sizes: [], dimensions: {} }, currentProduct: null, noExactAttributeMatch: false, classification: { soft: { sortPreference: 'price_desc' } } } };
  const result = await completeAdvisorRecommendation(prepared, {
    aggregateCandidateReviews: async () => new Map(),
    rankAdvisorCandidates: () => products.map((product) => ({ product, score: 1 })),
    selectAdvisorCandidates: (ranked) => ranked,
    diversifyCandidates: diversifyRecommendations,
    buildGroundedReasons: () => new Map(),
    writeAdvisorResponse: async () => null,
    validateWriterOutput: () => null
  });
  assert.deepEqual(result.selectedCandidates.map((product) => product.id), [3, 2, 1]);
  assert.equal(result.diversification.diversitySkippedReason, 'explicit_sort_preserved');
});
