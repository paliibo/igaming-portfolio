import { chromium } from '@playwright/test';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4100';
const LP = `http://localhost:${process.env.E2E_LINEPULSE_PORT ?? 3100}`;
const SH = `http://localhost:${process.env.E2E_SPINHARBOR_PORT ?? 3101}`;
const LA = `http://localhost:${process.env.E2E_LEDGERARC_PORT ?? 3102}`;

const browser = await chromium.launch();
const problems = [];

async function session(email, password, origin) {
  const context = await browser.newContext({
    viewport: { width: 1360, height: 850 },
    deviceScaleFactor: 1,
  });
  const res = await context.request.post(`${API}/api/auth/login`, {
    data: { email, password },
    headers: { Origin: origin },
  });
  if (!res.ok()) throw new Error(`login failed for ${email}: ${await res.text()}`);
  return context;
}

async function visit(context, url, shot) {
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().startsWith('Failed to load resource'))
      errors.push(m.text().split('\n')[0]);
  });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.split('\n')[0]));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  if (shot) await page.screenshot({ path: `docs/screenshots/${shot}.png`, fullPage: false });
  if (errors.length) problems.push({ url, errors });
  console.log(`${url} -> ${errors.length ? errors.length + ' console error(s)' : 'clean'}`);
  await page.close();
}

const player = await session('player@demo.local', 'Player123!', LP);
await visit(player, `${LP}/`, 'linepulse-dashboard');
await visit(player, `${LP}/sports`, 'linepulse-sports');
const events = await (await player.request.get(`${API}/api/sportsbook/events?status=live`)).json();
if (events[0]) await visit(player, `${LP}/events/${events[0].id}`, 'linepulse-event');
await visit(player, `${LP}/bets`, null);
await visit(player, `${LP}/account`, null);
await visit(player, `${SH}/`, 'spinharbor-home');
await visit(player, `${SH}/lobby`, 'spinharbor-lobby');
await visit(player, `${SH}/play/harbor-dice`, 'spinharbor-dice');
await visit(player, `${SH}/play/harbor-reels`, 'spinharbor-reels');
await visit(player, `${SH}/history`, null);
await player.close();

const operator = await session('operator@demo.local', 'Operator123!', LA);
await visit(operator, `${LA}/`, 'ledgerarc-dashboard');
await visit(operator, `${LA}/players`, 'ledgerarc-players');
await visit(operator, `${LA}/journal`, 'ledgerarc-journal');
await visit(operator, `${LA}/reports`, 'ledgerarc-reports');
await visit(operator, `${LA}/risk`, null);
await visit(operator, `${LA}/audit`, null);
await visit(operator, `${LP}/operator`, 'linepulse-operator');
await visit(operator, `${SH}/operator/games`, 'spinharbor-operator');
await operator.close();
await browser.close();
if (problems.length) {
  console.log(JSON.stringify(problems, null, 2));
  process.exit(1);
}
