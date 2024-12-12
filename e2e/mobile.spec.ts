import { expect, test } from '@playwright/test';
import { OPERATOR, URLS, loginThroughUi, registerPlayer } from './helpers';

test('key screens render without horizontal overflow on a phone viewport', async ({
  page,
  request,
}) => {
  const player = await registerPlayer(request);
  await loginThroughUi(page, URLS.linepulse, player.email, player.password);
  for (const url of [
    `${URLS.linepulse}/`,
    `${URLS.linepulse}/sports`,
    `${URLS.spinharbor}/lobby`,
    `${URLS.spinharbor}/play/harbor-dice`,
  ]) {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `horizontal overflow on ${url}`).toBeLessThanOrEqual(1);
  }
});

test('back-office screens render without horizontal overflow on a phone viewport', async ({
  page,
}) => {
  await loginThroughUi(page, URLS.ledgerarc, OPERATOR.email, OPERATOR.password);
  for (const url of [
    `${URLS.ledgerarc}/`,
    `${URLS.ledgerarc}/players`,
    `${URLS.ledgerarc}/transactions`,
    `${URLS.ledgerarc}/journal`,
    `${URLS.ledgerarc}/reports`,
  ]) {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `horizontal overflow on ${url}`).toBeLessThanOrEqual(1);
  }
});
