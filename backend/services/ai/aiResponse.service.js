import { AI_ERROR_CODE, AI_MAX_RECOMMENDATIONS, AiContractError } from './aiContracts.js';

const responseBuildError = () => new AiContractError(AI_ERROR_CODE.responseBuild, 'AI response cannot be rebuilt from backend candidates');
const numberField = (value) => {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) throw responseBuildError();
  return normalized;
};

const buildRecommendationDto = (candidate, reason) => {
  if (!candidate || !Number.isInteger(candidate.id) || candidate.id <= 0 || typeof candidate.name !== 'string') throw responseBuildError();
  return {
    id: candidate.id,
    name: candidate.name,
    slug: candidate.slug ?? null,
    image: candidate.image ?? null,
    price: numberField(candidate.price),
    finalPrice: numberField(candidate.finalPrice),
    promotion: candidate.promotionSummary ? { ...candidate.promotionSummary } : null,
    stock: numberField(candidate.stock),
    category: { name: candidate.category?.name ?? null, slug: candidate.category?.slug ?? null },
    averageRating: numberField(candidate.averageRating ?? 0),
    reviewCount: numberField(candidate.reviewCount ?? 0),
    reason
  };
};

const fallbackReason = (candidate) => {
  if (numberField(candidate.stock) > 0) return 'Sản phẩm hiện còn hàng.';
  if (candidate.promotionSummary) return 'Sản phẩm đang có khuyến mãi.';
  if (numberField(candidate.finalPrice) >= 0) return 'Có giá hiệu lực do hệ thống cập nhật.';
  if (numberField(candidate.averageRating ?? 0) > 0 && numberField(candidate.reviewCount ?? 0) > 0) return 'Có đánh giá từ khách hàng đã xác thực.';
  if (candidate.category?.name) return `Thuộc danh mục ${candidate.category.name}.`;
  return 'Gợi ý dựa trên dữ liệu sản phẩm hiện có.';
};

export const rebuildAiProviderResponse = ({ providerResult, candidates }) => {
  if (!providerResult || typeof providerResult.answer !== 'string' || !Array.isArray(providerResult.recommendations) || !Array.isArray(candidates)) throw responseBuildError();
  const candidatesById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const recommendations = providerResult.recommendations.map(({ id, reason }) => {
    const candidate = candidatesById.get(id);
    if (!candidate) throw responseBuildError();
    return buildRecommendationDto(candidate, reason);
  });
  if (recommendations.length > AI_MAX_RECOMMENDATIONS) throw responseBuildError();
  return { answer: providerResult.answer, recommendations };
};

export const buildDeterministicAiFallback = ({ candidates }) => {
  if (!Array.isArray(candidates)) throw responseBuildError();
  return {
    answer: 'Đây là các gợi ý dựa trên dữ liệu sản phẩm hiện có.',
    recommendations: candidates.slice(0, AI_MAX_RECOMMENDATIONS).map((candidate) => buildRecommendationDto(candidate, fallbackReason(candidate)))
  };
};

export const buildAiNoResultResponse = () => ({
  answer: 'Hiện chưa tìm thấy sản phẩm phù hợp. Bạn có thể mô tả rõ hơn loại sản phẩm, ngân sách hoặc nhu cầu sử dụng.',
  recommendations: []
});
