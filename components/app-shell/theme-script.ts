import { DATA_KEY } from '@/lib/storage/store';

/**
 * Skrip inline yang berjalan sebelum paint pertama agar tema tersimpan langsung diterapkan
 * (tanpa kedip). Dibaca dari pengaturan di localStorage. Lihat ThemeSync untuk perubahan
 * setelah halaman aktif.
 */
export const themeInitScript = `(function(){try{var t='system';var raw=localStorage.getItem(${JSON.stringify(
  DATA_KEY,
)});if(raw){var d=JSON.parse(raw);var s=d&&d.settings&&d.settings.theme;if(s==='light'||s==='dark'||s==='system')t=s}var dark=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',dark)}catch(e){}})();`;
