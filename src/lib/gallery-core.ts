export type GalleryOverride = { alt?: string; caption?: string; position?: string };
export type GalleryPhoto<I> = { id: string; file: string; image: I; index: number; alt: string; caption: string; position: string };

// sharp only accepts these keywords for cover crops; CSS values such as '50% 30%' fail the build.
export const THUMB_POSITIONS = [
  'attention', 'entropy', 'center', 'centre', 'top', 'right', 'bottom', 'left', 'right top', 'right bottom', 'left bottom', 'left top',
  'north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest',
];

const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
const stem = (file: string) => file.replace(/\.[^.]+$/, '');

function hasFinalConsonant(word: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 ? code % 28 !== 0 : null;
}

export function defaultAlt(groom: string, bride: string, number: number) {
  if (!groom || !bride) return '웨딩 사진 ' + number;
  const batchim = hasFinalConsonant(groom);
  const couple = batchim === null ? groom + ' & ' + bride : groom + (batchim ? '과 ' : '와 ') + bride;
  return couple + '의 웨딩 사진 ' + number;
}

export function buildGallery<I>(
  entries: { file: string; image: I }[],
  overrides: Record<string, GalleryOverride> = {},
  { groom = '', bride = '', release = false } = {},
): GalleryPhoto<I>[] {
  if (!entries.length) throw new Error('src/assets/gallery 폴더에 사진을 한 장 이상 넣어 주세요.');
  const sorted = [...entries].sort((a, b) => collator.compare(a.file, b.file));
  // Keys match either the full file name or the name without extension, ignoring case.
  const byKey = new Map<string, string>();
  for (const { file } of sorted) {
    const key = stem(file).toLowerCase();
    if (byKey.has(key)) throw new Error('같은 이름의 사진이 두 개 있습니다(확장자만 다름): ' + file);
    byKey.set(key, file);
    byKey.set(file.toLowerCase(), file);
  }
  const resolved = new Map<string, GalleryOverride>();
  const problems: string[] = [];
  for (const [key, override] of Object.entries(overrides)) {
    if ('hidden' in override) throw new Error('사진 숨기기는 지원하지 않습니다. "' + key + '" 사진을 photos-inbox에서 빼고 npm run photos를 다시 실행해 주세요.');
    const position = override.position?.trim();
    if (position && !THUMB_POSITIONS.includes(position)) {
      throw new Error('사진 "' + key + '"의 position은 다음 중 하나여야 합니다: ' + THUMB_POSITIONS.join(', '));
    }
    const file = byKey.get(key.trim().toLowerCase());
    if (file) resolved.set(file, override);
    else problems.push('gallery 설정에 있는 "' + key + '" 사진을 src/assets/gallery에서 찾을 수 없습니다.');
  }
  if (problems.length && release) throw new Error(problems.join('\n'));
  for (const problem of problems) console.warn('[gallery] ' + problem);

  return sorted.map(({ file, image }, index) => {
    const override = resolved.get(file) ?? {};
    return {
      id: stem(file),
      file,
      image,
      index,
      alt: override.alt?.trim() || defaultAlt(groom, bride, index + 1),
      caption: override.caption?.trim() ?? '',
      position: override.position?.trim() || 'attention',
    };
  });
}
