import { test, expect } from '@playwright/test';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname } from 'node:path';
import { execFileSync } from 'node:child_process';

// Build isolated copies: fictional test information never touches the invitation source.
test.describe('real-mode rendering with fictional fixtures', () => {
  test.describe.configure({ mode: 'serial' });
  let root: string;
  const builds: Record<string, string> = {};
  const base = '/__release_fixture__/';
  test.beforeAll(async () => {
    test.setTimeout(90_000);
    root = await mkdtemp(join(tmpdir(), 'wedding-release-test-'));
    for (const mode of ['empty', 'filled']) {
      const dir = join(root, mode);
      await mkdir(dir);
      for (const path of ['src', 'public', 'scripts', 'astro.config.mjs', 'package.json', 'tsconfig.json']) {
        await cp(join(process.cwd(), path), join(dir, path), { recursive: true });
      }
      await symlink(join(process.cwd(), 'node_modules'), join(dir, 'node_modules'), 'dir');
      const file = join(dir, 'src/data/wedding.ts');
      let content = (await readFile(file, 'utf8')).replace('export const wedding = {', 'const demoWedding = {');
      const extra = mode === 'filled'
        ? `
        groom: { ...demoWedding.groom, phone: '010-0000-0000', father: '이테스트', mother: '故 김테스트', relation: '장남' },
        // One side without parents, to cover the name-only line.
        bride: { ...demoWedding.bride, phone: '010-1111-1111', father: '', mother: '' },
        accounts: [
          { side: '신랑', name: '테스트 예금주', bank: '테스트 은행', number: '000-000000-00' },
          { side: '신랑', relation: '아버지', name: '이테스트', bank: '테스트 은행', number: '111-111111-11' },
        ],
        gallery: { '02': { caption: '테스트 사진 설명' } },
      `
        : `
        groom: { ...demoWedding.groom, phone: '', father: '', mother: '' },
        bride: { ...demoWedding.bride, phone: '', father: '', mother: '' },
        accounts: [],
      `;
      const fixture = `
        export const wedding = { ...demoWedding, isDemo: false, ${extra}
          venue: { ...demoWedding.venue, address: '테스트 전용 주소',
            mapLinks: ${mode === 'filled' ? "[{ label: '테스트 지도', url: 'https://map.naver.com/' }]" : '[]'} },
        };
      `;
      content = content.replace('const errors = validateWedding', fixture + '\nconst errors = validateWedding');
      await writeFile(file, content);
      execFileSync(process.execPath, [join(process.cwd(), 'node_modules/astro/bin/astro.mjs'), 'build'], {
        cwd: dir, env: { ...process.env, SITE_URL: 'https://invitation-fixture.github.io', BASE_PATH: base, RELEASE_BUILD: '1' },
        timeout: 60_000, stdio: 'pipe',
      });
      builds[mode] = join(dir, 'dist');
    }
  });
  test.afterAll(async () => { if (root) await rm(root, { recursive: true, force: true }); });

  for (const mode of ['empty', 'filled']) {
    test(mode + ' optional information renders and the gallery still works', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**' + base + '**', async route => {
        const path = new URL(route.request().url()).pathname.slice(base.length) || 'index.html';
        const types: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
        await route.fulfill({ body: await readFile(join(builds[mode], decodeURIComponent(path))), contentType: types[extname(path)] || 'application/octet-stream' });
      });
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (text: string) => { (window as any).__copied = text; } } });
      });
      await page.goto('https://invitation-fixture.github.io' + base);
      await expect(page.locator('.demo-note')).toHaveCount(0);
      if (mode === 'empty') {
        await expect(page.locator('[data-open-contact], #contact-dialog, .accounts')).toHaveCount(0);
        await expect(page.locator('.share-section [data-share]')).toBeVisible();
        // No parents: the greeting ends with the couple's names instead of the family lines.
        await expect(page.locator('.families')).toHaveCount(0);
        await expect(page.locator('.signature')).toHaveText('찬영 & 예지');
      } else {
        await page.locator('.contact-button').click();
        await expect(page.locator('.person-contact')).toHaveCount(2);
        await expect(page.locator('a[href="tel:010-0000-0000"]')).toBeVisible();
        await expect(page.locator('a[href="tel:010-1111-1111"]')).toBeVisible();
        await expect(page.locator('a[href="sms:010-0000-0000"]')).toBeVisible();
        await expect(page.locator('a[href="sms:010-1111-1111"]')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.locator('#contact-dialog')).toBeHidden();
        await expect(page.locator('.map-links a')).toHaveAttribute('href', 'https://map.naver.com/');
        await page.getByRole('button', { name: '주소 복사', exact: true }).click();
        expect(await page.evaluate(() => (window as any).__copied)).toBe('테스트 전용 주소');
        await expect(page.locator('.families')).toContainText('이테스트 · 故 김테스트의 장남 찬영');
        await expect(page.locator('.families')).toContainText('신부 임예지');
        await page.locator('.accounts summary').click();
        await expect(page.locator('.account-owner')).toHaveText(['신랑 테스트 예금주', '아버지 이테스트']);
        await page.getByRole('button', { name: '테스트 예금주 계좌번호 복사' }).click();
        expect(await page.evaluate(() => (window as any).__copied)).toBe('000-000000-00');
      }
      await page.locator('.gallery-thumb').first().click();
      await expect(page.locator('#gallery-dialog')).toBeVisible();
      await expect(page.locator('#gallery-caption')).toBeHidden();
      await page.getByRole('button', { name: '다음 사진', exact: true }).click();
      if (mode === 'filled') await expect(page.locator('#gallery-caption')).toHaveText('테스트 사진 설명');
      expect(errors).toEqual([]);
    });
  }
});
