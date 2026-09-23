import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// Keep in sync with the glob in src/lib/gallery.ts.
const allowed = /\.(jpe?g|png|webp|avif)$/i;

// IFD0 tag 0x8825 points at the GPS block; its presence means the file still carries location data.
export function hasGps(exif) {
  if (!exif || exif.length < 14) return false;
  const start = exif.toString('latin1', 0, 6) === 'Exif\0\0' ? 6 : 0;
  const order = exif.toString('latin1', start, start + 2);
  if (order !== 'II' && order !== 'MM') return false;
  const u16 = (at) => (order === 'II' ? exif.readUInt16LE(at) : exif.readUInt16BE(at));
  const u32 = (at) => (order === 'II' ? exif.readUInt32LE(at) : exif.readUInt32BE(at));
  const ifd = start + u32(start + 4);
  if (ifd + 2 > exif.length) return false;
  for (let i = 0, count = u16(ifd); i < count; i++) {
    const entry = ifd + 2 + i * 12;
    if (entry + 2 > exif.length) break;
    if (u16(entry) === 0x8825) return true;
  }
  return false;
}

async function inspect(path, file) {
  try {
    const { exif, xmp, format, width = 0, height = 0, orientation = 1 } = await sharp(path).metadata();
    const located = hasGps(exif) || /exif:GPS(Latitude|Longitude)/.test(xmp?.toString('utf8') ?? '');
    const [w, h] = orientation >= 5 ? [height, width] : [width, height];
    return { format, located, w, h };
  } catch (error) {
    throw new Error(`${file} 사진을 읽을 수 없습니다(손상되었거나 지원하지 않는 형식): ${error.message}`);
  }
}

// Validates the gallery folder at config time and warns about location data in any committed photo.
export function galleryCheck({ dir = 'src/assets/gallery', gpsOnly = ['src/assets/photos'], warnAbove = 40 } = {}) {
  return {
    name: 'gallery-check',
    hooks: {
      'astro:config:setup': async ({ config, logger }) => {
        const root = fileURLToPath(config.root);
        const folder = join(root, dir);
        let files;
        try {
          files = readdirSync(folder, { withFileTypes: true }).filter((entry) => entry.isFile() && !entry.name.startsWith('.')).map((entry) => entry.name);
        } catch {
          throw new Error(`${dir} 폴더가 없습니다. 사진을 넣을 폴더를 만들어 주세요.`);
        }
        const heic = files.filter((file) => /\.hei[cf]$/i.test(file));
        if (heic.length) throw new Error(`HEIC 사진은 바로 쓸 수 없습니다: ${heic.join(', ')}\nphotos-inbox 폴더에 넣고 npm run photos 를 실행하면 JPG로 바뀝니다.`);
        const unsupported = files.filter((file) => !allowed.test(file));
        if (unsupported.length) throw new Error(`${dir}에는 jpg·png·webp·avif 사진만 넣어 주세요: ${unsupported.join(', ')}`);
        if (!files.length) throw new Error(`${dir} 폴더에 사진을 한 장 이상 넣어 주세요.`);
        if (files.length > warnAbove) logger.warn(`사진이 ${files.length}장입니다. ${warnAbove}장을 넘으면 빌드와 로딩이 느려질 수 있어요.`);

        const located = [];
        const small = [];
        for (const file of files) {
          const { format, located: hasLocation, w, h } = await inspect(join(folder, file), `${dir}/${file}`);
          if (format === 'heif') throw new Error(`${dir}/${file}은 이름만 JPG인 HEIC 사진입니다. photos-inbox 에 넣고 npm run photos 를 실행해 주세요.`);
          if (hasLocation) located.push(`${dir}/${file}`);
          if (w < 480 || h < 640) small.push(file);
        }
        for (const extra of gpsOnly) {
          let names = [];
          try {
            names = readdirSync(join(root, extra), { withFileTypes: true }).filter((entry) => entry.isFile() && allowed.test(entry.name)).map((entry) => entry.name);
          } catch { /* optional folder */ }
          for (const file of names) {
            if ((await inspect(join(root, extra, file), `${extra}/${file}`)).located) located.push(`${extra}/${file}`);
          }
        }
        if (small.length) logger.warn(`작은 사진이 있어 흐리게 보일 수 있어요(가로 480px·세로 640px 미만): ${small.join(', ')}`);
        if (located.length) {
          logger.warn(`위치(GPS) 정보가 남아 있는 사진이 ${located.length}장 있습니다: ${located.join(', ')}`);
          logger.warn('저장소가 공개되어 있으니 npm run photos 로 정리한 사진만 커밋하세요.');
        }
      },
    },
  };
}
