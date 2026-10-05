import { test, expect, type Page } from '@playwright/test';

// Each title line is centred on its card's axis and moved only by its own ink nudge (movie.ts): no other offset.
const centring = (page: Page, lines: string, frame: string) => page.locator(lines).evaluateAll((spans, frame) => spans.map((span) => {
  const box = span.getBoundingClientRect(), card = span.closest(frame)!.getBoundingClientRect();
  const offset = (box.left + box.width / 2) - (card.left + card.width / 2);
  return Math.abs(offset - parseFloat((span as HTMLElement).style.left) * parseFloat(getComputedStyle(span).fontSize)) < 0.5;
}), frame);

// The movie-theater edition lives beside the original at /v2/ and shares its data and scripts.
test.describe('the movie edition (/v2/)', () => {
  test('renders the poster, strips, ticket, credits and cookie without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('./v2/');
    await expect(page).toHaveTitle(/^Love wins all \|/);
    await expect(page.locator('.poster-title')).toHaveAttribute('aria-label', 'Love wins all');
    // Two lines in the brush signature script, as on the paper invitation's front; the ticket uses the script too.
    await expect(page.locator('.poster-title .t-line')).toHaveText(['Love', 'wins all']);
    expect(await centring(page, '.poster-title .t-line', '.cover')).toEqual([true, true]);
    for (const sel of ['.poster-title .t-line', '.ticket-title']) {
      expect(await page.locator(sel).first().evaluate((el) => getComputedStyle(el).fontFamily)).toContain('Hurricane');
    }
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

  test('only the parking guide can be pinch-zoomed, on both editions', async ({ page }) => {
    const state = () => page.evaluate(() => [document.querySelector('meta[name=viewport]')!.getAttribute('content'), document.documentElement.style.touchAction]);
    for (const path of ['./', './v2/']) {
      await page.goto(path);
      expect(await state()).toEqual([expect.stringContaining('user-scalable=no'), 'pan-x pan-y']);
      await page.locator('[data-open-parking]').click();
      await expect(page.locator('#parking-dialog')).toBeVisible();
      expect(await state()).toEqual([expect.stringContaining('user-scalable=yes'), '']);
      await page.locator('[data-close-parking]').click();
      await expect(page.locator('#parking-dialog')).toBeHidden();
      expect(await state()).toEqual([expect.stringContaining('user-scalable=no'), 'pan-x pan-y']);
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
    await expect(page.locator('.ticket-title')).toHaveText('Love wins all');
    await expect(page.locator('.ticket-row', { hasText: 'SEAT' })).toContainText('초대석');
    await expect(page.locator('.ticket')).not.toContainText('소중한 당신의 자리');
    await expect(page.locator('.transport')).toContainText('5호선 발산역 하차 7번 출구 (도보 3분~5분)');
    await expect(page.locator('.transport .point')).toHaveText('[이대서울병원]');
    await expect(page.locator('.transport')).toContainText('2시간 무료');
  });

  test('the paper invitation: the script title, a white back in two halves, nothing under 8 pt', async ({ page }) => {
    await page.goto('./v2/print/');
    const title = page.locator('.front-title');
    await expect(title).toHaveAttribute('aria-label', 'Love wins all');
    await expect(title.locator('span')).toHaveText(['Love', 'wins all']);
    expect(await centring(page, '.front-title span', '.sheet')).toEqual([true, true]);
    expect(await title.evaluate((el) => getComputedStyle(el).fontFamily)).toContain('Hurricane');
    const back = page.locator('.sheet.back');
    expect(await back.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(255, 255, 255)');
    // WEDDING INVITATION opens the top half and LOCATION the bottom half (the couple's "반반").
    await expect(back.locator('.section-head')).toHaveText(['WEDDING INVITATION', 'LOCATION']);
    const sheet = (await back.boundingBox())!;
    const location = (await back.locator('.section-head').nth(1).boundingBox())!;
    expect((location.y - sheet.y) / sheet.height).toBeGreaterThan(.45);
    expect((location.y - sheet.y) / sheet.height).toBeLessThan(.58);
    // On paper 이대서울병원 is plain text, no brackets or bold (the couple's call; the mobile edition keeps its gold point).
    await expect(back.locator('dl')).toContainText('만차 시 이대서울병원 주차장 이용');
    await expect(back.locator('dl')).not.toContainText('[');
    await expect(back.locator('dl strong')).toHaveCount(0);
    // The QR code on a movie ticket at the foot of the list, as wide as the list, the code on the stub.
    const ticket = back.locator('.ticket');
    await expect(ticket.locator('.ticket-title')).toHaveText('Love wins all');
    await expect(ticket.locator('.ticket-stub .qr svg')).toHaveCount(1);
    await expect(page.locator('.stub, .barcode, .qr-tile')).toHaveCount(0);
    const list = (await back.locator('dl').boundingBox())!;
    const box = (await ticket.boundingBox())!;
    expect(Math.abs(box.x - list.x)).toBeLessThan(1);
    expect(Math.abs(box.x + box.width - (list.x + list.width))).toBeLessThan(1);
    expect(box.y).toBeGreaterThan(list.y + list.height);
    // Type that is printed small reads poorly: every size on the back and the front's billing is at least 8 pt.
    const smallest = await page.evaluate(() => Math.min(...[...document.querySelectorAll('.sheet.back *, .front-foot *')]
      .filter((el) => [...el.childNodes].some((node) => node.nodeType === 3 && node.textContent!.trim()))
      .map((el) => parseFloat(getComputedStyle(el).fontSize) * .75)));
    expect(smallest).toBeGreaterThanOrEqual(8);
    await expect(back).not.toContainText('Greatest');
  });
});
