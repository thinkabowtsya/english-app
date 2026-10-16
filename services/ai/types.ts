import type { AiProviderName, CoachRequest } from '@/types/ai';

/**
 * Kontrak layanan AI Coach. UI dan Route Handler hanya bergantung pada interface ini,
 * sehingga implementasi mock dan Groq bisa ditukar tanpa mengubah halaman.
 */
export interface AiCoachService {
  readonly provider: AiProviderName;
  readonly model: string | null;
  respond(request: CoachRequest): Promise<string>;
}

/** Kesalahan dari penyedia AI (jaringan, kuota, model). Pesan aslinya hanya untuk log server. */
export class AiProviderError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
    this.name = 'AiProviderError';
  }
}
