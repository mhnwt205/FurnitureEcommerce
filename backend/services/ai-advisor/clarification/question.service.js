import { clarificationFields } from './clarification.schema.js';
const templates = {
  category: { text: 'Bạn đang muốn tìm loại sản phẩm nào, chẳng hạn sofa, bàn, ghế, giường, tủ hay đèn?', options: ['Sofa', 'Bàn', 'Ghế', 'Giường', 'Tủ', 'Đèn'] },
  budget: { text: 'Ngân sách dự kiến của bạn khoảng bao nhiêu?', options: ['Dưới 5 triệu', '5–10 triệu', '10–20 triệu', 'Trên 20 triệu'] },
  conflict: { text: 'Mình thấy yêu cầu hiện tại có thông tin chưa thống nhất. Bạn muốn ưu tiên điều kiện nào?', options: [] },
  relaxation: { text: 'Hiện chưa có sản phẩm khớp hoàn toàn. Bạn muốn nới một tiêu chí nào?', options: ['Ngân sách', 'Màu sắc', 'Chất liệu'] }
};
const noResultTemplates = {
  missing_comparative_reference: { text: 'Báº¡n muá»‘n so sÃ¡nh vá»›i máº«u nÃ o?', options: [] },
  no_cheaper_match: { text: 'Hiá»‡n chÆ°a cÃ³ máº«u nÃ o ráº» hÆ¡n lá»±a chá»n trÆ°á»›c trong cÃ¡c tiÃªu chÃ­ hiá»‡n táº¡i.', options: [] },
  no_more_expensive_match: { text: 'Hiá»‡n chÆ°a cÃ³ máº«u nÃ o Ä‘áº¯t hÆ¡n lá»±a chá»n trÆ°á»›c trong cÃ¡c tiÃªu chÃ­ hiá»‡n táº¡i.', options: [] },
  no_different_product: { text: 'Hiá»‡n chÆ°a cÃ³ máº«u khÃ¡c ngoÃ i cÃ¡c lá»±a chá»n trÆ°á»›c trong cÃ¡c tiÃªu chÃ­ hiá»‡n táº¡i.', options: [] },
  no_smaller_match: { text: 'Hiá»‡n chÆ°a cÃ³ máº«u nhá» hÆ¡n trong cÃ¡c tiÃªu chÃ­ hiá»‡n táº¡i.', options: [] },
  no_larger_match: { text: 'Hiá»‡n chÆ°a cÃ³ máº«u lá»›n hÆ¡n trong cÃ¡c tiÃªu chÃ­ hiá»‡n táº¡i.', options: [] },
  no_category_match: { text: 'Hiện mình chưa tìm thấy sản phẩm đúng danh mục bạn yêu cầu. Bạn muốn chọn loại sản phẩm khác không?', options: ['Sofa', 'Bàn', 'Ghế', 'Giường', 'Tủ', 'Đèn'] },
  no_budget_match: { text: 'Hiện chưa có sản phẩm phù hợp với ngân sách này. Bạn muốn điều chỉnh ngân sách không?', options: ['Dưới 5 triệu', '5–10 triệu', '10–20 triệu', 'Trên 20 triệu'] },
  no_attribute_match: { text: 'Hiện chưa có sản phẩm khớp toàn bộ tiêu chí. Bạn muốn thay đổi một tiêu chí nào?', options: ['Màu sắc', 'Chất liệu', 'Phong cách'] },
  excluded_only: { text: 'Hiện chưa có sản phẩm phù hợp sau khi loại các tiêu chí bạn không muốn. Bạn muốn bỏ bớt một điều kiện loại trừ không?', options: ['Màu sắc', 'Chất liệu', 'Phong cách'] },
  out_of_stock_only: { text: 'Các sản phẩm phù hợp hiện đang hết hàng. Bạn muốn xem cả sản phẩm tạm hết hàng hay thay đổi tiêu chí khác?', options: ['Xem sản phẩm tạm hết hàng', 'Thay đổi tiêu chí'] },
  no_active_product: { text: 'Hiện chưa có sản phẩm đang hoạt động phù hợp. Bạn muốn thử nhóm sản phẩm khác không?', options: ['Sofa', 'Bàn', 'Ghế', 'Giường', 'Tủ', 'Đèn'] }
};

export const buildClarificationQuestion = (field, reasonCode = null, noResultReasons = []) => {
  const noResultReason = Array.isArray(noResultReasons) ? noResultReasons.find((reason) => noResultTemplates[reason]) : null;
  const question = field === 'relaxation' && noResultReason ? noResultTemplates[noResultReason] : templates[field] || templates.category;
  return { text: question.text.slice(0, 300), options: question.options.slice(0, 6) };
};
export const isClarificationField = (field) => clarificationFields.includes(field);
