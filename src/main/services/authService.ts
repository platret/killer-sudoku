import bcrypt from 'bcryptjs';
import { findUserByUsername, insertUser } from '@main/db/queries';
import type { AuthResult } from '@shared/types';

const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,20}$/;

function normalize(u: string): string {
  return (u ?? '').trim().toLowerCase();
}

function validUsername(u: string): boolean {
  return USERNAME_RE.test(u);
}

function validPassword(p: string): boolean {
  return typeof p === 'string' && p.length >= 6 && p.length <= 128;
}

export async function register(username: string, password: string): Promise<AuthResult> {
  const u = normalize(username);
  if (!validUsername(u)) {
    return { success: false, error: 'Username must be 3-20 chars (letters, digits, _ . -)' };
  }
  if (!validPassword(password)) {
    return { success: false, error: 'Password must be 6-128 characters' };
  }
  const existing = findUserByUsername(u);
  if (existing) return { success: false, error: 'Username already taken' };
  const hash = await bcrypt.hash(password, 10);
  const user = insertUser(u, hash);
  return { success: true, user };
}

export async function login(username: string, password: string): Promise<AuthResult> {
  const u = normalize(username);
  if (!validUsername(u) || !validPassword(password)) {
    return { success: false, error: 'Invalid credentials' };
  }
  const found = findUserByUsername(u);
  if (!found) return { success: false, error: 'Invalid credentials' };
  const ok = await bcrypt.compare(password, found.hash);
  if (!ok) return { success: false, error: 'Invalid credentials' };
  return { success: true, user: found.user };
}
