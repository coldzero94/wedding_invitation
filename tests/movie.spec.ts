import { test, expect, chromium, webkit, devices } from '@playwright/test';

for (const [engine, safeArea] of [
  ['chromium', 'native'], ['chromium', 'changing'],
  ['webkit', 'native'], ['webkit', 'changing'],
] as const) {
  test(`the cover photo and text stay in place while toolbars resize (${engine}, ${safeArea} safe area)`, async ({ baseURL }) => {
    const browser = await (engine === 'webkit' ? webkit : chromium).launch({ channel: engine === 'chromium' ? 'chrome' : undefined });
    try {
      const context = await browser.newContext({
        ...devices[engine === 'webkit' ? 'iPhone 13' : 'Pixel 7'],
        viewport: { width: 390, height: 844 },
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      if (safeArea === 'changing') {
        // Desktop browser engines cannot emulate native toolbar safe-area changes. Substitute
        // controllable values for env() while keeping the production layout and scripts intact.
        await page.route('**/v2/', async (route) => {
          const response = await route.fetch();
          const body = (await response.text())
            .replaceAll('env(safe-area-inset-top)', 'var(--test-safe-top, 47px)')
            .replaceAll('env(safe-area-inset-bottom)', 'var(--test-safe-bottom, 34px)');
          await route.fulfill({ response, body });
        });
      }
      await page.goto(new URL('v2/', baseURL!).href);
      await expect(page.locator('html')).toHaveClass(/cover-ready/);
      const geometry = () => page.locator('.cover').evaluate((cover) => {
        const box = cover.getBoundingClientRect();
        return {
          width: box.width,
          height: box.height,
          photoHeight: cover.querySelector('.cover-image')!.getBoundingClientRect().height,
          doodlesHeight: cover.querySelector('.cover-doodles')!.getBoundingClientRect().height,
          text: [...cover.querySelectorAll('.poster-studio, .poster-title, .poster-credits span, .poster-when, .poster-where, .poster-cta, .poster-billing')].map((element) => {
            const text = element.getBoundingClientRect();
            return { x: text.x - box.x, y: text.y - box.y, width: text.width, height: text.height };
          }),
        };
      });
      const initial = await geometry();
      // KakaoTalk can resize the webview itself when its toolbar hides; even svh then changes.
      // Exercise both directions repeatedly, including a return to the top of the invitation.
      for (const [height, top, insetTop, insetBottom] of [[720, 160, 0, 0], [900, 60, 47, 34], [760, 180, 20, 12], [844, 0, 47, 34]]) {
        await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), top);
        await page.setViewportSize({ width: 390, height });
        if (safeArea === 'changing') {
          await page.evaluate(([top, bottom]) => {
            document.documentElement.style.setProperty('--test-safe-top', `${top}px`);
            document.documentElement.style.setProperty('--test-safe-bottom', `${bottom}px`);
          }, [insetTop, insetBottom]);
        }
        await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
        expect(await geometry()).toEqual(initial);
      }
      // Rotating the phone must still lay the cover out for the new width and height.
      if (safeArea === 'changing') {
        await page.evaluate(() => {
          document.documentElement.style.setProperty('--test-safe-top', '0px');
          document.documentElement.style.setProperty('--test-safe-bottom', '21px');
        });
      }
      await page.setViewportSize({ width: 844, height: 390 });
      await expect.poll(async () => (await geometry()).height).toBe(760);
      if (safeArea === 'changing') {
        expect(await page.locator('.poster-body').evaluate((el) => getComputedStyle(el).paddingBottom)).toBe('41px');
      }
      await page.setViewportSize({ width: 390, height: 720 });
      await expect.poll(async () => (await geometry()).height).toBe(720);
    } finally {
      await browser.close();
    }
  });
}

for (const engine of ['chromium', 'webkit'] as const) {
  test(`the movie ticket fits small phones and flips with touch and keyboard (${engine})`, async ({ baseURL }) => {
    const browser = await (engine === 'webkit' ? webkit : chromium).launch({ channel: engine === 'chromium' ? 'chrome' : undefined });
    try {
      const context = await browser.newContext({ ...devices[engine === 'webkit' ? 'iPhone 13' : 'Pixel 7'], reducedMotion: 'reduce' });
      const page = await context.newPage();
      await page.goto(new URL('v2/', baseURL!).href);
      await page.evaluate(() => document.fonts.ready);
      const ticket = page.locator('[data-ticket]');
      await expect(ticket).toHaveAccessibleDescription(/Our First Page.*2027.*12시 10분.*제니스홀.*초대석/);
      await expect(ticket.locator('.ticket-title')).toHaveText('Our First Page');
      await expect(ticket.locator('.ticket-front')).not.toContainText('The Greatest Love Story');
      const qrUrl = new URL((await ticket.locator('.ticket-qr').getAttribute('data-qr-url'))!);
      expect(qrUrl.pathname).toBe(new URL(baseURL!).pathname + 'v2/');
      await expect(ticket.locator('.ticket-qr svg')).toHaveCount(1);
      await expect(ticket.locator('.barcode rect')).toHaveCount(57);
      for (const width of [320, 360, 390, 430]) {
        await page.setViewportSize({ width, height: 844 });
        await ticket.scrollIntoViewIfNeeded();
        const frontHeight = (await ticket.boundingBox())!.height;
        await ticket.tap();
        await expect(ticket).toHaveAttribute('aria-pressed', 'true');
        await expect(ticket.locator('.ticket-back')).toBeVisible();
        await expect(ticket.locator('.cal-day')).toHaveCount(31);
        await expect(ticket.locator('.cal-day.is-day')).toHaveText('13');
        expect((await ticket.boundingBox())!.height).toBeCloseTo(frontHeight, 1);
        const layout = await ticket.evaluate((button) => ({
          pageFits: document.documentElement.scrollWidth <= innerWidth,
          faces: [...button.querySelectorAll<HTMLElement>('.ticket-face')].map((face) => {
            const main = face.querySelector<HTMLElement>('.ticket-main')!;
            const stub = face.querySelector<HTMLElement>('.ticket-stub')!;
            return {
              columnsFit: main.offsetLeft + main.offsetWidth <= stub.offsetLeft + 1 && stub.offsetLeft + stub.offsetWidth <= face.clientWidth + 1,
              textFits: [...face.querySelectorAll<HTMLElement>('.ticket-main, .ticket-stub, .ticket-row, .ticket-title, .mini-calendar')].every((el) => el.scrollWidth <= el.clientWidth + 1),
              timerFits: [...face.querySelectorAll<HTMLElement>('.countdown-num')].every((el, index, all) => {
                const next = all[index + 1];
                return !next || el.offsetTop !== next.offsetTop || el.offsetLeft + el.offsetWidth < next.offsetLeft;
              }),
            };
          }),
        }));
        expect(layout).toEqual({ pageFits: true, faces: [{ columnsFit: true, textFits: true, timerFits: true }, { columnsFit: true, textFits: true, timerFits: true }] });
        await ticket.tap();
        await expect(ticket).toHaveAttribute('aria-pressed', 'false');
      }
      await expect(page.locator('.ticket-wrap')).not.toHaveClass(/is-peeking/);
      // Re-entering the central viewport nudges either face again; tiny scrolls do not repeat it.
      await page.locator('.ticket-wrap').evaluate((wrap) => {
        const el = wrap as HTMLElement;
        el.dataset.hintCount = '0';
        el.addEventListener('animationstart', (event) => {
          if ((event as AnimationEvent).animationName === 'ticket-peek') el.dataset.hintCount = String(Number(el.dataset.hintCount) + 1);
        });
      });
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await expect(ticket).not.toBeInViewport();
      await ticket.scrollIntoViewIfNeeded();
      await expect(page.locator('.ticket-wrap')).toHaveAttribute('data-hint-count', '1');
      // Exercise the actual WebKit face swap with animation, then revisit the back before flipping again.
      // Tap coordinates directly so the touch happens during the nudge instead of waiting for stability.
      const movingTicket = (await ticket.boundingBox())!;
      await page.touchscreen.tap(movingTicket.x + movingTicket.width / 2, movingTicket.y + movingTicket.height / 2);
      await expect(ticket.locator('.ticket-back')).toBeVisible();
      await expect(ticket.locator('.ticket-front')).toBeHidden();
      await expect(page.locator('.ticket-hint')).toBeVisible();
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await expect(ticket).not.toBeInViewport();
      await ticket.scrollIntoViewIfNeeded();
      await expect(page.locator('.ticket-wrap')).toHaveAttribute('data-hint-count', '2');
      await expect(ticket).toHaveAttribute('aria-pressed', 'true');
      // Small scrolls stay within the entry/exit band and must not keep restarting the hint.
      await page.evaluate(() => window.scrollBy({ top: 10, behavior: 'instant' }));
      await expect(page.locator('.ticket-wrap')).toHaveAttribute('data-hint-count', '2');
      await ticket.focus();
      await page.keyboard.press('Enter');
      await expect(ticket).toHaveAttribute('aria-pressed', 'false');
      await expect(ticket.locator('.ticket-front')).toBeVisible();
      await expect(page.locator('.ticket-hint')).toBeVisible();
    } finally {
      await browser.close();
    }
  });
}

// The movie-theater edition lives beside the original at /v2/ and shares its data and scripts.
test.describe('the movie edition (/v2/)', () => {
  test('renders the poster, strips, ticket, credits and cookie without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('./v2/');
    // The cover's title is the couple's mock-up's: Our First Page in Fraunces Bold Italic, with their doodles.
    await expect(page).toHaveTitle('찬영 & 예지, 결혼합니다');
    await expect(page.locator('h1')).toHaveText('Our First Page');
    expect(await page.locator('.poster-title').evaluate((el) => getComputedStyle(el).fontFamily)).toMatch(/^"?Fraunces/);
    await expect(page.locator('.cover-doodles path')).toHaveCount(5);
    await expect(page.locator('.ticket-title')).toHaveText('Our First Page');
    await expect(page.locator('.cover')).not.toContainText(/welcome|love wins/i);
    await expect(page.locator('.quote')).toContainText('3000만큼 사랑해');
    await expect(page.locator('.film-strip img').first()).toBeAttached();
    await expect(page.locator('.cast')).toContainText('이기만');
    await expect(page.locator('.cast')).toContainText('정해숙');
    await expect(page.locator('.cast')).toContainText('임원섭');
    await expect(page.locator('.cast')).not.toContainText('임OO');
    await expect(page.locator('.gallery-thumb')).toHaveCount(34);
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
    await expect(page.locator('.ticket-front')).toHaveAttribute('aria-hidden', 'true');
    await expect(page.locator('.ticket-back')).toHaveAttribute('aria-hidden', 'false');
    await expect(ticket).toHaveAccessibleName(/SHOWTIME.*2027.*SAVE.*THE DATE/);
    await expect(page.locator('.cal-day.is-day')).toHaveText('13');
    await expect(page.locator('.ticket-back [data-unit="d"]')).not.toHaveText('00');
    await ticket.click();
    await expect(ticket).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(() => face('front')).toBe('visible');
    await expect(page.locator('.ticket-front')).toHaveAttribute('aria-hidden', 'false');
    await expect(page.locator('.ticket-back')).toHaveAttribute('aria-hidden', 'true');
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

  test('the classic page links to this one, but this one, the invitation the couple sends, has no way back', async ({ page, baseURL }) => {
    await page.goto('./');
    const toMovie = page.getByRole('link', { name: '영화관 버전으로 보기' });
    await expect(toMovie).toHaveAttribute('href', new URL(baseURL!).pathname + 'v2/');
    await toMovie.click();
    await expect(page).toHaveURL(/\/v2\/$/);
    await expect(page.locator('.poster-studio')).toBeVisible();
    await expect(page.getByRole('link', { name: '클래식 버전으로 보기' })).toHaveCount(0);
    await expect(page.locator('.footer-links a')).toHaveText(['처음으로']);
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
    // The cover uses the whole main photo (gallery no. 1).
    expect(await page.locator('.cover-image').evaluate((img: HTMLImageElement) => img.currentSrc)).toMatch(/\/01\.[\w-]+\.webp/);
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
    await expect(page.locator('.ticket-row', { hasText: 'SEAT' })).toContainText('초대석');
    await expect(page.locator('.ticket')).not.toContainText('소중한 당신의 자리');
    await expect(page.locator('.transport')).toContainText('5호선 발산역 하차 7번 출구 (도보 3분~5분)');
    await expect(page.locator('.transport .point')).toHaveText('[이대서울병원]');
    await expect(page.locator('.transport')).toContainText('2시간 무료');
  });

  test('the paper invitation: the Our First Page front, a white back in two halves, nothing under 8 pt', async ({ page }) => {
    await page.goto('./v2/print/');
    await expect(page.locator('.front-title')).toHaveText('Our First Page');
    await expect(page.locator('.front-doodles path')).toHaveCount(5);
    // The doodles cover the photo exactly (they are drawn in its pixels).
    const [photo, doodles] = await Promise.all(['.photo', '.front-doodles'].map((sel) => page.locator(sel).boundingBox()));
    expect(doodles).toEqual(photo);
    await expect(page.locator('.ticket-title')).toHaveCount(0);
    await expect(page.locator('.sheet.front')).not.toContainText(/welcome|love wins/i);
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
    await expect(ticket.locator('.ticket-main')).toHaveText('SCAN TO WATCH');
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
