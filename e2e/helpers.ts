import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const API_URL = (process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000').replace(
  /\/$/,
  '',
);
export const URLS = {
  linepulse: `http://localhost:${process.env['E2E_LINEPULSE_PORT'] ?? 3000}`,
  spinharbor: `http://localhost:${process.env['E2E_SPINHARBOR_PORT'] ?? 3001}`,
  ledgerarc: `http://localhost:${process.env['E2E_LEDGERARC_PORT'] ?? 3002}`,
};
export const OPERATOR = {
  email: process.env['DEMO_OPERATOR_EMAIL'] ?? 'operator@demo.local',
  password: process.env['DEMO_OPERATOR_PASSWORD'] ?? 'Operator123!',
};

export interface TestPlayer {
  id: string;
  email: string;
  password: string;
  displayName: string;
}

/** Registers a fresh demo player (1,000.00 DMO welcome balance) so every run starts from a known state. */
export async function registerPlayer(request: APIRequestContext): Promise<TestPlayer> {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const player = {
    email: `e2e-${stamp}@demo.local`,
    password: 'E2ePlayer123!',
    displayName: `E2E ${stamp.slice(-5)}`,
  };
  const res = await request.post(`${API_URL}/api/auth/register`, {
    data: player,
    headers: { Origin: URLS.linepulse },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  const body = (await res.json()) as { user: { id: string } };
  return { ...player, id: body.user.id };
}

export async function loginThroughUi(page: Page, appUrl: string, email: string, password: string) {
  await page.goto(`${appUrl}/login`);
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
  await expect(page).not.toHaveURL(/\/login/);
}

/** Parses "1,234.56 DMO" into integer minor units. */
export function parseCreditsText(text: string): bigint {
  const match = /(-?)([\d,]+)\.(\d{2})/.exec(text);
  if (!match) throw new Error(`cannot parse credits from "${text}"`);
  const value = BigInt(match[2]!.replace(/,/g, '')) * 100n + BigInt(match[3]!);
  return match[1] === '-' ? -value : value;
}

export async function readBalance(page: Page): Promise<bigint> {
  const text = await page.getByTestId('wallet-balance').first().innerText();
  return parseCreditsText(text);
}

export async function expectBalance(page: Page, expectedMinor: bigint) {
  await expect.poll(async () => readBalance(page), { timeout: 15_000 }).toBe(expectedMinor);
}
