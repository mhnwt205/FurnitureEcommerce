export const AI_INTENT_TYPES = ['product_recommendation', 'catalog_question', 'unknown'];
export const AI_CATEGORIES = ['sofa', 'ban', 'ghe', 'giuong', 'tu', 'den'];
export const AI_ROOMS = ['living_room', 'bedroom', 'home_office', 'office', 'kitchen', 'balcony'];
export const AI_STYLES = ['modern', 'minimalist', 'classic', 'luxury', 'vintage', 'scandinavian'];
export const AI_COLORS = ['white', 'black', 'gray', 'brown', 'yellow', 'beige', 'cream', 'blue', 'wood'];
export const AI_MATERIALS = ['engineered_wood', 'natural_wood', 'wood', 'pu_leather', 'leather', 'fabric', 'felt', 'metal', 'glass', 'rattan', 'plastic'];
export const AI_SIZES = ['small', 'large', 'mini', 'wide', 'tall', 'low'];
export const AI_SORT_PREFERENCES = ['price_asc', 'price_desc', 'rating_desc', 'newest'];

const toMap = (entries) => new Map(entries);

export const legacyToIntent = {
  color: toMap([['trang', 'white'], ['den', 'black'], ['xam', 'gray'], ['ghi', 'gray'], ['nau', 'brown'], ['vang', 'yellow'], ['be', 'beige'], ['kem', 'cream'], ['xanh', 'blue'], ['go', 'wood']]),
  material: toMap([['go cong nghiep', 'engineered_wood'], ['go tu nhien', 'natural_wood'], ['go', 'wood'], ['da pu', 'pu_leather'], ['da', 'leather'], ['vai', 'fabric'], ['ni', 'felt'], ['kim loai', 'metal'], ['kinh', 'glass'], ['may', 'rattan'], ['nhua', 'plastic']]),
  room: toMap([['phong khach', 'living_room'], ['phong ngu', 'bedroom'], ['phong lam viec', 'home_office'], ['van phong', 'office'], ['bep', 'kitchen'], ['ban cong', 'balcony']]),
  style: toMap([['hien dai', 'modern'], ['toi gian', 'minimalist'], ['co dien', 'classic'], ['luxury', 'luxury'], ['sang trong', 'luxury'], ['vintage', 'vintage'], ['bac au', 'scandinavian']]),
  size: toMap([['nho', 'small'], ['lon', 'large'], ['mini', 'mini'], ['rong', 'wide'], ['cao', 'tall'], ['thap', 'low']])
};

export const intentToLegacy = {
  color: toMap([...legacyToIntent.color].map(([legacy, intent]) => [intent, legacy])),
  material: toMap([...legacyToIntent.material].map(([legacy, intent]) => [intent, legacy])),
  room: toMap([...legacyToIntent.room].map(([legacy, intent]) => [intent, legacy])),
  style: toMap([...legacyToIntent.style].map(([legacy, intent]) => [intent, legacy])),
  size: toMap([...legacyToIntent.size].map(([legacy, intent]) => [intent, legacy]))
};

export const AI_INTENT_TAXONOMY = {
  intentTypes: AI_INTENT_TYPES,
  categories: AI_CATEGORIES,
  rooms: AI_ROOMS,
  styles: AI_STYLES,
  colors: AI_COLORS,
  materials: AI_MATERIALS,
  sizes: AI_SIZES,
  sortPreferences: AI_SORT_PREFERENCES
};
