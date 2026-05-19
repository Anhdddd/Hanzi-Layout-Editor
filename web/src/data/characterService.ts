/**
 * CharacterService — loads and provides access to character stroke data.
 * Characters are loaded from /characters.json and /chiettu.json (public static files).
 */

export interface CharacterData {
  char: string;
  def: string;
  decomp: string;
  radical: string;
  etymology: string;
  strokes: string[];       // SVG path data for each stroke
  medians: number[][][];   // median points for each stroke
  matches: number[][];
  strokeCount: number;
  pinyin: string;
  vietnamese: string;
  vietnameseMeaning: string;  // short Vietnamese meaning from chiettu.json
}

interface ChietTuItem {
  word: string;
  pinyin: string;
  vietnamese_meaning: string;
  breakdown: unknown[];
  compounds: unknown[];
}

type CharacterMap = Record<string, CharacterData>;

let characterCache: CharacterMap | null = null;
let loadingPromise: Promise<CharacterMap> | null = null;

/**
 * Load character data from the static JSON files.
 * Merges characters.json (strokes) with chiettu.json (vietnamese_meaning).
 * Caches the result so subsequent calls are instant.
 */
export async function loadCharacters(): Promise<CharacterMap> {
  if (characterCache) return characterCache;
  if (loadingPromise) return loadingPromise;

  loadingPromise = Promise.all([
    fetch('/characters.json').then(res => {
      if (!res.ok) throw new Error(`Failed to load characters: ${res.status}`);
      return res.json();
    }),
    fetch('/chiettu.json').then(res => {
      if (!res.ok) return [];  // chiettu is optional
      return res.json();
    }).catch(() => []),
  ]).then(([charData, chiettuData]: [CharacterMap, ChietTuItem[]]) => {
    // Build a lookup map from chiettu
    const chiettuMap: Record<string, string> = {};
    if (Array.isArray(chiettuData)) {
      for (const item of chiettuData) {
        if (item.word && item.vietnamese_meaning) {
          chiettuMap[item.word] = item.vietnamese_meaning;
        }
      }
    }

    // Merge vietnameseMeaning into character data
    for (const key of Object.keys(charData)) {
      (charData[key] as CharacterData).vietnameseMeaning = chiettuMap[key] || '';
    }

    characterCache = charData;
    return charData;
  });

  return loadingPromise;
}

/**
 * Get character data for a single character.
 * Returns null if not found or not yet loaded.
 */
export function getCharacter(char: string): CharacterData | null {
  if (!characterCache) return null;
  return characterCache[char] || null;
}

/**
 * Look up multiple characters at once.
 * Returns array of found characters (skips not-found ones).
 */
export function getCharacters(chars: string[]): CharacterData[] {
  if (!characterCache) return [];
  return chars
    .map(c => characterCache![c])
    .filter((c): c is CharacterData => !!c);
}

/**
 * Check if character data is loaded.
 */
export function isLoaded(): boolean {
  return characterCache !== null;
}

/**
 * Generate SVG markup for stroke progression of a character.
 * Each step shows all previous strokes in black + current stroke in red.
 * Returns an array of SVG strings, one per step.
 */
export function generateStrokeProgressionSVGs(charData: CharacterData, size: number = 60): string[] {
  const strokes = charData.strokes;
  const svgs: string[] = [];

  for (let step = 0; step < strokes.length; step++) {
    let paths = '';
    for (let i = 0; i <= step; i++) {
      const color = i === step ? '#cc0000' : '#000000';
      paths += `<path d="${strokes[i]}" fill="${color}" />`;
    }
    svgs.push(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="${size}" height="${size}"><g transform="scale(1,-1) translate(0,-900)">${paths}</g></svg>`
    );
  }

  return svgs;
}

/**
 * Generate a single full-character SVG (all strokes in black).
 */
export function generateCharacterSVG(charData: CharacterData, size: number = 60, color: string = '#000000'): string {
  const paths = charData.strokes.map(s => `<path d="${s}" fill="${color}" />`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="${size}" height="${size}"><g transform="scale(1,-1) translate(0,-900)">${paths}</g></svg>`;
}

/**
 * Generate a guide SVG for tracing practice.
 * Each stroke is rendered with white fill and a dashed black outline border,
 * creating a hollow "trace along" guide that users can follow with a pen.
 * Opacity decreases per stroke to hint at stroke order.
 */
export function generateGuideSVG(charData: CharacterData, size: number = 60, baseOpacity: number = 0.5): string {
  const strokes = charData.strokes;
  const totalStrokes = strokes.length;
  let paths = '';

  for (let i = 0; i < totalStrokes; i++) {
    const opacity = baseOpacity * (1 - (i / totalStrokes) * 0.3);
    paths += `<path d="${strokes[i]}" fill="#ffffff" stroke="#000000" stroke-opacity="${opacity.toFixed(2)}" stroke-width="14" stroke-dasharray="20 12" />`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="${size}" height="${size}"><g transform="scale(1,-1) translate(0,-900)">${paths}</g></svg>`;
}
