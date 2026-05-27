import { beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeUserRow {
  id: number;
  username: string;
  hash: string;
  createdAt: string;
}

const mocks = vi.hoisted(() => {
  const state: { users: FakeUserRow[]; nextId: number } = { users: [], nextId: 1 };
  const findUserByUsername = vi.fn((u: string) => {
    const f = state.users.find((x) => x.username === u);
    return f
      ? { user: { id: f.id, username: f.username, createdAt: f.createdAt }, hash: f.hash }
      : null;
  });
  const insertUser = vi.fn((u: string, h: string) => {
    const row: FakeUserRow = {
      id: state.nextId++,
      username: u,
      hash: h,
      createdAt: new Date().toISOString()
    };
    state.users.push(row);
    return { id: row.id, username: row.username, createdAt: row.createdAt };
  });
  return { state, findUserByUsername, insertUser };
});

vi.mock('@main/db/queries', () => ({
  findUserByUsername: mocks.findUserByUsername,
  insertUser: mocks.insertUser
}));

import { login, register } from '../authService';

beforeEach(() => {
  mocks.state.users = [];
  mocks.state.nextId = 1;
  mocks.findUserByUsername.mockClear();
  mocks.insertUser.mockClear();
});

describe('authService (covers TC-03 to TC-10)', () => {
  it('TC-03 positive register: creates user with hashed password', async () => {
    const res = await register('maxm', 'Test1234');
    expect(res.success).toBe(true);
    expect(res.user?.username).toBe('maxm');
    expect(mocks.insertUser).toHaveBeenCalledTimes(1);
    const stored = mocks.state.users[0];
    expect(stored.hash).not.toBe('Test1234');
    expect(stored.hash.startsWith('$2')).toBe(true);
  });

  it('TC-04 negative register: rejects duplicate username (no second insert)', async () => {
    await register('maxm', 'Test1234');
    mocks.insertUser.mockClear();
    const res = await register('maxm', 'Otherpass9');
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/already/i);
    expect(mocks.insertUser).not.toHaveBeenCalled();
  });

  it('TC-05 negative register: empty username and short password are rejected', async () => {
    const empty = await register('', 'Test1234');
    expect(empty.success).toBe(false);
    expect(empty.error).toMatch(/username/i);

    const shortPw = await register('valid', '12');
    expect(shortPw.success).toBe(false);
    expect(shortPw.error).toMatch(/password/i);

    expect(mocks.insertUser).not.toHaveBeenCalled();
  });

  it('TC-06 boundary register: 3 and 20 chars accepted, 2 and 21 rejected', async () => {
    const ok3 = await register('abc', 'Test1234');
    expect(ok3.success).toBe(true);

    const twenty = 'abcdefghijklmnopqrst';
    expect(twenty.length).toBe(20);
    const ok20 = await register(twenty, 'Test1234');
    expect(ok20.success).toBe(true);

    const tooShort = await register('ab', 'Test1234');
    expect(tooShort.success).toBe(false);

    const tooLong = 'abcdefghijklmnopqrstu';
    expect(tooLong.length).toBe(21);
    const rejected = await register(tooLong, 'Test1234');
    expect(rejected.success).toBe(false);
  });

  it('TC-07 positive login: correct credentials succeed', async () => {
    await register('maxm', 'Test1234');
    const res = await login('maxm', 'Test1234');
    expect(res.success).toBe(true);
    expect(res.user?.username).toBe('maxm');
  });

  it('TC-08 negative login: wrong password is rejected', async () => {
    await register('maxm', 'Test1234');
    const res = await login('maxm', 'wrongpw');
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/invalid/i);
  });

  it('TC-09 negative login: non-existent user is rejected', async () => {
    const res = await login('gibtsnicht', 'whatever');
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/invalid/i);
  });

  it('TC-10 boundary login: empty credentials are rejected before DB call', async () => {
    const res = await login('', '');
    expect(res.success).toBe(false);
    expect(mocks.findUserByUsername).not.toHaveBeenCalled();
  });
});
