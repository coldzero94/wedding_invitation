import { test, expect, webkit, devices, type Page } from '@playwright/test';

const counter = (page: Page) => page.locator('#gallery-counter');
const firstThumb = (page: Page) => page.locator('.gallery-thumb').first();

test('photos and required information work without JavaScript errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  await expect(page).toHaveTitle(/찬영 & 예지/);
  await expect(page.locator('h1')).toContainText('The next');
  await expect(page.locator('.cover-image')).toBeVisible();
  await expect(page.locator('.cover-venue')).toHaveText('발산 더뉴컨벤션 · 5층 제니스홀');
  await expect(page.locator('.save-date-venue')).toHaveText('발산 더뉴컨벤션 5층 제니스홀');
  await expect(page.locator('.venue-hall')).toHaveText('5층 제니스홀');
  await expect(page.locator('.cover-venue')).toHaveAttribute('href', '#location');
  await expect(page.locator('.cover-button')).toHaveAttribute('href', '#invitation');
  await expect(page.locator('.save-date-when')).toContainText('2027년 3월 13일 토요일');
  await expect(page.locator('.save-date-when')).toContainText('오후 12시 10분');
  await expect(page.locator('.cover-date')).toContainText('오후 12시 10분');
  await expect(page.locator('#story, .album-feature, .feed-post, .like-button')).toHaveCount(0);
  await expect(page.locator('video, iframe')).toHaveCount(0);
  await expect(page.locator('.demo-note')).toHaveCount(0);
  // Parents from wedding.ts, shared with the movie edition's credits.
  await expect(page.locator('.families')).toContainText('이기만 · 최효안의 아들 찬영');
  await expect(page.locator('.families')).toContainText('임원섭 · 정해숙의 딸 예지');
  expect(errors).toEqual([]);
  const image = page.locator('.cover-image');
  expect(await image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
});

test('the invitation starts with SAVE THE DATE on ivory, followed by the gallery', async ({ page }) => {
  await page.goto('./');
  const sections = await page.locator('main > section').evaluateAll((items) => items.map((item) => item.id));
  expect(sections.slice(0, 3)).toEqual(['invitation', 'gallery', 'location']);
  await expect(page.locator('#invitation .ruled-label')).toHaveText('SAVE THE DATE');
  const background = await page.locator('#invitation').evaluate((el) => getComputedStyle(el).backgroundColor);
  const lower = await page.locator('#location').evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(background).toBe(lower);
  expect(background).toBe('rgb(243, 241, 233)');
});

test('full gallery supports arrows, close and focus restoration', async ({ page }) => {
  await page.goto('./');
  const total = await page.locator('.gallery-thumb').count();
  const trigger = firstThumb(page);
  await trigger.click();
  await expect(page.getByRole('dialog', { name: '사진 크게 보기' })).toBeVisible();
  await expect(counter(page)).toHaveText('01 / ' + String(total).padStart(2, '0'));
  await page.keyboard.press('ArrowRight');
  await expect(counter(page)).toHaveText('02 / ' + String(total).padStart(2, '0'));
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(counter(page)).toHaveText(String(total).padStart(2, '0') + ' / ' + String(total).padStart(2, '0'));
  await expect(page.locator('#gallery-image')).toHaveAttribute('alt', /찬영과 예지의 웨딩 사진/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#gallery-dialog')).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test('touch swipe changes photos and vertical gestures do not', async ({ page }) => {
  await page.goto('./');
  await firstThumb(page).click();
  await expect(counter(page)).toHaveText(/^01 \//);
  const area = page.locator('.gallery-image-wrap');
  await area.dispatchEvent('touchstart', { touches: [{ identifier: 1, clientX: 250, clientY: 150 }] });
  await area.dispatchEvent('touchend', { changedTouches: [{ identifier: 1, clientX: 80, clientY: 155 }] });
  await expect(counter(page)).toHaveText(/^02 \//);
  await area.dispatchEvent('touchstart', { touches: [{ identifier: 2, clientX: 250, clientY: 150 }] });
  await area.dispatchEvent('touchend', { changedTouches: [{ identifier: 2, clientX: 240, clientY: 300 }] });
  await expect(counter(page)).toHaveText(/^02 \//);
});

test('failed gallery photos can be retried without losing the selected photo', async ({ page }) => {
  await page.goto('./');
  const urls = await page.locator('#gallery-data').evaluate((el) => {
    const photo = JSON.parse((el as HTMLElement).dataset.photos!)[0];
    const candidates = [photo.src, ...photo.srcset.split(',').map((item: string) => item.trim().split(' ')[0])];
    return candidates.map((url: string) => new URL(url, location.href).href);
  });
  // The full photo is also prefetched on tap, so keep it failing until the error is on screen.
  let offline = true;
  await page.route((url) => urls.includes(url.href), (route) => offline ? route.abort() : route.continue());
  await firstThumb(page).click();
  await expect(page.locator('#gallery-load-status')).toContainText('불러오지 못했어요');
  await expect(page.locator('#gallery-image')).toBeHidden();
  offline = false;
  await page.getByRole('button', { name: '사진 다시 불러오기' }).click();
  await expect(page.locator('#gallery-image')).toBeVisible();
  await expect(page.locator('#gallery-load-status')).toBeEmpty();
  await expect(counter(page)).toHaveText(/^01 \//);
});

test('thumbnails are links to the full photo and the next photo is preloaded', async ({ page }) => {
  await page.goto('./');
  const photos = await page.locator('#gallery-data').evaluate((el) => JSON.parse((el as HTMLElement).dataset.photos!));
  await expect(firstThumb(page)).toHaveAttribute('href', photos[0].src);
  expect(photos[0].src).toMatch(/\.webp$/);
  const requested: string[] = [];
  page.on('request', (request) => requested.push(new URL(request.url()).pathname));
  await firstThumb(page).click();
  await expect(counter(page)).toHaveText(/^01 \//);
  const next = photos[1].srcset.split(',').map((item: string) => new URL(item.trim().split(' ')[0], page.url()).pathname);
  await expect.poll(() => requested.some((path) => next.includes(path))).toBe(true);
});

test('Back closes a dialog, Forward restores its selection, and close consumes its history entry', async ({ page }) => {
  await page.goto('./?previous=1');
  const previous = page.url();
  await page.goto('./#gallery');
  await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
  const invitationURL = page.url();
  const trigger = firstThumb(page);
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
  await expect(counter(page)).toHaveText(/^02 \//);
  await page.getByRole('button', { name: '사진 닫기', exact: true }).click();
  await expect(page.locator('#gallery-dialog')).toBeHidden();
  await page.goBack();
  await expect(page).toHaveURL(previous);
});

test('contact is hidden without phone numbers, and accounts are grouped by side', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('[data-open-contact], #contact-dialog')).toHaveCount(0);
  await expect(page.locator('.share-section [data-share]')).toBeVisible();
  await expect(page.locator('.mobile-dock')).toHaveCount(0);
  await expect(page.locator('.accounts')).toHaveCount(2);
  await page.locator('.accounts summary', { hasText: '신랑측' }).click();
  await expect(page.locator('.account-row', { hasText: '이찬영' })).toContainText('신한 110-235-729687');
  await expect(page.locator('.account-row', { hasText: '이기만' })).toContainText('아버지 이기만신한 110-004-601620');
  await expect(page.locator('.account-row', { hasText: '최효안' })).toContainText('어머니 최효안국민 830-24-0107-431');
  await page.locator('.accounts summary', { hasText: '신부측' }).click();
  await expect(page.locator('.account-row', { hasText: '임예지' })).toContainText('국민 373301-01-415845');
});

test('sharing falls back to a copyable URL when browser permissions fail', async ({ page, baseURL }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: undefined });
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new Error('denied'); } } });
  });
  await page.goto('./#location');
  await page.locator('.share-button').click();
  await expect(page.locator('#copy-dialog')).toBeVisible();
  await expect(page.locator('#copy-value')).toHaveValue(baseURL!);
  await page.getByRole('button', { name: '닫기', exact: true }).click();
  await expect(page.locator('#copy-dialog')).not.toBeVisible();
});

test('calendar download uses Korea event time and March 13 is Saturday', async ({ page, request }) => {
  await page.goto('./');
  const link = await page.locator('.calendar-link').getAttribute('href');
  const response = await request.get(link!);
  expect(response.ok()).toBe(true);
  const ics = await response.text();
  expect(ics).toContain('DTSTART:20270313T031000Z');
  expect(ics).toContain('DTEND:20270313T044000Z');
  expect(ics).toContain('SUMMARY:찬영 & 예지 결혼식');
  expect(ics).not.toContain('[샘플]');
  expect(ics).toContain('\r\nEND:VCALENDAR');
  await expect(page.locator('td:nth-child(7) .wedding-day')).toHaveText('13일 결혼식');
});

test('the countdown ticks down to the ceremony in Korea time and changes on the day', async ({ page }) => {
  const label = page.locator('.countdown-label');
  const unit = (name: string) => page.locator(`[data-unit="${name}"]`);
  await page.clock.install({ time: new Date('2027-03-11T23:29:00+09:00') });
  await page.clock.pauseAt(new Date('2027-03-11T23:30:00+09:00'));
  await page.goto('./');
  await expect(label).toHaveText('결혼식까지 남은 시간');
  await expect(unit('d')).toHaveText('1');
  await expect(unit('h')).toHaveText('12');
  await expect(unit('m')).toHaveText('40');
  await expect(unit('s')).toHaveText('00');
  await page.clock.runFor(1100);
  await expect(unit('s')).toHaveText('59');
  await expect(unit('m')).toHaveText('39');
  await page.clock.setFixedTime(new Date('2027-03-13T09:00:00+09:00'));
  await page.reload();
  await expect(label).toHaveText('오늘, 저희 결혼합니다');
  await expect(unit('h')).toHaveText('03');
  await page.clock.setFixedTime(new Date('2027-03-13T13:00:00+09:00'));
  await page.reload();
  await expect(label).toHaveText('오늘, 저희 결혼합니다');
  await expect(page.locator('.countdown-clock')).toBeHidden();
  await page.clock.setFixedTime(new Date('2027-03-14T09:00:00+09:00'));
  await page.reload();
  await expect(label).toHaveText('함께해 주셔서 감사합니다');
});

test('the share image frames the couple and its declared size matches the file', async ({ page, request }) => {
  await page.goto('./');
  const url = await page.locator('meta[property="og:image"]').getAttribute('content');
  const width = Number(await page.locator('meta[property="og:image:width"]').getAttribute('content'));
  const height = Number(await page.locator('meta[property="og:image:height"]').getAttribute('content'));
  const response = await request.get(new URL(url!).pathname);
  expect(response.ok()).toBe(true);
  const { default: sharp } = await import('sharp');
  const meta = await sharp(await response.body()).metadata();
  expect([meta.width, meta.height]).toEqual([width, height]);
  expect(Math.abs(width / height - 1200 / 630)).toBeLessThan(0.01);
});

test('layout reflows at narrow, tablet and desktop widths', async ({ page }) => {
  await page.goto('./');
  for (const width of [320, 360, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow, 'horizontal overflow at ' + width).toBe(false);
  }
  const cover = await page.locator('.cover').boundingBox();
  const content = await page.locator('.invitation-content').boundingBox();
  expect(content!.x).toBeGreaterThanOrEqual(cover!.width - 1);
  await expect(page.locator('.section-nav')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.section-nav')).toBeHidden();
});

test('reduced motion removes the cover animation and basic content needs no JS', async ({ browser }) => {
  const page = await browser.newPage({ reducedMotion: 'reduce', javaScriptEnabled: false });
  const basePath = process.env.BASE_PATH || '/';
  await page.goto('http://localhost:4322' + basePath.replace(/\/$/, '') + '/');
  await expect(page.locator('.cover-image')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.save-date-when')).toContainText('2027년');
  await expect(page.locator('.calendar-link')).toBeVisible();
  await expect(page.locator('.gallery-thumb').first()).toBeVisible();
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
    const items = Array.from(document.querySelectorAll<HTMLElement>('h1,h2,h3,p,a,button,span,th,td,summary,dt,dd'));
    const sizes = items.map((el) => parseFloat(getComputedStyle(el).fontSize));
    items.forEach((el, index) => { el.style.fontSize = sizes[index] * 2 + 'px'; });
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.locator('#invitation').scrollIntoViewIfNeeded();
  await expect(page.locator('.save-date-when')).toContainText('오후 12시 10분');
});

test('the parking guide opens full screen with both images and closes with Back', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('.transport')).toContainText('이대서울병원 주차장');
  await page.getByRole('link', { name: '주차 안내 보기' }).click();
  const dialog = page.getByRole('dialog', { name: '주차 안내' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('img')).toHaveCount(2);
  await expect(dialog.locator('img').first()).toHaveAttribute('alt', /이대서울병원/);
  await page.goBack();
  await expect(dialog).toBeHidden();
});

test('처음으로 returns to the very top even beside the sticky desktop cover', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./');
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
  await page.locator('.back-top').click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});

test('shared links open on the cover: in-page buttons keep the address clean and #invitation is dropped', async ({ page }) => {
  await page.goto('./');
  const clean = page.url();
  await page.locator('.cover-button').click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(200);
  expect(page.url()).toBe(clean);
  // A fresh load (not a same-page hash change), as when the link is opened from a chat.
  await page.goto('about:blank');
  await page.goto(clean + '#invitation');
  await expect.poll(() => page.url()).toBe(clean);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.goto('about:blank');
  await page.goto(clean + '#location');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(200);
});

test('처음으로 also works in iPhone WebKit (Safari, KakaoTalk)', async ({ baseURL }) => {
  // The config pins the Chrome channel for Chromium; WebKit ignores channels, so pass none.
  const browser = await webkit.launch({ channel: undefined });
  const page = await (await browser.newContext({ ...devices['iPhone 13'] })).newPage();
  await page.goto(baseURL!);
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
  await page.locator('.back-top').tap();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await browser.close();
});

test('one share button opens a sheet: other apps share the clean link, 링크 복사 copies it, Back closes it', async ({ page, baseURL }) => {
  await page.addInitScript(() => {
    (window as any).__shared = [];
    Object.defineProperty(navigator, 'share', { value: async (data: unknown) => { (window as any).__shared.push(data); } });
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (text: string) => { (window as any).__copied = text; } } });
  });
  await page.goto('./');
  await expect(page.locator('.share-section button')).toHaveCount(1);
  const sheet = page.getByRole('dialog', { name: '청첩장 공유하기' });
  await page.locator('.share-button').click();
  await expect(sheet).toBeVisible();
  // No Kakao key in test builds, so only the two link options are offered.
  await expect(sheet.locator('[data-share-kakao]')).toBeHidden();
  await sheet.getByRole('button', { name: '다른 앱으로 공유' }).click();
  await expect(sheet).toBeHidden();
  expect(await page.evaluate(() => (window as any).__shared[0].url)).toBe(baseURL);
  await page.locator('.share-button').click();
  await sheet.getByRole('button', { name: '링크 복사' }).click();
  await expect(sheet).toBeHidden();
  await expect(page.locator('.toast')).toHaveText('청첩장 링크를 복사했습니다.');
  expect(await page.evaluate(() => (window as any).__copied)).toBe(baseURL);
  await page.locator('.share-button').click();
  await expect(sheet).toBeVisible();
  await page.goBack();
  await expect(sheet).toBeHidden();
});
