import { comparativeTypes } from './comparative.schema.js';

const normalize = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\u0111/g, 'd')
  .toLowerCase();

const ORDINAL_PATTERNS = [
  [1, /mau thu nhat|mau dau tien|san pham thu nhat|san pham dau tien|san pham so 1|chon mau 1/],
  [2, /mau thu hai|san pham thu hai|san pham so 2|chon mau 2/],
  [3, /mau thu ba|san pham thu ba|san pham so 3|chon mau 3/],
  [4, /mau thu tu|san pham thu tu|san pham so 4|chon mau 4/],
  [5, /mau thu nam|san pham thu nam|san pham so 5|chon mau 5/]
];

export const extractComparativeSignal = (message = '') => {
  const text = normalize(message);
  const raw = String(message).toLocaleLowerCase('vi-VN');
  const ordinal = ORDINAL_PATTERNS.find(([, pattern]) => pattern.test(text))?.[0] || null;
  const unsupportedOrdinal = /mau thu (sau|bay|tam|chin|muoi)|san pham thu (sau|bay|tam|chin|muoi)|san pham so [6-9]|chon mau [6-9]|mau so 0/.test(text);
  let type = 'none';
  let ambiguous = false;

  if (/con hang khong/.test(text)) type = 'stock_check';
  else if (ordinal || unsupportedOrdinal) type = 'ordinal_product';
  else if (/giong mau truoc|tuong tu mau vua roi|kieu nhu san pham truoc/.test(text)) type = 'similar_to_previous';
  else if (/\bm\u1eabu kh\u00e1c\b|\blo\u1ea1i kh\u00e1c\b|\bs\u1ea3n ph\u1ea9m kh\u00e1c\b/u.test(raw)) type = 'different_product';
  else if (/mau khac|doi mau khac|khong mau nay/.test(text)) type = 'different_color';
  else if (/chat lieu khac|loai go khac|khong chat lieu nay/.test(text)) type = 'different_material';
  else if (/phong cach khac|kieu khac/.test(text)) type = 'different_style';
  else if (/nho hon|kich thuoc nho hon|gon hon/.test(text)) type = 'smaller';
  else if (/lon hon|rong hon/.test(text)) type = 'larger';
  else if (/re hon|gia thap hon|tiet kiem hon|mau re hon|loai re hon/.test(text)) type = 'cheaper';
  else if (/dat hon|gia cao hon/.test(text)) type = 'more_expensive';
  else if (/cao cap hon/.test(text)) { type = 'more_expensive'; ambiguous = true; }

  return { type: comparativeTypes.includes(type) ? type : 'none', ordinal, ambiguous: ambiguous || unsupportedOrdinal };
};
