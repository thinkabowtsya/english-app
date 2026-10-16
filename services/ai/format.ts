/** Untuk penilaian "Benar", baris "Versi yang benar" tidak perlu (hanya membingungkan). */
export function tidyCheckFeedback(text: string): string {
  const lines = text.split('\n');
  if (!/^benar\b/i.test(lines[0]?.trim() ?? '')) return text;
  return lines.filter((l) => !/^\s*versi yang benar\s*:/i.test(l)).join('\n').trim();
}

/**
 * Membersihkan format markdown dari jawaban model agar mudah dibaca sebagai teks biasa:
 * tanpa **tebal**, *miring*, __garis__, judul #, atau `kode`. Daftar "- " tetap dipertahankan.
 */
export function toPlainText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/```[a-z]*\n?/gi, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/(^|[\s(])\*(?!\s)([^*\n]+?)\*(?=[\s).,!?:;]|$)/g, '$1$2')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*[*•]\s+/gm, '- ')
    .replace(/\*\*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
