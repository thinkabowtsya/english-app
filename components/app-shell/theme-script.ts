import { LEGACY_DATA_KEY, PREFS_KEY } from '@/lib/storage/prefs';

/**
 * Skrip inline yang berjalan sebelum paint pertama agar tema tersimpan langsung diterapkan
 * (tanpa kedip). Tema adalah preferensi per perangkat (localStorage). Lihat ThemeSync untuk
 * perubahan setelah halaman aktif.
 */
export const themeInitScript = `(function(){try{var t='system';var raw=localStorage.getItem(${JSON.stringify(
  PREFS_KEY,
)});var s=null;if(raw){s=JSON.parse(raw).theme}else{var old=localStorage.getItem(${JSON.stringify(
  LEGACY_DATA_KEY,
)});if(old){var d=JSON.parse(old);s=d&&d.settings&&d.settings.theme}}if(s==='light'||s==='dark'||s==='system')t=s;var dark=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',dark)}catch(e){}})();`;
