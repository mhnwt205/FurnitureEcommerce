import { z } from 'zod';
import { AI_COLORS, AI_MATERIALS } from '../intent/intent.taxonomy.js';
const scalar = z.enum(['retain', 'replace', 'clear']); const array = z.enum(['retain', 'replace', 'append', 'clear', 'exclude']);
export const conversationOperationsSchema = z.object({ category: scalar, room: scalar, style: scalar, size: scalar, budget: scalar, stockRequired: scalar, colors: array, materials: array }).strict();
const norm = (v = '') => String(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
const find = (text, values) => values.filter((v) => norm(text).includes(norm(v)));
export const recognizeConversationOperations = (message = '') => {
  const text = norm(message); const mode = (field) => new RegExp(`khong can ${field}|bo ${field}|xoa ${field}`).test(text) ? 'clear' : /khong lay|tranh|khong thich/.test(text) ? 'exclude' : /them|cung|hoac them/.test(text) ? 'append' : /doi sang|chon|chuyen sang/.test(text) ? 'replace' : 'retain';
  return conversationOperationsSchema.parse({ category: 'retain', room: /doi sang phong ngu/.test(text) ? 'replace' : 'retain', style: 'retain', size: 'retain', budget: /bo ngan sach|khong gioi han ngan sach/.test(text) ? 'clear' : 'retain', stockRequired: /khong can con hang|khong bat buoc con hang/.test(text) ? 'clear' : 'retain', colors: mode('mau'), materials: mode('chat lieu') });
};
export const recognizedValues = (message = '') => ({ colors: find(message, AI_COLORS), materials: find(message, AI_MATERIALS) });
