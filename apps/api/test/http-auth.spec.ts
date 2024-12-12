import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import {
  createGames,
  createPlayer,
  createStaff,
  createTestContext,
  login,
  type TestContext,
} from './harness.js';

describe('HTTP auth, RBAC and validation', () => {
  let ctx: TestContext;
  let player: { id: string; email: string };
  let operator: { id: string; email: string };
  let admin: { id: string; email: string };
  const origin = 'http://localhost:3000';

  beforeAll(async () => {
    ctx = await createTestContext();
    await createGames(ctx);
    player = await createPlayer(ctx);
    operator = await createStaff(ctx, 'OPERATOR');
    admin = await createStaff(ctx, 'ADMIN');
  });
  afterAll(async () => ctx.close());

  it('sets an HttpOnly session cookie on login and rejects bad credentials', async () => {
    const res = await request(ctx.app.getHttpServer())
      .post('/api/auth/login')
      .set('Origin', origin)
      .send({ email: player.email, password: 'Player123!' })
      .expect(200);
    const cookie = (res.headers['set-cookie'] as unknown as string[])[0]!;
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(res.body.user.email).toBe(player.email);
    await request(ctx.app.getHttpServer())
      .post('/api/auth/login')
      .set('Origin', origin)
      .send({ email: player.email, password: 'wrong-password' })
      .expect(401);
    await request(ctx.app.getHttpServer())
      .post('/api/auth/login')
      .set('Origin', origin)
      .send({ email: 'not-an-email', password: 'x' })
      .expect(400);
  });

  it('requires authentication for wallet and bet endpoints', async () => {
    await request(ctx.app.getHttpServer()).get('/api/wallet').expect(401);
    await request(ctx.app.getHttpServer())
      .post('/api/sportsbook/bets')
      .set('Origin', origin)
      .send({})
      .expect(401);
    await request(ctx.app.getHttpServer()).get('/api/sportsbook/events').expect(200);
  });

  it('protects administrative routes by role', async () => {
    const playerCookie = await login(ctx, player.email, 'Player123!');
    const operatorCookie = await login(ctx, operator.email, 'Staff1234!');
    const adminCookie = await login(ctx, admin.email, 'Staff1234!');
    const server = ctx.app.getHttpServer();
    await request(server).get('/api/admin/dashboard').set('Cookie', playerCookie).expect(403);
    await request(server).get('/api/admin/dashboard').set('Cookie', operatorCookie).expect(200);
    await request(server)
      .get('/api/sportsbook/operator/events')
      .set('Cookie', playerCookie)
      .expect(403);
    await request(server)
      .get('/api/casino/operator/games')
      .set('Cookie', operatorCookie)
      .expect(200);
    const adjustment = {
      direction: 'CREDIT',
      amountMinor: '1000',
      reason: 'rbac test',
      idempotencyKey: 'rbac-adj-0001',
    };
    await request(server)
      .post(`/api/admin/players/${player.id}/adjustments`)
      .set('Cookie', operatorCookie)
      .set('Origin', origin)
      .send(adjustment)
      .expect(403);
    const ok = await request(server)
      .post(`/api/admin/players/${player.id}/adjustments`)
      .set('Cookie', adminCookie)
      .set('Origin', origin)
      .send(adjustment)
      .expect(201);
    expect(ok.body.wallet.balanceMinor).toBe('101000');
    const audit = await request(server)
      .get('/api/admin/audit?action=wallet.adjust')
      .set('Cookie', adminCookie)
      .expect(200);
    expect(audit.body.items[0]).toMatchObject({
      action: 'wallet.adjust',
      actorId: admin.id,
      targetId: player.id,
    });
  });

  it('validates request bodies with the shared zod schemas and blocks foreign origins', async () => {
    const cookie = await login(ctx, player.email, 'Player123!');
    const server = ctx.app.getHttpServer();
    const bad = await request(server)
      .post('/api/sportsbook/bets')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send({ stakeMinor: 'twenty', selections: [] })
      .expect(400);
    expect(bad.body.code).toBe('VALIDATION_FAILED');
    expect(bad.body.details.map((d: { path: string }) => d.path)).toEqual(
      expect.arrayContaining(['idempotencyKey', 'stakeMinor', 'selections']),
    );
    await request(server)
      .post('/api/casino/sessions')
      .set('Cookie', cookie)
      .set('Origin', 'http://evil.example')
      .send({ gameSlug: 'harbor-dice' })
      .expect(403);
    await request(server)
      .post('/api/casino/sessions')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send({ gameSlug: 'harbor-dice' })
      .expect(201);
  });

  it('never lets a client set a payout: round outcomes come only from the server', async () => {
    const cookie = await login(ctx, player.email, 'Player123!');
    const server = ctx.app.getHttpServer();
    const session = await request(server)
      .post('/api/casino/sessions')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send({ gameSlug: 'harbor-dice' })
      .expect(201);
    const before = Number(
      (await request(server).get('/api/wallet').set('Cookie', cookie)).body.balanceMinor,
    );
    const res = await request(server)
      .post('/api/casino/rounds')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .send({
        sessionId: session.body.id,
        clientRoundKey: 'http-round-0001',
        stakeMinor: '100',
        input: { type: 'dice', target: 50, direction: 'under' },
        payoutMinor: '999999',
      })
      .expect(201);
    const after = Number(res.body.wallet.balanceMinor);
    expect(after - before).toBe(Number(res.body.round.payoutMinor) - 100);
    expect(Number(res.body.round.payoutMinor)).toBeLessThanOrEqual(100 * 2);
  });

  it('logs out by clearing the cookie', async () => {
    const cookie = await login(ctx, player.email, 'Player123!');
    const res = await request(ctx.app.getHttpServer())
      .post('/api/auth/logout')
      .set('Cookie', cookie)
      .set('Origin', origin)
      .expect(204);
    expect((res.headers['set-cookie'] as unknown as string[])[0]).toMatch(/igaming_session=;/);
  });
});
