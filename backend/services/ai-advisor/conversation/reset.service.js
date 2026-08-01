const normalize = (message = '') => String(message).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
const RESET_PATTERN = /\b(bat dau lai|xoa yeu cau cu|tu van lai tu dau|cuoc tro chuyen moi)\b/i;
export const isConversationResetMessage = (message = '') => RESET_PATTERN.test(normalize(message));
export const inferConversationOperations = (message = '', intent) => {
  const text = normalize(message);
  return {
    colors: /khong can mau|bo mau cu|xoa mau/.test(text) ? 'clear' : intent.colors?.length ? 'replace' : 'retain',
    materials: /khong can chat lieu|bo chat lieu|xoa chat lieu/.test(text) ? 'clear' : intent.materials?.length ? 'replace' : 'retain',
    budget: /bo ngan sach|khong gioi han ngan sach/.test(text) ? 'clear' : (intent.budget?.min !== null || intent.budget?.max !== null) ? 'replace' : 'retain'
  };
};
