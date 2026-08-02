import prisma from '../../prismaClient.js';
import { attachPricingToProducts } from '../promotionPricing.service.js';
import { AI_DEFAULT_MAX_CANDIDATES, AI_FALLBACK_REASON, AI_HARD_MAX_CANDIDATES, AI_MAX_SEARCH_KEYWORDS } from './aiContracts.js';

const productSelection = Object.freeze({ id: true, name: true, slug: true, price: true, imageUrl: true, stock: true, color: true, material: true, roomType: true, style: true, widthCm: true, heightCm: true, depthCm: true, dimensions: true, description: true, category: { select: { name: true, slug: true } } });
const normalizeText = (value) => String(value ?? '').trim().toLocaleLowerCase();
const normalizeKeywords = (message) => [...new Set(String(message ?? '').split(/[\s,.;:!?()[\]{}"']+/).map(normalizeText).filter((word) => word.length >= 2).slice(0, AI_MAX_SEARCH_KEYWORDS))];
const matches = (value, keywords) => keywords.some((word) => normalizeText(value).includes(word));
const uniqueProducts = (products) => { const seen = new Set(); return products.filter((product) => !seen.has(product.id) && (seen.add(product.id) || true)); };
const limitOf = (value) => !Number.isInteger(value) || value < 1 ? AI_DEFAULT_MAX_CANDIDATES : Math.min(value, AI_HARD_MAX_CANDIDATES);

export const sanitizeAiDescription = (description) => {
  if (description === null || description === undefined) return null;
  const value = String(description).replace(/<script\b[^>]*>[\s\S]*?(?:<\/script>|$)/gi, ' ').replace(/<style\b[^>]*>[\s\S]*?(?:<\/style>|$)/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
  return value || null;
};

export const projectAiCandidate = (product) => ({ id: product.id, name: product.name, slug: product.slug ?? null, image: product.imageUrl ?? null, price: Number(product.price), category: { name: product.category?.name ?? null, slug: product.category?.slug ?? null }, finalPrice: Number(product.finalPrice ?? product.price), stock: product.stock, stockStatus: product.stock > 0 ? 'in_stock' : 'out_of_stock', color: product.color ?? null, material: product.material ?? null, roomType: product.roomType ?? null, style: product.style ?? null, widthCm: product.widthCm ?? null, heightCm: product.heightCm ?? null, depthCm: product.depthCm ?? null, dimensions: product.dimensions ?? null, promotionSummary: product.promotion ? { name: product.promotion.name, discountType: product.promotion.discountType, discountValue: Number(product.promotion.discountValue) } : null, averageRating: Number(product.averageRating ?? 0), reviewCount: Number(product.reviewCount ?? 0), description: sanitizeAiDescription(product.description) });

export const compareAiCandidates = (left, right, inputKeywords) => {
  const keywords = Array.isArray(inputKeywords) ? inputKeywords : normalizeKeywords(inputKeywords);
  const category = (item) => Number(matches(item.category?.name, keywords) || matches(item.category?.slug, keywords));
  const keyword = (item) => Number(matches(item.name, keywords) || matches(item.description, keywords));
  const values = [[category(right)-category(left)], [keyword(right)-keyword(left)], [Number(right.stock > 0)-Number(left.stock > 0)], [Number(Boolean(right.promotionSummary))-Number(Boolean(left.promotionSummary))], [Number(right.rawAverageRating ?? right.averageRating ?? 0)-Number(left.rawAverageRating ?? left.averageRating ?? 0)], [Number(right.reviewCount ?? 0)-Number(left.reviewCount ?? 0)], [left.id-right.id]];
  return values.find(([value]) => value !== 0)?.[0] ?? 0;
};

const PROFILE_CATEGORY = Object.freeze({ chair: 'ghế', sofa: 'sofa', table: 'bàn', bed: 'giường', cabinet: 'tủ', lamp: 'đèn' });
const buildPrimaryWhere = (keywords, profile = {}) => {
  const where = { isActive: true, OR: keywords.flatMap((word) => [{ name: { contains: word } }, { description: { contains: word } }, { category: { is: { OR: [{ name: { contains: word } }, { slug: { contains: word } }] } } }]) };
  if (PROFILE_CATEGORY[profile.productType]) where.category = { is: { name: { contains: PROFILE_CATEGORY[profile.productType] } } };
  if (Number.isInteger(profile.budgetMax) && profile.budgetMax >= 0) where.price = { lte: profile.budgetMax };
  return where;
};
const addReviewSummaries = async (products, database) => {
  if (!products.length) return [];
  const summaries = await database.review.groupBy({ by: ['productId'], where: { productId: { in: products.map(({ id }) => id) }, isApproved: true }, _avg: { rating: true }, _count: { id: true } });
  const byId = new Map(summaries.map((item) => [item.productId, { raw: Number(item._avg.rating ?? 0), count: item._count.id }]));
  return products.map((product) => ({ ...product, rawAverageRating: byId.get(product.id)?.raw ?? 0, averageRating: Number((byId.get(product.id)?.raw ?? 0).toFixed(1)), reviewCount: byId.get(product.id)?.count ?? 0 }));
};
const defaultDependencies = Object.freeze({ prisma, attachPricingToProducts });

export const retrieveAiCandidates = async (input, dependencies = defaultDependencies) => {
  const maxCandidates = limitOf(input?.maxCandidates); const keywords = normalizeKeywords(input?.message); const profile = input?.profile ?? {}; const database = dependencies.prisma;
  const primaryWhere = buildPrimaryWhere(keywords, profile);
  const rawPrimary = await database.product.findMany({ where: primaryWhere, select: productSelection, take: maxCandidates, orderBy: { id: 'asc' } });
  const primaryCount = rawPrimary.length; const primary = uniqueProducts(rawPrimary); let products = primary; let fallbackUsed = false; let fallbackReason = AI_FALLBACK_REASON.none;
  if (rawPrimary.length < maxCandidates) { fallbackUsed = true; fallbackReason = rawPrimary.length ? AI_FALLBACK_REASON.primaryInsufficient : AI_FALLBACK_REASON.primaryEmpty; const profileConstrained = Boolean(PROFILE_CATEGORY[profile.productType] || Number.isInteger(profile.budgetMax)); const fallbackWhere = profileConstrained ? primaryWhere : { isActive: true }; const fallback = await database.product.findMany({ where: primary.length ? { ...fallbackWhere, id: { notIn: primary.map(({ id }) => id) } } : fallbackWhere, select: productSelection, take: maxCandidates - rawPrimary.length, orderBy: { id: 'asc' } }); products = uniqueProducts([...primary, ...fallback]).slice(0, maxCandidates); }
  const priced = products.length ? await dependencies.attachPricingToProducts(products) : [];
  const candidates = (await addReviewSummaries(priced, database)).sort((a,b) => compareAiCandidates(a,b,keywords)).map(projectAiCandidate).slice(0,maxCandidates);
  return { candidates, metadata: { primaryCount, fallbackUsed, fallbackReason, retrievedCount: candidates.length } };
};
