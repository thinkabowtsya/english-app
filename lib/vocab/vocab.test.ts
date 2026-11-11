import { describe, expect, it } from 'vitest';
import { parseAiVocabItems } from './cards';
import { pickPexelsImage, pickPronunciation } from './enrich';

describe('parseAiVocabItems', () => {
  it('memvalidasi item, membuang item rusak & kata ganda, dan memaksa level/kategori', () => {
    const raw = {
      items: [
        {
          word: 'Negotiate',
          phonetic: '/nɪˈɡoʊʃieɪt/',
          partOfSpeech: 'verb',
          definitionEn: 'to discuss to reach an agreement',
          definitionId: 'bernegosiasi',
          exampleEn: 'We negotiated the price.',
          exampleId: 'Kami menegosiasikan harga.',
          collocations: ['negotiate a deal'],
          cefr: 'C2',
          category: 'Travel',
          imageQuery: 'business meeting',
        },
        { word: 'negotiate ', definitionEn: 'dup', definitionId: 'dup' },
        { word: '', definitionEn: 'x', definitionId: 'y' },
        { word: 'deadline', definitionEn: 'a time limit', definitionId: 'tenggat', collocations: 'bukan array' },
      ],
    };
    const result = parseAiVocabItems(raw, 'B1', 'Business');
    expect(result.map((r) => r.card.word)).toEqual(['Negotiate', 'deadline']);
    expect(result[0].card).toMatchObject({ id: 'negotiate', phonetic: 'nɪˈɡoʊʃieɪt', cefr: 'B1', category: 'Business' });
    expect(result[0].imageQuery).toBe('business meeting');
    expect(result[1].card.collocations).toEqual([]);
  });

  it('mengembalikan array kosong untuk format yang salah', () => {
    expect(parseAiVocabItems(null, 'A1', 'Daily')).toEqual([]);
    expect(parseAiVocabItems({ items: 'x' }, 'A1', 'Daily')).toEqual([]);
  });
});

describe('pickPronunciation', () => {
  it('mengutamakan audio US dan membuang garis miring IPA', () => {
    const entries = [
      {
        phonetic: '/həˈləʊ/',
        phonetics: [
          { text: '/həˈləʊ/', audio: 'https://api.dictionaryapi.dev/media/pronunciations/en/hello-uk.mp3' },
          { text: '/həˈloʊ/', audio: 'https://api.dictionaryapi.dev/media/pronunciations/en/hello-us.mp3' },
        ],
      },
    ];
    expect(pickPronunciation(entries)).toEqual({
      phonetic: 'həˈloʊ',
      audioUrl: 'https://api.dictionaryapi.dev/media/pronunciations/en/hello-us.mp3',
    });
  });

  it('tetap mengambil IPA walau tanpa audio, dan aman untuk respons "not found"', () => {
    expect(pickPronunciation([{ phonetics: [{ text: '/kæt/', audio: '' }] }])).toEqual({ phonetic: 'kæt' });
    expect(pickPronunciation({ title: 'No Definitions Found' })).toEqual({});
  });
});

describe('pickPexelsImage', () => {
  it('mengambil foto pertama beserta kredit fotografer', () => {
    const body = {
      photos: [
        {
          url: 'https://www.pexels.com/photo/123/',
          alt: 'Two people shaking hands',
          photographer: 'Jane Doe',
          photographer_url: 'https://www.pexels.com/@jane',
          src: { medium: 'https://images.pexels.com/photos/123/pexels-photo-123.jpeg?auto=compress&h=350' },
        },
      ],
    };
    expect(pickPexelsImage(body)).toEqual({
      url: 'https://images.pexels.com/photos/123/pexels-photo-123.jpeg?auto=compress&h=350',
      alt: 'Two people shaking hands',
      credit: 'Jane Doe',
      creditUrl: 'https://www.pexels.com/@jane',
      source: 'pexels',
    });
  });

  it('menolak hasil kosong atau URL di luar images.pexels.com', () => {
    expect(pickPexelsImage({ photos: [] })).toBeUndefined();
    expect(pickPexelsImage({ photos: [{ src: { medium: 'https://evil.example/x.jpg' } }] })).toBeUndefined();
  });
});
