import 'server-only';
import Groq from 'groq-sdk';

/**
 * Klien Groq hanya untuk server. API key dibaca dari GROQ_API_KEY (tanpa prefix
 * NEXT_PUBLIC_) sehingga tidak pernah masuk ke bundle browser.
 */

/**
 * Model default. `llama-3.3-70b-versatile` (model lama) sudah tidak tersedia di Groq;
 * ganti lewat GROQ_MODEL jika model ini nanti juga dihentikan.
 */
export const MAIN_MODEL = process.env.GROQ_MODEL?.trim() || 'openai/gpt-oss-120b';

/**
 * Opsi tambahan per model. Model reasoning gpt-oss memakai effort rendah agar respons
 * cepat dan token reasoning tidak menghabiskan batas output.
 */
export function modelOptions(): { reasoning_effort?: 'low' } {
  return MAIN_MODEL.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {};
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super('GROQ_API_KEY belum diatur');
    this.name = 'AiNotConfiguredError';
  }
}

export function isGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

let client: Groq | null = null;

export function getGroq(): Groq {
  if (!isGroqConfigured()) throw new AiNotConfiguredError();
  if (!client) {
    const rawBaseUrl = process.env.GROQ_BASE_URL?.trim();
    // groq-sdk menambahkan /openai/v1 sendiri; buang jika sudah ada agar path tidak dobel.
    const baseURL = rawBaseUrl ? rawBaseUrl.replace(/\/openai\/v1\/?$/, '') : undefined;
    client = new Groq({
      apiKey: process.env.GROQ_API_KEY,
      ...(baseURL ? { baseURL } : {}),
      timeout: 30_000,
      maxRetries: 1,
    });
  }
  return client;
}
