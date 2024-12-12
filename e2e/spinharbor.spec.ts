import { expect, test } from '@playwright/test';
import {
  URLS,
  expectBalance,
  loginThroughUi,
  readBalance,
  registerPlayer,
  type TestPlayer,
} from './helpers';

test.describe('SpinHarbor casino', () => {
  let player: TestPlayer;
  test.beforeAll(async ({ request }) => {
    player = await registerPlayer(request);
  });

  test('player plays a dice round and the balance and history reflect the server result', async ({
    page,
  }) => {
    await loginThroughUi(page, URLS.spinharbor, player.email, player.password);
    await expectBalance(page, 100_000n);

    await page.goto(`${URLS.spinharbor}/lobby`);
    const tiles = page.getByTestId('game-tile');
    await expect(tiles.first()).toBeVisible();
    expect(await tiles.count()).toBeGreaterThanOrEqual(8);

    await page.goto(`${URLS.spinharbor}/play/harbor-dice`);
    const stakeInput = page.getByTestId('dice-stake');
    await expect(stakeInput).toBeVisible();
    await stakeInput.fill('10');
    await page.getByTestId('dice-play').click();

    const result = page.getByTestId('dice-result');
    await expect(result).toBeVisible();
    await expect.poll(() => readBalance(page)).not.toBe(100_000n);
    const balance = await readBalance(page);
    const lost = balance === 99_000n;
    const won = balance === 100_980n;
    expect(
      lost || won,
      `balance ${balance} must be stake lost (990.00) or paid at 1.98x (1,009.80)`,
    ).toBe(true);
    await expect(result).toContainText(won ? /win|won/i : /lose|lost/i);

    await page.goto(`${URLS.spinharbor}/history`);
    const rows = page.getByTestId('round-row');
    await expect(rows.first()).toBeVisible();
    await expect(rows.first()).toContainText('10.00');
  });

  test('slots spin completes a round server-side', async ({ page }) => {
    await loginThroughUi(page, URLS.spinharbor, player.email, player.password);
    await page.goto(`${URLS.spinharbor}/play/harbor-reels`);
    const before = await readBalance(page);
    await page.getByTestId('slots-stake').fill('2');
    await page.getByTestId('slots-spin').click();
    await expect(page.getByTestId('slots-result')).toBeVisible({ timeout: 20_000 });
    await expect.poll(() => readBalance(page)).not.toBe(before);
    expect(await readBalance(page)).toBeGreaterThanOrEqual(before - 200n);
  });
});
