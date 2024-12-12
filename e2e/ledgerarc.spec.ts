import { expect, test } from '@playwright/test';
import {
  API_URL,
  OPERATOR,
  URLS,
  loginThroughUi,
  registerPlayer,
  type TestPlayer,
} from './helpers';

test.describe('LedgerArc back office', () => {
  let player: TestPlayer;
  test.beforeAll(async ({ request }) => {
    player = await registerPlayer(request);
  });

  test('operator sees transactions created by the other two apps for the same player', async ({
    page,
    request,
    browser,
  }) => {
    const playerContext = await browser.newContext();
    const playerPage = await playerContext.newPage();
    await loginThroughUi(playerPage, URLS.linepulse, player.email, player.password);
    await playerPage.goto(`${URLS.linepulse}/sports`);
    await playerPage.getByTestId('event-card').first().click();
    await playerPage.getByTestId('odds-button').first().click();
    await playerPage.getByTestId('betslip-stake').first().fill('100');
    await playerPage.getByTestId('betslip-place').first().click();
    const acceptOdds = playerPage.getByTestId('betslip-accept-odds');
    if (await acceptOdds.isVisible({ timeout: 2000 }).catch(() => false)) await acceptOdds.click();
    await expect(playerPage.getByTestId('bet-confirmation')).toBeVisible();

    await playerPage.goto(`${URLS.spinharbor}/play/harbor-dice`);
    await playerPage.getByTestId('dice-stake').fill('20');
    await playerPage.getByTestId('dice-play').click();
    await expect(playerPage.getByTestId('dice-result')).toBeVisible();
    await playerContext.close();

    await loginThroughUi(page, URLS.ledgerarc, OPERATOR.email, OPERATOR.password);
    await expect(page.getByTestId('metric-circulation')).toBeVisible();

    await page.goto(`${URLS.ledgerarc}/players/${player.id}`);
    await expect(page.getByText(player.email).first()).toBeVisible();

    await page.goto(`${URLS.ledgerarc}/transactions?playerId=${player.id}`);
    const rows = page.getByTestId('transaction-row');
    await expect(rows.first()).toBeVisible();
    const text = await rows.allInnerTexts();
    const joined = text.join('\n');
    expect(joined).toMatch(/BET_STAKE|Bet stake/i);
    expect(joined).toMatch(/CASINO_STAKE|Casino stake|round stake/i);
    expect(joined).toMatch(/TOPUP|Welcome|top-up/i);

    await page.goto(`${URLS.ledgerarc}/journal?playerId=${player.id}`);
    await expect(page.getByTestId('journal-row').first()).toBeVisible();

    const reconciliation = await request.get(`${API_URL}/api/admin/ledger/reconciliation`, {
      headers: { Cookie: await operatorCookie(request) },
    });
    expect(reconciliation.ok()).toBeTruthy();
    expect(((await reconciliation.json()) as { balanced: boolean }).balanced).toBe(true);
  });

  test('a player account is denied access to the back office', async ({ page }) => {
    await page.goto(`${URLS.ledgerarc}/login`);
    await page.getByTestId('login-email').fill(player.email);
    await page.getByTestId('login-password').fill(player.password);
    await page.getByTestId('login-submit').click();
    await expect(page.getByText(/access denied|not authori[sz]ed|operator/i).first()).toBeVisible();
    await expect(page.getByTestId('metric-circulation')).toHaveCount(0);
  });
});

async function operatorCookie(request: Parameters<typeof registerPlayer>[0]): Promise<string> {
  const res = await request.post(`${API_URL}/api/auth/login`, {
    data: OPERATOR,
    headers: { Origin: URLS.ledgerarc },
  });
  expect(res.ok()).toBeTruthy();
  const cookie = res.headersArray().find((h) => h.name.toLowerCase() === 'set-cookie')?.value ?? '';
  return cookie.split(';')[0]!;
}
