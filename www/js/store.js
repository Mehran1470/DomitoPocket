// ذخیرهٔ محلی نام بازیکن + فهرست ۷ بازی دومیتو جیبی
export const GAMES = [
  { id: 'reaction',    name: 'اجرشکن',       icon: '⚡', desc: 'سرعت واکنشت رو بسنج',   multi: false },
  { id: 'memory',      name: 'حافظه',        icon: '🧠', desc: 'توالی رنگ‌ها رو یادت نگه دار', multi: false },
  { id: 'math',        name: 'پرش از سکو',   icon: '🦘', desc: 'با ریاضی از سکوها بپر',  multi: false },
  { id: 'snake',       name: 'مار',          icon: '🐍', desc: 'بخور و بزرگ شو',        multi: false },
  { id: 'astra',       name: 'آسترا',        icon: '🚀', desc: 'ماجراجویی فضایی',        multi: false },
  { id: 'gunball',     name: 'گان‌بال',      icon: '🔫', desc: 'نبرد چندنفره',           multi: true },
  { id: 'lightpuzzle', name: 'پازل نور',     icon: '💡', desc: 'پازل چندنفره',           multi: true }
];

const KEY = 'domito_name';

export function getSavedName() {
  try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; }
}

export function saveName(name) {
  try { localStorage.setItem(KEY, name); } catch (e) {}
}

export function clearName() {
  try { localStorage.removeItem(KEY); } catch (e) {}
}
