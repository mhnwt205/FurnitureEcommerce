import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compareAiCandidates,
  projectAiCandidate,
  retrieveAiCandidates,
  sanitizeAiDescription
} from '../services/ai/aiProductSearch.service.js';
import { AI_MAX_SEARCH_KEYWORDS } from '../services/ai/aiContracts.js';

const product = (id, overrides = {}) => ({
  id,
  name: `Product ${id}`,
  slug: `product-${id}`,
  price: 100.25,
  imageUrl: `legacy-image-${id}`,
  stock: 1,
  isActive: true,
  color: 'Black',
  material: 'Wood',
  roomType: 'Living room',
  style: 'Modern',
  widthCm: 100,
  heightCm: 80,
  depthCm: 50,
  dimensions: '100 x 80 x 50 cm',
  description: '<p> Full   product description </p>',
  category: { name: 'Sofa', slug: 'sofa' },
  images: [{ imageUrl: 'private-image' }],
  reviews: [{ comment: 'private-review' }],
  createdAt: new Date(),
  ...overrides
});

const createDependencies = ({ primary = [], fallback = [], reviewSummaries = [], pricing } = {}) => {
  const productCalls = [];
  const reviewCalls = [];
  const prisma = {
    product: {
      findMany: async (query) => {
        productCalls.push(query);
        return productCalls.length === 1 ? primary : fallback;
      }
    },
    review: {
      groupBy: async (query) => {
        reviewCalls.push(query);
        return reviewSummaries;
      }
    }
  };
  return {
    prisma,
    productCalls,
    reviewCalls,
    attachPricingToProducts: pricing ?? (async (products) => products.map((item) => ({
      ...item,
      finalPrice: Number(item.price),
      hasPromotion: false,
      promotion: null
    })))
  };
};

test('sanitizes the full nullable description without truncation or source mutation', () => {
  const original = `<div>${'x'.repeat(260)}   <strong>kept</strong></div>`;
  assert.equal(sanitizeAiDescription(original), `${'x'.repeat(260)} kept`);
  assert.equal(sanitizeAiDescription('<p>Kept</p><script>alert("omit")</script><style>.omit {}</style>'), 'Kept');
  assert.equal(sanitizeAiDescription(null), null);
  assert.equal(original.includes('<strong>'), true);
});

test('sanitizer removes script/style bodies, preserves word boundaries, and tolerates malformed input', () => {
  assert.equal(
    sanitizeAiDescription('before<strong>middle</strong>after<script>ignore()</script><style>.x{}</style>'),
    'before middle after'
  );
  assert.equal(sanitizeAiDescription('before <script>unclosed'), 'before');
  assert.equal(sanitizeAiDescription({ toString: () => '<p>object text</p>' }), 'object text');
  assert.equal(sanitizeAiDescription('&lt;not executable&gt;'), '&lt;not executable&gt;');
});

test('projects only safe candidate fields and never lets description override structured fields', () => {
  const source = product(1, { color: 'Black', description: '<p>White finish</p>' });
  const candidate = projectAiCandidate({
    ...source,
    finalPrice: 90.2,
    promotion: { id: 1, name: 'Sale', discountType: 'percentage', discountValue: 10 },
    averageRating: 4.5,
    reviewCount: 2
  });
  assert.deepEqual(candidate, {
    id: 1,
    name: 'Product 1',
    slug: 'product-1',
    image: 'legacy-image-1',
    price: 100.25,
    category: { name: 'Sofa', slug: 'sofa' },
    finalPrice: 90.2,
    stock: 1,
    stockStatus: 'in_stock',
    color: 'Black',
    material: 'Wood',
    roomType: 'Living room',
    style: 'Modern',
    widthCm: 100,
    heightCm: 80,
    depthCm: 50,
    dimensions: '100 x 80 x 50 cm',
    promotionSummary: { name: 'Sale', discountType: 'percentage', discountValue: 10 },
    averageRating: 4.5,
    reviewCount: 2,
    description: 'White finish'
  });
  assert.equal(source.color, 'Black');
  assert.equal('images' in candidate, false);
  assert.equal('reviews' in candidate, false);
  assert.equal('createdAt' in candidate, false);
});

test('uses an active category/keyword primary query and does not fallback when it fills the cap', async () => {
  const dependencies = createDependencies({ primary: [product(2), product(1)] });
  const input = { message: 'Sofa', maxCandidates: 2 };
  const result = await retrieveAiCandidates(input, dependencies);
  assert.equal(dependencies.productCalls.length, 1);
  assert.equal(dependencies.productCalls[0].where.isActive, true);
  assert.equal(dependencies.productCalls[0].select.slug, true);
  assert.equal(dependencies.productCalls[0].select.price, true);
  assert.equal(dependencies.productCalls[0].select.imageUrl, true);
  assert.equal('images' in dependencies.productCalls[0].select, false);
  assert.equal(Array.isArray(dependencies.productCalls[0].where.OR), true);
  assert.deepEqual(dependencies.productCalls[0].orderBy, { id: 'asc' });
  assert.deepEqual(result.candidates.map((item) => item.id), [1, 2]);
  assert.deepEqual(result.metadata, {
    primaryCount: 2,
    fallbackUsed: false,
    fallbackReason: 'NONE',
    retrievedCount: 2
  });
  assert.deepEqual(input, { message: 'Sofa', maxCandidates: 2 });
});

test('uses exactly one active fallback query when primary is empty and records metadata', async () => {
  const dependencies = createDependencies({ primary: [], fallback: [product(3)] });
  const result = await retrieveAiCandidates({ message: 'unknown', maxCandidates: 2 }, dependencies);
  assert.equal(dependencies.productCalls.length, 2);
  assert.deepEqual(dependencies.productCalls[1].where, { isActive: true });
  assert.deepEqual(dependencies.productCalls[1].orderBy, { id: 'asc' });
  assert.deepEqual(result.candidates.map((item) => item.id), [3]);
  assert.deepEqual(result.metadata, {
    primaryCount: 0,
    fallbackUsed: true,
    fallbackReason: 'PRIMARY_EMPTY',
    retrievedCount: 1
  });
});

test('uses exactly one fallback query to fill an insufficient primary result without duplicate IDs', async () => {
  const dependencies = createDependencies({ primary: [product(1)], fallback: [product(1), product(2), product(3)] });
  const result = await retrieveAiCandidates({ message: 'sofa', maxCandidates: 3 }, dependencies);
  assert.equal(dependencies.productCalls.length, 2);
  assert.deepEqual(dependencies.productCalls[1].where, { isActive: true, id: { notIn: [1] } });
  assert.deepEqual(result.candidates.map((item) => item.id), [1, 2, 3]);
  assert.equal(result.metadata.fallbackReason, 'PRIMARY_INSUFFICIENT');
});

test('defensively de-duplicates primary and fallback rows with primary precedence', async () => {
  const dependencies = createDependencies({
    primary: [product(2, { name: 'first primary' }), product(2, { name: 'duplicate primary' }), product(1)],
    fallback: [product(1, { name: 'duplicate fallback' }), product(3), product(3, { name: 'duplicate fallback row' })]
  });
  const result = await retrieveAiCandidates({ message: 'sofa', maxCandidates: 4 }, dependencies);
  assert.deepEqual(result.candidates.map((item) => item.id), [1, 2, 3]);
  assert.equal(result.candidates.find((item) => item.id === 2).name, 'first primary');
  assert.deepEqual(result.metadata, {
    primaryCount: 3,
    fallbackUsed: true,
    fallbackReason: 'PRIMARY_INSUFFICIENT',
    retrievedCount: 3
  });
});

test('returns an empty result after one fallback and propagates database errors', async () => {
  const emptyDependencies = createDependencies({ primary: [], fallback: [] });
  const emptyResult = await retrieveAiCandidates({ message: 'unknown', maxCandidates: 2 }, emptyDependencies);
  assert.deepEqual(emptyResult.candidates, []);
  assert.equal(emptyDependencies.productCalls.length, 2);
  assert.equal(emptyDependencies.reviewCalls.length, 0);

  const databaseError = new Error('database unavailable');
  const failingDependencies = createDependencies();
  failingDependencies.prisma.product.findMany = async () => { throw databaseError; };
  await assert.rejects(
    () => retrieveAiCandidates({ message: 'sofa' }, failingDependencies),
    databaseError
  );
});

test('uses default 20 and caps an internal maxCandidates value at 30', async () => {
  const products = Array.from({ length: 35 }, (_, index) => product(index + 1));
  const defaultDependencies = createDependencies({ primary: products });
  const defaultResult = await retrieveAiCandidates({ message: 'sofa' }, defaultDependencies);
  assert.equal(defaultDependencies.productCalls[0].take, 20);
  assert.equal(defaultResult.candidates.length, 20);

  const cappedDependencies = createDependencies({ primary: products });
  const cappedResult = await retrieveAiCandidates({ message: 'sofa', maxCandidates: 99 }, cappedDependencies);
  assert.equal(cappedDependencies.productCalls[0].take, 30);
  assert.equal(cappedResult.candidates.length, 30);
});

test('enriches price and promotion through the injected batch authority without raw promotion data', async () => {
  const dependencies = createDependencies({
    primary: [product(1)],
    pricing: async (items) => items.map((item) => ({
      ...item,
      finalPrice: 80.25,
      hasPromotion: true,
      promotion: { id: 7, name: 'Weekend sale', discountType: 'percentage', discountValue: 20, internal: 'omit' }
    }))
  });
  const result = await retrieveAiCandidates({ message: 'sofa', maxCandidates: 1 }, dependencies);
  assert.equal(result.candidates[0].finalPrice, 80.25);
  assert.deepEqual(result.candidates[0].promotionSummary, {
    name: 'Weekend sale', discountType: 'percentage', discountValue: 20
  });
  assert.equal('promotion' in result.candidates[0], false);
});

test('uses one merged pricing authority call and one review query for each retrieval path', async () => {
  let pricingCalls = 0;
  let pricingProductRereads = 0;
  let promotionQueries = 0;
  const pricing = async (items) => {
    pricingCalls += 1;
    pricingProductRereads += 1;
    promotionQueries += 1;
    return items.map((item) => ({ ...item, finalPrice: Number(item.price), promotion: null }));
  };

  const full = createDependencies({ primary: [product(1), product(2)], pricing });
  await retrieveAiCandidates({ message: 'sofa', maxCandidates: 2 }, full);
  assert.equal(full.productCalls.length, 1);
  assert.equal(pricingCalls, 1);
  assert.equal(pricingProductRereads, 1);
  assert.equal(promotionQueries, 1);
  assert.equal(full.reviewCalls.length, 1);

  pricingCalls = 0;
  pricingProductRereads = 0;
  promotionQueries = 0;
  const insufficient = createDependencies({ primary: [product(1)], fallback: [product(2)], pricing });
  await retrieveAiCandidates({ message: 'sofa', maxCandidates: 2 }, insufficient);
  assert.equal(insufficient.productCalls.length, 2);
  assert.equal(pricingCalls, 1);
  assert.equal(pricingProductRereads, 1);
  assert.equal(promotionQueries, 1);
  assert.equal(insufficient.reviewCalls.length, 1);
});

test('aggregates approved reviews in one group query and gives deterministic zero defaults', async () => {
  const dependencies = createDependencies({
    primary: [product(1), product(2)],
    reviewSummaries: [{ productId: 1, _avg: { rating: 4.666 }, _count: { id: 3 } }]
  });
  const result = await retrieveAiCandidates({ message: 'sofa', maxCandidates: 2 }, dependencies);
  assert.deepEqual(result.candidates.map(({ id, averageRating, reviewCount }) => ({ id, averageRating, reviewCount })), [
    { id: 1, averageRating: 4.7, reviewCount: 3 },
    { id: 2, averageRating: 0, reviewCount: 0 }
  ]);
  assert.deepEqual(dependencies.reviewCalls[0].where.isApproved, true);
});

test('ranks with raw review averages even when the displayed averages round to the same value', async () => {
  const dependencies = createDependencies({
    primary: [product(2), product(1)],
    reviewSummaries: [
      { productId: 1, _avg: { rating: 4.84 }, _count: { id: 1 } },
      { productId: 2, _avg: { rating: 4.76 }, _count: { id: 1 } }
    ]
  });
  const result = await retrieveAiCandidates({ message: 'sofa', maxCandidates: 2 }, dependencies);
  assert.deepEqual(result.candidates.map((item) => item.id), [1, 2]);
  assert.deepEqual(result.candidates.map((item) => item.averageRating), [4.8, 4.8]);
  assert.equal('rawAverageRating' in result.candidates[0], false);
});

test('bounds keyword conditions to eight sanitized strings without a taxonomy layer', async () => {
  const words = Array.from({ length: 30 }, (_, index) => `word${index}`).join(' ');
  const dependencies = createDependencies({ primary: [product(1)] });
  await retrieveAiCandidates({ message: ` a ${words} `, maxCandidates: 1 }, dependencies);
  const keywordConditions = dependencies.productCalls[0].where.OR;
  assert.equal(keywordConditions.length, AI_MAX_SEARCH_KEYWORDS * 3);
  for (const condition of keywordConditions) {
    const text = condition.name?.contains ?? condition.description?.contains ?? condition.category.is.OR[0].name.contains;
    assert.equal(typeof text, 'string');
    assert.equal(text.length >= 2, true);
  }
});

test('pre-ranks deterministically by category, keyword, stock, promotion, rating, review count, then ID', () => {
  const candidates = [
    { id: 9, category: { name: 'Other' }, name: 'none', description: null, stock: 0, promotionSummary: null, averageRating: 1, reviewCount: 1 },
    { id: 8, category: { name: 'Sofa' }, name: 'none', description: null, stock: 0, promotionSummary: null, averageRating: 1, reviewCount: 1 },
    { id: 7, category: { name: 'Sofa' }, name: 'none', description: null, stock: 1, promotionSummary: null, averageRating: 1, reviewCount: 1 },
    { id: 6, category: { name: 'Sofa' }, name: 'none', description: null, stock: 1, promotionSummary: { name: 'sale' }, averageRating: 1, reviewCount: 1 },
    { id: 5, category: { name: 'Sofa' }, name: 'sofa keyword', description: null, stock: 1, promotionSummary: { name: 'sale' }, averageRating: 1, reviewCount: 1 },
    { id: 4, category: { name: 'Sofa' }, name: 'sofa keyword', description: null, stock: 1, promotionSummary: { name: 'sale' }, averageRating: 4, reviewCount: 1 },
    { id: 3, category: { name: 'Sofa' }, name: 'sofa keyword', description: null, stock: 1, promotionSummary: { name: 'sale' }, averageRating: 4, reviewCount: 2 },
    { id: 1, category: { name: 'Sofa' }, name: 'sofa keyword', description: null, stock: 1, promotionSummary: { name: 'sale' }, averageRating: 4, reviewCount: 2 },
    { id: 2, category: { name: 'Sofa' }, name: 'sofa keyword', description: null, stock: 1, promotionSummary: { name: 'sale' }, averageRating: 4, reviewCount: 2 }
  ];
  const sorted = [...candidates].sort((left, right) => compareAiCandidates(left, right, 'sofa'));
  assert.deepEqual(sorted.map((item) => item.id), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(candidates.map((item) => item.id), [9, 8, 7, 6, 5, 4, 3, 1, 2]);
});
