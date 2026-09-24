import { test, expect } from '@playwright/test';

// The movie-theater edition lives beside the original at /v2/ and shares its data and scripts.
test.describe('the movie edition (/v2/)', () => {
  test('renders the poster, strips, ticket, credits and cookie without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('./v2/');
    await expect(page).toHaveTitle(/The Grandest Show of Our Love/);
    await expect(page.locator('.poster-title')).toHaveAttribute('aria-label', 'The Grandest Show of Our Love');
    await expect(page.locator('.quote')).toContainText('3000만큼 사랑해');
    await expect(page.locator('.film-strip img').first()).toBeAttached();
    await expect(page.locator('.cast')).toContainText('이기만');
    await expect(page.locator('.cast')).toContainText('정해숙');
    await expect(page.locator('.cast')).toContainText('임원섭');
    await expect(page.locator('.cast')).not.toContainText('임OO');
    await expect(page.locator('.gallery-thumb')).toHaveCount(30);
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
});
