import { test, expect } from '@playwright/test';
import { cp, mkdir, mkdtemp, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import { galleryCheck, hasGps } from '../scripts/gallery-check.mjs';

const gps = { IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '37/1 33/1 0/1', GPSLongitudeRef: 'E', GPSLongitude: '126/1 50/1 0/1' } };
const photo = (format: 'jpeg' | 'webp' = 'jpeg', withGps = false) => {
  let image = sharp({ create: { width: 900, height: 1200, channels: 3, background: '#8a9a8a' } });
  if (withGps) image = image.withExif(gps);
  return image.toFormat(format).toBuffer();
};

async function project() {
  const root = await mkdtemp(join(tmpdir(), 'wedding-photo-scripts-'));
  await mkdir(join(root, 'src/assets/gallery'), { recursive: true });
  await mkdir(join(root, 'src/assets/photos'), { recursive: true });
  await mkdir(join(root, 'scripts'));
  await cp(join(process.cwd(), 'scripts/prepare-photos.mjs'), join(root, 'scripts/prepare-photos.mjs'));
  await symlink(join(process.cwd(), 'node_modules'), join(root, 'node_modules'), 'dir');
  return root;
}

async function runCheck(root: string) {
  const warnings: string[] = [];
  const logger = { warn: (message: string) => warnings.push(message) };
  const hook = galleryCheck().hooks['astro:config:setup'] as (options: object) => Promise<void>;
  await hook({ config: { root: pathToFileURL(root + '/') }, logger });
  return warnings;
}

test('location data is detected in little- and big-endian EXIF, and not in clean photos', async () => {
  expect(hasGps((await sharp(await photo('jpeg', true)).metadata()).exif)).toBe(true);
  expect(hasGps((await sharp(await photo('webp', true)).metadata()).exif)).toBe(true);
  expect(hasGps((await sharp(await photo()).metadata()).exif)).toBe(false);
  const bigEndian = Buffer.alloc(32);
  bigEndian.write('Exif\0\0MM', 0, 'latin1');
  bigEndian.writeUInt16BE(42, 8);
  bigEndian.writeUInt32BE(8, 10);
  bigEndian.writeUInt16BE(1, 14);
  bigEndian.writeUInt16BE(0x8825, 16);
  expect(hasGps(bigEndian)).toBe(true);
});

test('the build check rejects unusable gallery files and warns about location data in any photo folder', async () => {
  const root = await project();
  try {
    const gallery = join(root, 'src/assets/gallery');
    await expect(runCheck(root)).rejects.toThrow('한 장 이상');
    await writeFile(join(gallery, '01.heic'), 'x');
    await expect(runCheck(root)).rejects.toThrow('HEIC');
    await rm(join(gallery, '01.heic'));
    await writeFile(join(gallery, 'notes.txt'), 'x');
    await expect(runCheck(root)).rejects.toThrow('jpg·png');
    await rm(join(gallery, 'notes.txt'));
    await writeFile(join(gallery, '01 #1.jpg'), await photo('jpeg', true));
    await writeFile(join(root, 'src/assets/photos/hero.jpg'), await photo('jpeg', true));
    const warnings = await runCheck(root);
    expect(warnings.join('\n')).toContain('src/assets/gallery/01 #1.jpg');
    expect(warnings.join('\n')).toContain('src/assets/photos/hero.jpg');
    await writeFile(join(gallery, '02.jpg'), 'not an image');
    await expect(runCheck(root)).rejects.toThrow('02.jpg');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('npm run photos orders, cleans and replaces the gallery, and leaves it intact on failure', async () => {
  const root = await project();
  try {
    const gallery = join(root, 'src/assets/gallery');
    const inbox = join(root, 'inbox');
    await mkdir(inbox);
    await mkdir(join(gallery, 'keep'));
    await writeFile(join(gallery, '01.jpg'), await photo());
    await writeFile(join(gallery, '09.jpg'), await photo());
    await writeFile(join(inbox, '10.jpg'), await photo('jpeg', true));
    await writeFile(join(inbox, '2.png'), await sharp({ create: { width: 700, height: 900, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer());
    await writeFile(join(inbox, 'notes.txt'), 'memo');

    const run = spawnSync(process.execPath, ['scripts/prepare-photos.mjs', 'inbox'], { cwd: root, encoding: 'utf8' });
    expect(run.status, run.stderr).toBe(0);
    expect(run.stderr).toContain('notes.txt');
    expect((await readdir(gallery)).sort()).toEqual(['01.jpg', '02.jpg', 'keep']);
    for (const name of ['01.jpg', '02.jpg']) expect((await sharp(join(gallery, name)).metadata()).exif).toBeUndefined();
    const { data } = await sharp(join(gallery, '01.jpg')).raw().toBuffer({ resolveWithObject: true });
    expect([data[0], data[1], data[2]].every((value) => value > 240)).toBe(true);

    await writeFile(join(inbox, '3.jpg'), 'broken');
    const failed = spawnSync(process.execPath, ['scripts/prepare-photos.mjs', 'inbox'], { cwd: root, encoding: 'utf8' });
    expect(failed.status).toBe(1);
    expect(failed.stderr).toContain('3.jpg');
    expect((await readdir(gallery)).sort()).toEqual(['01.jpg', '02.jpg', 'keep']);

    const hero = spawnSync(process.execPath, ['scripts/prepare-photos.mjs', '--hero', 'inbox/10.jpg'], { cwd: root, encoding: 'utf8' });
    expect(hero.status, hero.stderr).toBe(0);
    expect((await sharp(join(root, 'src/assets/photos/hero.jpg')).metadata()).exif).toBeUndefined();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
