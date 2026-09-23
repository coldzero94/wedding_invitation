// Prepares web-safe photos before anything is committed to the public repo:
// rotates by EXIF, downsizes to 2560px, flattens transparency and strips metadata (GPS).
//   npm run photos                 photos-inbox/ → src/assets/gallery/01.jpg, 02.jpg, …
//   npm run photos -- <folder>     another inbox folder
//   npm run photos -- --hero <file> one cover photo → src/assets/photos/hero.jpg
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const readable = /\.(jpe?g|png|webp|avif|hei[cf])$/i;
const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
const scratch = mkdtempSync(join(tmpdir(), 'wedding-photos-'));

async function prepare(source, output) {
  const file = basename(source);
  let input = source;
  if (/\.hei[cf]$/i.test(file)) {
    input = join(scratch, 'heic-' + Date.now() + '.jpg');
    try {
      execFileSync('sips', ['-s', 'format', 'jpeg', source, '--out', input], { stdio: 'ignore' });
    } catch {
      throw new Error(`${file}: HEIC 사진을 변환하지 못했습니다(macOS에서만 자동 변환). 사진 앱에서 JPEG로 내보낸 뒤 다시 넣어 주세요.`);
    }
  }
  try {
    await sharp(input)
      .rotate()
      .resize({ width: 2560, height: 2560, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 85, mozjpeg: true })
      .toFile(output);
  } catch (error) {
    throw new Error(`${file}: ${error.message}`);
  }
}

async function prepareHero(path) {
  const source = resolve(process.cwd(), path);
  if (!existsSync(source) || !readable.test(source)) throw new Error('표지 사진 파일을 찾을 수 없습니다: ' + path);
  const output = join(scratch, 'hero.jpg');
  await prepare(source, output);
  copyFileSync(output, join(root, 'src/assets/photos/hero.jpg'));
  console.log(`${basename(source)} → src/assets/photos/hero.jpg (${(statSync(output).size / 1024).toFixed(0)}KB, 위치 정보 제거)`);
  console.log('src/data/wedding.ts 의 hero.alt(사진 설명)와 hero.position(표지 자르기 위치)도 새 사진에 맞게 고쳐 주세요.');
}

async function prepareGallery(folder) {
  const inbox = resolve(root, folder);
  let names = [];
  try {
    names = readdirSync(inbox, { withFileTypes: true }).filter((entry) => entry.isFile() && !entry.name.startsWith('.')).map((entry) => entry.name);
  } catch { /* reported below */ }
  const files = names.filter((file) => readable.test(file)).sort(collator.compare);
  const skipped = names.filter((file) => !readable.test(file));
  if (skipped.length) console.warn('사진이 아니어서 건너뛴 파일: ' + skipped.join(', '));
  if (!files.length) {
    throw new Error(`사진이 없습니다. ${inbox} 폴더에 사진(jpg·png·heic 등)을 넣고 다시 실행해 주세요.\n파일 이름 순서(1, 2, … 10)대로 갤러리에 배치됩니다.`);
  }

  const width = Math.max(2, String(files.length).length);
  const prepared = [];
  // Build everything first so a failure halfway leaves the current gallery untouched.
  for (const [index, file] of files.entries()) {
    const name = String(index + 1).padStart(width, '0') + '.jpg';
    const output = join(scratch, name);
    await prepare(join(inbox, file), output);
    prepared.push({ file, name, output });
  }

  const gallery = join(root, 'src/assets/gallery');
  mkdirSync(gallery, { recursive: true });
  const previous = readdirSync(gallery, { withFileTypes: true }).filter((entry) => entry.isFile() && !entry.name.startsWith('.')).map((entry) => entry.name);
  for (const file of previous) rmSync(join(gallery, file));
  let total = 0;
  for (const { file, name, output } of prepared) {
    copyFileSync(output, join(gallery, name));
    total += statSync(output).size;
    console.log(`${file} → src/assets/gallery/${name}`);
  }
  console.log(`\n사진 ${prepared.length}장을 준비했습니다 (${(total / 1024 / 1024).toFixed(1)}MB). 위치(GPS) 정보는 모두 제거했습니다.`);
  if (previous.length) console.log(`기존 갤러리 사진 ${previous.length}장은 새 사진으로 교체했습니다.`);
  let data = '';
  try { data = readFileSync(join(root, 'src/data/wedding.ts'), 'utf8'); } catch { /* checked only when present */ }
  if (data && !/gallery:\s*\{\s*\}/.test(data)) {
    console.warn('\n주의: 사진 번호가 새로 매겨졌습니다. src/data/wedding.ts 의 gallery 설정(설명·자르기 위치)이 원하는 사진을 가리키는지 위 목록과 비교해 확인해 주세요.');
  }
  console.log('npm run dev 로 확인한 뒤 커밋·배포하세요.');
}

try {
  const args = process.argv.slice(2);
  const heroAt = args.indexOf('--hero');
  if (heroAt >= 0) {
    if (!args[heroAt + 1]) throw new Error('사용법: npm run photos -- --hero <사진 파일>');
    await prepareHero(args[heroAt + 1]);
  } else {
    await prepareGallery(args[0] || 'photos-inbox');
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
