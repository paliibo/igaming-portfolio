import { expect, test } from '@playwright/test';
import { URLS, expectBalance, loginThroughUi, registerPlayer } from './helpers';

test.describe('LinePulse sportsbook', () => {
  test('player signs in, browses events, places a 20 credit bet and sees the debit', async ({
    page,
    request,
  }) => {
    const player = await registerPlayer(request);
    await loginThroughUi(page, URLS.linepulse, player.email, player.password);
    await expectBalance(page, 100_000n);

    await page.goto(`${URLS.linepulse}/sports`);
    const cards = page.getByTestId('event-card');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThanOrEqual(1);
    await cards.first().click();
    await expect(page).toHaveURL(/\/events\//);

    const odds = page.getByTestId('odds-button').filter({ hasNot: page.locator('[disabled]') });
    await expect(odds.first()).toBeVisible();
    await odds.first().click();

    const stake = page.getByTestId('betslip-stake').first();
    await stake.fill('20');
    await page.getByTestId('betslip-place').first().click();

    const acceptOdds = page.getByTestId('betslip-accept-odds');
    if (await acceptOdds.isVisible({ timeout: 2000 }).catch(() => false)) {
      await acceptOdds.click();
    }
    await expect(page.getByTestId('bet-confirmation')).toBeVisible();
    await expectBalance(page, 98_000n);

    await page.goto(`${URLS.linepulse}/bets`);
    const rows = page.getByTestId('bet-row');
    await expect(rows.first()).toBeVisible();
    await expect(rows.first()).toContainText('20.00');
  });

  test('a signed-out visitor can browse but is asked to sign in to bet', async ({ page }) => {
    await page.goto(`${URLS.linepulse}/sports`);
    await expect(page.getByTestId('event-card').first()).toBeVisible();
    await page.getByTestId('event-card').first().click();
    await page.getByTestId('odds-button').first().click();
    await expect(page.getByRole('link', { name: /sign in/i }).first()).toBeVisible();
  });
});
