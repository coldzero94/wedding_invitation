import { test, expect } from '@playwright/test';

test('photos and required information work without JavaScript errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  await expect(page).toHaveTitle(/지훈 & 서연/);
  await expect(page.locator('h1')).toContainText('The next');
  await expect(page.locator('.cover-image')).toBeVisible();
  await expect(page.locator('.cover-venue')).toHaveText('가든홀 · 서울');
  await expect(page.locator('.cover-venue')).toHaveAttribute('href', '#wedding-info');
  await expect(page.locator('.event-date')).toContainText('2027년 5월 22일 토요일');
  await expect(page.locator('.event-date')).toContainText('오후 2시');
  await expect(page.locator('video, iframe')).toHaveCount(0);
  await expect(page.locator('.demo-note')).toContainText('가상의 예시');
  expect(errors).toEqual([]);
  const image = page.locator('.cover-image');
  expect(await image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
});

test('full gallery supports arrows, close and focus restoration', async ({ page }) => {
  await page.goto('./');
  const trigger = page.getByRole('button', { name: '사진 전체 보기 · 3장', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: '처음 만난 날' });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#gallery-title')).toHaveText('우리의 여행');
  await page.getByRole('button', { name: '다음 사진', exact: true }).click();
  await expect(page.locator('#gallery-title')).toHaveText('같은 마음');
  await page.getByRole('button', { name: '다음 사진', exact: true }).click();
  await expect(page.locator('#gallery-title')).toHaveText('처음 만난 날');
  await page.keyboard.press('Escape');
  await expect(page.locator('#gallery-dialog')).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test('touch swipe changes photos and vertical gestures do not', async ({ page }) => {
  await page.goto('./');
  await page.locator('.feed-photo').click();
  const area = page.locator('.gallery-image-wrap');
  await area.dispatchEvent('touchstart', { touches: [{ identifier: 1, clientX: 250, clientY: 150 }] });
  await area.dispatchEvent('touchend', { changedTouches: [{ identifier: 1, clientX: 80, clientY: 155 }] });
  await expect(page.locator('#gallery-title')).toHaveText('우리의 여행');
  await area.dispatchEvent('touchstart', { touches: [{ identifier: 2, clientX: 250, clientY: 150 }] });
  await area.dispatchEvent('touchend', { changedTouches: [{ identifier: 2, clientX: 240, clientY: 300 }] });
  await expect(page.locator('#gallery-title')).toHaveText('우리의 여행');
});

test('failed gallery photos can be retried without losing the selected photo', async ({ page }) => {
  await page.goto('./');
  const src = await page.locator('#gallery-data').evaluate(el => JSON.parse((el as HTMLElement).dataset.photos!)[0].src as string);
  const url = new URL(src, page.url()).href;
  await page.route(url, route => route.abort(), { times: 1 });
  await page.locator('.gallery-all-button').click();
  await expect(page.locator('#gallery-load-status')).toContainText('불러오지 못했어요');
  await expect(page.locator('#gallery-image')).toBeHidden();
  await page.getByRole('button', { name: '사진 다시 불러오기' }).click();
  await expect(page.locator('#gallery-image')).toBeVisible();
  await expect(page.locator('#gallery-load-status')).toBeEmpty();
  await expect(page.locator('#gallery-counter')).toHaveText('01 / 03');
});

test('story albums are separate from the full gallery', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#story [data-album]')).toHaveCount(3);
  await expect(page.locator('.highlight')).toHaveCount(3);
  await expect(page.locator('.photo-strip [data-gallery]')).toHaveCount(2);
  await page.locator('.album-feature').click();
  await expect(page.locator('#gallery-label')).toHaveText('이야기 앨범 · 처음 만난 날');
  await expect(page.locator('#gallery-counter')).toHaveText('01 / 01');
  await expect(page.locator('[data-gallery-next]')).toBeHidden();
  await expect(page.locator('#gallery-story')).toContainText('그날의 짧은 인사');
  await page.getByRole('button', { name: '사진 닫기', exact: true }).click();
  await expect(page.locator('#gallery-dialog')).toBeHidden();
  await page.locator('.gallery-all-button').click();
  await expect(page.locator('#gallery-label')).toHaveText('사진 전체');
  await expect(page.locator('#gallery-counter')).toHaveText('01 / 03');
  await expect(page.locator('[data-gallery-next]')).toBeVisible();
});

test('multi-photo albums follow their own order and keep the album story', async ({ page }) => {
  await page.route('**/', async (route) => {
    const response = await route.fetch();
    const html = await response.text();
    const fixture = JSON.stringify([{ id: 'beginning', title: '두 장의 기록', story: '같은 이야기 속 두 순간', photoIds: ['hands', 'garden'] }]).replaceAll('"', '&quot;');
    await route.fulfill({ response, body: html.replace(/data-albums="[^"]*"/, 'data-albums="' + fixture + '"') });
  });
  await page.goto('./');
  await page.locator('.album-feature').click();
  await expect(page.locator('#gallery-title')).toHaveText('두 장의 기록');
  await expect(page.locator('#gallery-counter')).toHaveText('01 / 02');
  await expect(page.locator('#gallery-image')).toHaveAttribute('alt', /손을 맞잡은/);
  await page.getByRole('button', { name: '다음 사진', exact: true }).click();
  await expect(page.locator('#gallery-image')).toHaveAttribute('alt', /이마에 입 맞추는/);
  await expect(page.locator('#gallery-story')).toHaveText('같은 이야기 속 두 순간');
  await page.getByRole('button', { name: '다음 사진', exact: true }).click();
  await expect(page.locator('#gallery-counter')).toHaveText('01 / 02');
});

test('Back closes a dialog, Forward restores its selection, and close consumes its history entry', async ({ page }) => {
  await page.goto('./?previous=1');
  const previous = page.url();
  await page.goto('./#moments');
  await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
  const invitationURL = page.url();
  const trigger = page.locator('.gallery-all-button');
  await trigger.scrollIntoViewIfNeeded();
  const y = await page.evaluate(() => window.scrollY);
  await trigger.click();
  await page.getByRole('button', { name: '다음 사진', exact: true }).click();
  await page.goBack();
  await expect(page.locator('#gallery-dialog')).toBeHidden();
  await expect(page).toHaveURL(invitationURL);
  await expect(trigger).toBeFocused();
  expect(Math.abs(await page.evaluate(() => window.scrollY) - y)).toBeLessThan(5);
  await page.goForward();
  await expect(page.locator('#gallery-dialog')).toBeVisible();
  await expect(page.locator('#gallery-title')).toHaveText('우리의 여행');
  await page.getByRole('button', { name: '사진 닫기', exact: true }).click();
  await expect(page.locator('#gallery-dialog')).toBeHidden();
  await page.locator('.mobile-dock [data-open-contact]').click();
  await expect(page.locator('#contact-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#contact-dialog')).toBeHidden();
  await page.goBack();
  await expect(page).toHaveURL(previous);
});

test('contact and accounts are truthful when actual details are missing', async ({ page }) => {
  await page.goto('./');
  await page.locator('.mobile-dock [data-open-contact]').click();
  await expect(page.getByRole('dialog', { name: '소중한 연락을 기다려요' })).toBeVisible();
  await expect(page.locator('.person-contact')).toHaveCount(2);
  await expect(page.locator('a[href^="tel:"]')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.locator('.accounts summary').click();
  await expect(page.locator('.accounts-content')).toContainText('계좌 정보는 추후 안내');
});

test('sharing falls back to a copyable URL when browser permissions fail', async ({ page, baseURL }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: undefined });
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new Error('denied'); } } });
  });
  await page.goto('./#moments');
  await page.locator('.share-button').click();
  await expect(page.locator('#copy-dialog')).toBeVisible();
  await expect(page.locator('#copy-value')).toHaveValue(baseURL!);
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await expect(page.locator('#copy-dialog')).not.toBeVisible();
});

test('calendar download uses Korea event time and May 22 is Saturday', async ({ page, request }) => {
  await page.goto('./');
  const link = await page.locator('.calendar-link').getAttribute('href');
  const response = await request.get(link!);
  expect(response.ok()).toBe(true);
  const ics = await response.text();
  expect(ics).toContain('DTSTART:20270522T050000Z');
  expect(ics).toContain('DTEND:20270522T063000Z');
  expect(ics).toContain('[샘플]');
  expect(ics).toContain('\r\nEND:VCALENDAR');
  await expect(page.locator('td:nth-child(7) .wedding-day')).toHaveText('22');
});

test('heart is a local toggle and survives reload', async ({ page }) => {
  await page.goto('./');
  await page.locator('.like-button').click();
  await expect(page.locator('.like-button')).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.locator('.like-button')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('.like-button').click();
  await expect(page.locator('.like-button')).toHaveAttribute('aria-pressed', 'false');
});

test('layout reflows at narrow, tablet and desktop widths', async ({ page }) => {
  await page.goto('./');
  for (const width of [320, 360, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow, 'horizontal overflow at ' + width).toBe(false);
    if (width < 1000) await expect(page.locator('.mobile-dock')).toBeVisible();
    else await expect(page.locator('.mobile-dock')).not.toBeVisible();
  }
  const cover = await page.locator('.cover').boundingBox();
  const content = await page.locator('.invitation-content').boundingBox();
  expect(content!.x).toBeGreaterThanOrEqual(cover!.width - 1);
});

test('reduced motion removes the cover animation and basic content needs no JS', async ({ browser }) => {
  const page = await browser.newPage({ reducedMotion: 'reduce', javaScriptEnabled: false });
  const basePath = process.env.BASE_PATH || '/';
  await page.goto('http://localhost:4322' + basePath.replace(/\/$/, '') + '/');
  await expect(page.locator('.cover-image')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.event-date')).toContainText('2027년');
  await expect(page.locator('.calendar-link')).toBeVisible();
  await page.close();
});

test('built images, fonts, script and calendar respect the deployment base path', async ({ page, request }) => {
  await page.goto('./');
  const urls = await page.evaluate(() => {
    const items = [
      ...Array.from(document.querySelectorAll('img')).map((el) => el.src),
      ...Array.from(document.querySelectorAll('link[rel="stylesheet"], link[rel="icon"]')).map((el) => (el as HTMLLinkElement).href),
      ...Array.from(document.querySelectorAll('script[src]')).map((el) => (el as HTMLScriptElement).src),
    ];
    return Array.from(new Set(items)).filter(Boolean);
  });
  const path = (process.env.BASE_PATH || '/').replace(/\/$/, '') + '/';
  for (const url of urls) {
    expect(new URL(url).pathname).toMatch(new RegExp('^' + path));
    expect((await request.get(url)).ok(), url).toBe(true);
  }
  const og = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect((await request.get(new URL(og!).pathname)).ok()).toBe(true);
});

test('enlarged text keeps information available on a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('./');
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll<HTMLElement>('h1,h2,h3,p,a,button,span,th,td,summary'));
    const sizes = items.map((el) => parseFloat(getComputedStyle(el).fontSize));
    items.forEach((el, index) => { el.style.fontSize = sizes[index] * 2 + 'px'; });
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.locator('#wedding-info').scrollIntoViewIfNeeded();
  await expect(page.locator('.event-date')).toContainText('오후 2시');
});
