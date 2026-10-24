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
      await expect(ticket).toHaveAccessibleDescription(/Our First Page.*2027.*12시 10분.*제니스홀.*모바일 상영관/);
      await expect(ticket.locator('.ticket-title')).toHaveText('Our First Page');
      await expect(ticket.locator('.ticket-front')).not.toContainText('The Greatest Love Story');
      await expect(ticket.locator('.ticket-qr svg')).toHaveCount(1);
      await expect(ticket.locator('.ticket-monogram')).toHaveCount(0);
      await expect(ticket.locator('.ticket-theater')).toHaveText('MOBILE THEATER');
      await expect(ticket.locator('.ticket-scan-cue')).toContainText('SCAN TO WATCH');
      await expect(ticket.locator('.barcode rect')).toHaveCount(57);
      for (const width of [320, 360, 390, 430]) {
        await page.setViewportSize({ width, height: 844 });
        await ticket.scrollIntoViewIfNeeded();
        // The upright ticket stays compact on phones; neither face may stretch the paper.
        const paperRatio = await ticket.locator('.ticket-inner').evaluate((el) => el.clientWidth / el.clientHeight);
        expect(paperRatio).toBeGreaterThan(.70);
        expect(paperRatio).toBeLessThan(.73);
        expect(await ticket.locator(".ticket-inner").evaluate((el) => el.clientHeight)).toBeLessThanOrEqual(420);
        const fieldRows = await ticket.locator('.ticket-front .ticket-rows .ticket-row').evaluateAll((fields) => fields.map((field) => (field as HTMLElement).offsetTop));
        expect(new Set(fieldRows).size).toBe(1);
        const frontHeight = (await ticket.boundingBox())!.height;
        await ticket.tap();
        await expect(ticket).toHaveAttribute('aria-pressed', 'true');
        await expect(ticket.locator('.ticket-back')).toBeVisible();
        await expect(ticket.locator('.cal-day')).toHaveCount(31);
        await expect(ticket.locator('.cal-day.is-day')).toHaveText('13');
        await expect(ticket).not.toHaveClass(/is-back-arriving/);
        expect(await ticket.locator('.cal-day-ring ellipse').evaluate((el) => parseFloat(getComputedStyle(el).strokeDashoffset))).toBe(0);
        expect((await ticket.boundingBox())!.height).toBeCloseTo(frontHeight, 1);
        const layout = await ticket.evaluate((button) => ({
          pageFits: document.documentElement.scrollWidth <= innerWidth,
          faces: [...button.querySelectorAll<HTMLElement>('.ticket-face')].map((face) => {
            const main = face.querySelector<HTMLElement>('.ticket-main')!;
            const stub = face.querySelector<HTMLElement>('.ticket-stub')!;
            return {
              rowsFit: main.offsetTop + main.offsetHeight <= stub.offsetTop + 1 && stub.offsetTop + stub.offsetHeight <= face.clientHeight + 1,
              textFits: [...face.querySelectorAll<HTMLElement>('.ticket-main, .ticket-stub, .ticket-row, .ticket-title, .mini-calendar')].every((el) => el.scrollWidth <= el.clientWidth + 1 && el.scrollHeight <= el.clientHeight + 1),
              timerFits: [...face.querySelectorAll<HTMLElement>('.countdown-unit')].every((el, index, all) => {
                const next = all[index + 1];
                return !next || el.offsetTop !== next.offsetTop || el.offsetLeft + el.offsetWidth < next.offsetLeft;
              }),
            };
          }),
        }));
        expect(layout).toEqual({ pageFits: true, faces: [{ rowsFit: true, textFits: true, timerFits: true }, { rowsFit: true, textFits: true, timerFits: true }] });
        await ticket.tap();
        await expect(ticket).toHaveAttribute('aria-pressed', 'false');
      }
      await expect(page.locator('.ticket-wrap')).not.toHaveClass(/is-peeking/);
      // Re-entering the central viewport nudges either face again; tiny scrolls do not repeat it.
      await page.locator('.ticket-wrap').evaluate((wrap) => {
        const el = wrap as HTMLElement;
        el.dataset.hintCount = '0';
        el.dataset.ringCount = '0';
        el.addEventListener('animationstart', (event) => {
          if ((event as AnimationEvent).animationName === 'ticket-peek') el.dataset.hintCount = String(Number(el.dataset.hintCount) + 1);
          if ((event as AnimationEvent).animationName === 'ticket-date-ring') el.dataset.ringCount = String(Number(el.dataset.ringCount) + 1);
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
      await expect(page.locator('.ticket-wrap')).toHaveAttribute('data-ring-count', '1');
      await expect.poll(() => ticket.locator('.cal-day-ring ellipse').evaluate((el) => parseFloat(getComputedStyle(el).strokeDashoffset))).toBe(0);
      await expect(ticket).not.toHaveClass(/is-back-arriving/);
      // A real tick folds separate upper and lower paper leaves; the accessible number stays singular.
      await page.waitForFunction(() => [...document.querySelectorAll('.flip-sheet')].some((sheet) => sheet.getAnimations().some((animation) => animation.playState === 'running')));
      await expect(ticket.locator('.flip-number').filter({ has: page.locator('[data-unit="s"]') }).locator('.flip-sheet')).toHaveCount(3);
      expect(await ticket.locator('.flip-sheet').evaluateAll((sheets) => sheets.every((sheet) => sheet.getAttribute('aria-hidden') === 'true'))).toBe(true);
      await expect(ticket.locator('.ticket-day')).toHaveCount(0);
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await expect(ticket).not.toBeInViewport();
      await ticket.scrollIntoViewIfNeeded();
      await expect(page.locator('.ticket-wrap')).toHaveAttribute('data-hint-count', '2');
      await expect(ticket).toHaveAttribute('aria-pressed', 'true');
      // Small scrolls stay within the entry/exit band and must not keep restarting the hint.
      await page.evaluate(() => window.scrollBy({ top: 10, behavior: 'instant' }));
      await expect(page.locator('.ticket-wrap')).toHaveAttribute('data-hint-count', '2');
      // A partial exit is enough to rearm: guests need not scroll the entire ticket off screen.
      await page.locator('.ticket-wrap').evaluate(async (wrap) => {
        const paper = wrap as HTMLElement;
        window.scrollTo({ top: scrollY + paper.getBoundingClientRect().top - (innerHeight * .9 - paper.offsetHeight * .3), behavior: 'instant' });
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      });
      await expect(ticket).toBeInViewport();
      await ticket.scrollIntoViewIfNeeded();
      await expect(page.locator('.ticket-wrap')).toHaveAttribute('data-hint-count', '3');
      await ticket.focus();
      await page.keyboard.press('Enter');
      await expect(ticket).toHaveAttribute('aria-pressed', 'false');
      await expect(ticket.locator('.ticket-front')).toBeVisible();
      await expect(page.locator('.ticket-hint')).toBeVisible();
      await page.keyboard.press('Enter');
      await expect(page.locator('.ticket-wrap')).toHaveAttribute('data-ring-count', '2');
      await page.keyboard.press('Enter');
      // Rapid reversal must cancel the queued entrance instead of leaving hidden content animated.
      await ticket.evaluate((button) => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      await expect(ticket).toHaveAttribute('aria-pressed', 'false');
      await expect(ticket).not.toHaveClass(/is-back-arriving/);
      await expect(ticket.locator('.flip-sheet')).toHaveCount(0);
      // Touch readers get another short reminder while staying here; reduced motion cancels it.
      await page.clock.install();
      // Install the clock before navigation, so the page's reminder timers belong to it.
      await page.goto(new URL('v2/', baseURL!).href);
      await page.locator('.ticket-wrap').evaluate((wrap) => {
        const el = wrap as HTMLElement;
        el.dataset.hintCount = '0';
        el.addEventListener('animationstart', (event) => {
          if ((event as AnimationEvent).animationName === 'ticket-peek') el.dataset.hintCount = String(Number(el.dataset.hintCount) + 1);
        });
      });
      await ticket.scrollIntoViewIfNeeded();
      await expect(page.locator('.ticket-wrap')).toHaveAttribute('data-hint-count', '1');
      await expect(page.locator('.ticket-wrap')).not.toHaveClass(/is-peeking/);
      await page.clock.fastForward(7000);
      await page.clock.runFor(100);
      await expect(page.locator('.ticket-wrap')).toHaveAttribute('data-hint-count', '2');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.clock.fastForward(21000);
      await page.clock.runFor(100);
      await expect(page.locator('.ticket-wrap')).toHaveAttribute('data-hint-count', '2');
      await expect(page.locator('.ticket-wrap')).not.toHaveClass(/is-peeking/);

      // Real desktop hover must replay on each pointer entry, independently of viewport re-entry.
      const desktopPage = await browser.newPage({ viewport: { width: 1100, height: 850 } });
      await desktopPage.goto(new URL('v2/', baseURL!).href);
      await desktopPage.locator('.ticket-wrap').evaluate((wrap) => {
        const el = wrap as HTMLElement;
        el.dataset.hintCount = '0';
        el.addEventListener('animationstart', (event) => {
          if ((event as AnimationEvent).animationName === 'ticket-peek') el.dataset.hintCount = String(Number(el.dataset.hintCount) + 1);
        });
      });
      const desktopTicket = desktopPage.locator('[data-ticket]');
      await desktopTicket.scrollIntoViewIfNeeded();
      await expect(desktopPage.locator('.ticket-wrap')).toHaveAttribute('data-hint-count', '1');
      for (const count of [2, 3]) {
        await desktopPage.mouse.move(0, 0);
        await desktopTicket.hover();
        await expect(desktopPage.locator('.ticket-wrap')).toHaveAttribute('data-hint-count', String(count));
      }
      await desktopPage.emulateMedia({ reducedMotion: 'reduce' });
      await desktopPage.mouse.move(0, 0);
      await desktopTicket.hover();
      await expect(desktopPage.locator('.ticket-wrap')).toHaveAttribute('data-hint-count', '3');
      await expect(desktopPage.locator('.ticket-wrap')).not.toHaveClass(/is-peeking/);
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
    await expect(ticket).toHaveAccessibleName(/SHOWTIME.*2027.*COUNTDOWN/);
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
    await expect(page.locator('.ticket-row', { hasText: 'SEAT' })).toContainText('모바일 상영관');
    await expect(page.locator('.ticket')).not.toContainText('소중한 당신의 자리');
    await expect(page.locator('.transport')).toContainText('5호선 발산역 하차 7번 출구 (도보 3분~5분)');
    await expect(page.locator('.transport .point')).toHaveText('[이대서울병원]');
    await expect(page.locator('.transport')).toContainText('2시간 무료');
    // The two lots have different registration rules; the photo dialog must agree with the page.
    const directions = page.locator('#location .transport');
    await expect(directions.locator('div', { has: page.locator('dt', { hasText: '웨딩홀 건물 주차' }) })).toContainText('자동 적용');
    const hospitalParking = directions.locator('div', { has: page.locator('dt', { hasText: '이대서울병원 주차' }) });
    await expect(hospitalParking).toContainText('1·2·5층 엘리베이터 앞');
    await expect(hospitalParking).toContainText('차량번호 입력 후 무인 정산');
    await expect(directions).not.toContainText('주차권');
    await page.locator('[data-open-parking]').click();
    await expect(page.locator('#parking-dialog')).toContainText('1·2·5층 엘리베이터 앞');
    await expect(page.locator('#parking-dialog')).toContainText('차량번호 입력 후 무인 정산');
    await expect(page.locator('#parking-dialog')).not.toContainText('주차권');
    await expect(page.locator('#parking-dialog img')).toHaveCount(1);
    await expect(page.locator('#parking-dialog img')).toHaveAttribute('alt', /C관.*J·K·L.*남문/);
    await expect(page.locator('#parking-dialog')).not.toContainText('1층 안내데스크');
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
    // The address row is 주소, not 자차 (it is for every guest), with the road name written as officially.
    await expect(back.locator('dl dt')).toHaveText(['주소', '주차', '대중교통']);
    await expect(back.locator('dl')).toContainText('서울 강서구 공항대로36길 57');
    await expect(back.locator('dl')).toContainText('무료 주차 2시간(이후 30분당 3,000원)');
    await expect(back.locator('dl')).toContainText('웨딩홀 만차 시 이대서울병원 주차 가능');
    await expect(back.locator('dl')).not.toContainText('주차권');
    await expect(back.locator('dl')).not.toContainText('[');
    await expect(back.locator('dl strong')).toHaveCount(0);
    // The footer echoes the front title and explains the mobile invitation in Korean.
    const mobile = back.getByRole('link', { name: '모바일 청첩장 보기' });
    await expect(mobile.locator('.mobile-title')).toHaveText('Our First Page');
    await expect(mobile.locator('.mobile-label')).toHaveText('모바일 청첩장');
    await expect(mobile.locator('.mobile-description')).toHaveText('사진과 오시는 길을 담았습니다.');
    await expect(mobile).toHaveAttribute('href', /\/v2\/$/);
    await expect(mobile.locator('.qr svg')).toHaveCount(1);
    await expect(page.locator('.stub, .barcode, .qr-tile')).toHaveCount(0);
    const list = (await back.locator('dl').boundingBox())!;
    const box = (await mobile.boundingBox())!;
    expect(Math.abs(box.x - list.x)).toBeLessThan(1);
    expect(Math.abs(box.x + box.width - (list.x + list.width))).toBeLessThan(1);
    expect(box.y).toBeGreaterThan(list.y + list.height);
    // Type that is printed small reads poorly: every size on the back and the front's billing is at least 8 pt.
    const smallest = await page.evaluate(() => Math.min(...[...document.querySelectorAll('.sheet.back *, .front-foot *')]
      .filter((el) => [...el.childNodes].some((node) => node.nodeType === 3 && node.textContent!.trim()))
      .map((el) => parseFloat(getComputedStyle(el).fontSize) * .75)));
    expect(smallest).toBeGreaterThanOrEqual(8);
    // The front's billing prints in Noto Serif Display Bold (the couple chose it over SemiBold), and that face is loaded.
    expect(await page.locator('.front-foot p').first().evaluate((el) => {
      const style = getComputedStyle(el);
      return [style.fontFamily.split(',')[0], style.fontWeight, document.fonts.check('700 8pt "Noto Serif Display"', el.textContent!)];
    })).toEqual(['"Noto Serif Display"', '700', true]);
    await expect(back).not.toContainText('Greatest');
  });
});
