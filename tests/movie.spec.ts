import { test, expect } from '@playwright/test';

// The movie-theater edition lives beside the original at /v2/ and shares its data and scripts.
test.describe('the movie edition (/v2/)', () => {
  test('renders the poster, strips, ticket, credits and cookie without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('./v2/');
    await expect(page).toHaveTitle(/Love wins all, Happy Ever After/);
    await expect(page.locator('.poster-title')).toHaveAttribute('aria-label', 'Love wins all, Happy Ever After');
    await expect(page.locator('.poster-title .t-main')).toHaveText('Love wins all');
    await expect(page.locator('.poster-title .t-sub')).toHaveText('Happy Ever After');
    await expect(page.locator('.quote')).toContainText('3000만큼 사랑해');
    await expect(page.locator('.film-strip img').first()).toBeAttached();
    await expect(page.locator('.cast')).toContainText('이기만');
    await expect(page.locator('.cast')).toContainText('정해숙');
    await expect(page.locator('.cast')).toContainText('임원섭');
    await expect(page.locator('.cast')).not.toContainText('임OO');
    await expect(page.locator('.gallery-thumb')).toHaveCount(32);
    await expect(page.locator('.account-row')).toHaveCount(6);
    await expect(page.locator('.account-row', { hasText: '임원섭' })).toContainText('신한 606-12-087230');
    await expect(page.locator('.account-row', { hasText: '정해숙' })).toContainText('국민 263101-04-065980');
    await expect(page.locator('.account-row', { hasText: '최효안' })).toContainText('국민 830-24-0107-431');
    expect(errors).toEqual([]);
  });

  test('the ticket flips to the showtime and back', async ({ page }) => {
    await page.goto('./v2/');
    const ticket = page.locator('[data-ticket]');
    const face = (side: string) => page.locator('.ticket-' + side).evaluate((el) => getComputedStyle(el).visibility);
    await ticket.scrollIntoViewIfNeeded();
    expect(await face('front')).toBe('visible');
    await ticket.click();
    await expect(ticket).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => face('back')).toBe('visible');
    await expect.poll(() => face('front')).toBe('hidden');
    await expect(page.locator('.ticket-back [data-unit="d"]')).not.toHaveText('00');
    await ticket.click();
    await expect(ticket).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(() => face('front')).toBe('visible');
  });

  test('shared features work here too: gallery, share sheet and the original page untouched', async ({ page }) => {
    await page.goto('./v2/');
    await page.locator('.gallery-thumb').first().click();
    await expect(page.getByRole('dialog', { name: '사진 크게 보기' })).toBeVisible();
    await page.goBack();
    await expect(page.locator('#gallery-dialog')).toBeHidden();
    await page.locator('.share-button').click();
    await expect(page.locator('#copy-dialog, #share-sheet').first()).toBeAttached();
    await page.goto('./');
    await expect(page.locator('.poster-title, .leader')).toHaveCount(0);
    await expect(page.locator('h1')).toContainText('The next');
  });

  test('each edition links to the other', async ({ page, baseURL }) => {
    await page.goto('./');
    const toMovie = page.getByRole('link', { name: '영화관 버전으로 보기' });
    await expect(toMovie).toHaveAttribute('href', new URL(baseURL!).pathname + 'v2/');
    await toMovie.click();
    await expect(page).toHaveURL(/\/v2\/$/);
    await expect(page.locator('.poster-title')).toBeVisible();
    await page.getByRole('link', { name: '클래식 버전으로 보기' }).click();
    await expect(page).toHaveURL(baseURL!);
    await expect(page.locator('h1')).toContainText('The next');
  });

  test('the film leader plays when arriving but not on a reload', async ({ page }) => {
    await page.goto('./v2/');
    await expect(page.locator('html')).not.toHaveClass(/no-leader/);
    await expect(page.locator('.leader')).toBeVisible();
    await expect(page.locator('html')).toHaveClass(/cover-ready/, { timeout: 5000 });
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/no-leader/);
    await expect(page.locator('.leader')).toBeHidden();
    await expect(page.locator('html')).toHaveClass(/cover-ready/, { timeout: 2000 });
  });

  test('account numbers are shown with hyphens but copied as digits only, on both editions', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (text: string) => { (window as any).__copied = text; } } });
    });
    for (const path of ['./', './v2/']) {
      await page.goto(path);
      const row = page.locator('.account-row', { hasText: '최효안' });
      await page.locator('.accounts summary', { hasText: '신랑측' }).click();
      await expect(row).toContainText('830-24-0107-431');
      await row.locator('.copy-chip').click();
      await expect.poll(() => page.evaluate(() => (window as any).__copied)).toBe('830240107431');
    }
  });

  test("the couple's revisions: cover photo, film crops, hearts, ticket title and seat, transport", async ({ page }) => {
    await page.goto('./v2/');
    // The cover uses the whole main photo (gallery no. 1) so the couple sits below the title at the top.
    expect(await page.locator('.cover-image').evaluate((img: HTMLImageElement) => img.currentSrc)).toMatch(/\/01\.[\w-]+\.webp/);
    const title = await page.locator('.poster-title').boundingBox();
    const body = await page.locator('.poster-body').boundingBox();
    expect(title!.y).toBeLessThan(body!.y);
    // Every film frame is cropped at its own vertical position (the heads stay in).
    const positions = await page.locator('.film-strip img').evaluateAll((imgs) => imgs.map((img) => (img as HTMLImageElement).style.objectPosition));
    expect(positions).toHaveLength(24);
    expect(positions.every((pos) => /^50% \d+%$/.test(pos))).toBe(true);
    // A gold heart between the names, no ampersand.
    for (const sel of ['.greeting-sign', '.mp-names']) {
      await expect(page.locator(sel + ' svg.heart')).toHaveCount(1);
      await expect(page.locator(sel)).not.toContainText('&');
      // The heart is decorative; a hidden word keeps the names apart for screen readers and copied text.
      await expect(page.locator(sel + ' .visually-hidden')).toHaveText(sel === '.greeting-sign' ? ' 그리고 ' : ' and ', { useInnerText: false });
    }
    await expect(page.locator('.ticket-title')).toContainText('Love wins all');
    await expect(page.locator('.ticket-title')).toContainText('Happy Ever After');
    await expect(page.locator('.ticket-row', { hasText: 'SEAT' })).toContainText('초대석');
    await expect(page.locator('.ticket')).not.toContainText('소중한 당신의 자리');
    await expect(page.locator('.transport')).toContainText('5호선 발산역 하차 7번 출구 (도보 3분~5분)');
    await expect(page.locator('.transport .point')).toHaveText('[이대서울병원]');
    await expect(page.locator('.transport')).toContainText('2시간 무료');
  });

  test('the paper invitation has the new title, and a ticket stub with the QR code beside the location', async ({ page }) => {
    await page.goto('./v2/print/');
    await expect(page.locator('.front-title')).toHaveAttribute('aria-label', 'Love wins all, Happy Ever After');
    await expect(page.locator('.front-title .t-main')).toHaveText('Love wins all');
    const location = page.locator('.sheet.back .location');
    await expect(location.locator('.location-head')).toHaveText('LOCATION');
    await expect(location.locator('dl')).toContainText('이대서울병원');
    await expect(location.locator('.stub .qr svg')).toHaveCount(1);
    await expect(location.locator('.stub')).toContainText('영화 보러 가기');
    await expect(page.locator('.ticket, .barcode, .qr-tile')).toHaveCount(0);
    // The code sits beside the location list, not in a row of its own.
    const list = await location.locator('dl').boundingBox();
    const code = await location.locator('.qr').boundingBox();
    expect(code!.x).toBeGreaterThan(list!.x + list!.width);
    expect(code!.y).toBeLessThan(list!.y + list!.height);
    expect(code!.y + code!.height).toBeGreaterThan(list!.y);
    await expect(page.locator('.sheet.back')).not.toContainText('Greatest');
  });
});
