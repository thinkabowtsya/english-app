/** ID acak. crypto.randomUUID tidak tersedia di konteks non-secure (mis. akses via IP LAN). */
export function createId(prefix = ''): string {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return prefix ? `${prefix}_${random}` : random;
}
