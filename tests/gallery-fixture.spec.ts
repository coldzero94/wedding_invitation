import { test, expect, type Page } from '@playwright/test';
import { copyFile, cp, mkdtemp, readdir, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';
import { execFileSync } from 'node:child_process';

// Builds an isolated copy with 30 photos (unpadded names, one upper-case extension) to exercise the real pipeline.
test.describe('a 30-photo gallery', () => {
  test.describe.configure({ mode: 'serial' });
  let root: string;
  let dist: string;
  const base = '/__gallery_fixture__/';
  const origin = 'https://gallery-fixture.github.io';

  test.beforeAll(async () => {
    test.setTimeout(120_000);
    root = await mkdtemp(join(tmpdir(), 'wedding-gallery-test-'));
    for (const path of ['src', 'public', 'scripts', 'astro.config.mjs', 'package.json', 'tsconfig.json']) {
      await cp(join(process.cwd(), path), join(root, path), { recursive: true });
    }
    await symlink(join(process.cwd(), 'node_modules'), join(root, 'node_modules'), 'dir');
    const folder = join(root, 'src/assets/gallery');
    const samples = (await readdir(folder)).filter((file) => !file.startsWith('.')).sort();
    for (const file of samples) await rm(join(folder, file));
    for (let i = 1; i <= 30; i++) {
      const name = i === 3 ? '3.JPG' : i + '.jpg';
      await copyFile(join(process.cwd(), 'src/assets/gallery', samples[(i - 1) % samples.length]), join(folder, name));
    }
    execFileSync(process.execPath, [join(process.cwd(), 'node_modules/astro/bin/astro.mjs'), 'build'], {
      cwd: root, env: { ...process.env, SITE_URL: origin, BASE_PATH: base }, timeout: 100_000, stdio: 'pipe',
    });
    dist = join(root, 'dist');
  });
  test.afterAll(async () => { if (root) await rm(root, { recursive: true, force: true }); });

  async function serve(page: Page) {
    await page.route('**' + base + '**', async (route) => {
      const path = new URL(route.request().url()).pathname.slice(base.length) || 'index.html';
      const types: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
      try {
        await route.fulfill({ body: await readFile(join(dist, decodeURIComponent(path))), contentType: types[extname(path)] || 'application/octet-stream' });
      } catch {
        await route.fulfill({ status: 404 });
      }
    });
  }

  test('shows nine photos first, reveals the rest on demand, and opens any of the 30', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await serve(page);
    await page.goto(origin + base);
    const thumbs = page.locator('.gallery-thumb');
    await expect(thumbs).toHaveCount(30);
    const ids = await thumbs.evaluateAll((items) => items.map((item) => (item as HTMLElement).dataset.gallery));
    expect(ids.slice(0, 11)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']);
    await expect(page.locator('.gallery-thumb:visible')).toHaveCount(9);
    await expect(page.locator('.gallery-grid > .is-extra')).toHaveCount(21);
    const more = page.getByRole('button', { name: /사진 더보기/ });
    await expect(more).toContainText('+21');
    await expect(more).toHaveAttribute('aria-expanded', 'false');
    await more.click();
    await expect(page.locator('.gallery-thumb:visible')).toHaveCount(30);
    await expect(thumbs.nth(9)).toBeFocused();
    await expect(more).toBeHidden();
    await thumbs.nth(29).click();
    await expect(page.locator('#gallery-counter')).toHaveText('30 / 30');
    await expect(page.locator('#gallery-image')).toHaveAttribute('alt', '찬영과 예지의 웨딩 사진 30');
    await page.getByRole('button', { name: '다음 사진', exact: true }).click();
    await expect(page.locator('#gallery-counter')).toHaveText('01 / 30');
    expect(errors).toEqual([]);
  });

  test('without JavaScript every photo stays reachable as a link', async ({ browser }) => {
    const page = await browser.newPage({ javaScriptEnabled: false });
    await serve(page);
    await page.goto(origin + base);
    await expect(page.locator('.gallery-thumb:visible')).toHaveCount(30);
    await expect(page.locator('[data-gallery-more]')).toBeHidden();
    await expect(page.locator('.gallery-thumb').nth(20)).toHaveAttribute('href', /\.webp$/);
    await page.close();
  });

  test('the build publishes resized photos only, never the originals', async () => {
    const files = await readdir(join(dist, '_astro'));
    // Originals keep Vite's plain hash (name.HASH.jpg); generated images add a transform suffix (name.HASH_xyz.ext).
    const jpegs = files.filter((file) => /\.(jpe?g|png)$/i.test(file));
    expect(jpegs.length).toBeGreaterThan(0);
    for (const file of jpegs) expect(file).toMatch(/_[\w-]+\.jpe?g$/i);
    expect(files.filter((file) => /\.(jpe?g|png|webp|avif)$/i.test(file) && !/_[\w-]+\.\w+$/.test(file))).toEqual([]);
  });
});
