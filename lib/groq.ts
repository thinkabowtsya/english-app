import Groq from 'groq-sdk';

const rawBaseUrl = process.env.GROQ_BASE_URL;
// groq-sdk appends /openai/v1 automatically. Strip /openai/v1 if present to prevent double URL pathing.
const baseURL = rawBaseUrl ? rawBaseUrl.replace(/\/openai\/v1\/?$/, '') : undefined;

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  ...(baseURL ? { baseURL } : {}),
});

export const MAIN_MODEL = 'llama-3.3-70b-versatile';
