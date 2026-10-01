import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('../lib/admin-auth', () => ({
  checkAdminPassword: vi.fn((pwd: string) => pwd === 'secret'),
}));
vi.mock('../lib/db', () => ({
  getAllSubscribers: vi.fn(),
  getNewsletterSchedules: vi.fn(),
  getNewsletterPublication: vi.fn(),
  getNewsletterSegments: vi.fn(),
  createNewsletterIssue: vi.fn(),
  getDbNewsletterIssueFull: vi.fn(),
  updateNewsletterIssue: vi.fn(),
  deleteNewsletterIssue: vi.fn(),
}));
vi.mock('../newsletters/loader', () => ({
  loadNewsletterIssue: vi.fn(),
  clearNewsletterIssueCache: vi.fn(),
}));
vi.mock('../emails/newsletter-loader', () => ({
  getNewsletterIssueNumbers: vi.fn(),
  clearNewsletterIssueCache: vi.fn(),
}));

import { createNewsletterIssue, deleteNewsletterIssue } from '../lib/db';
import { clearNewsletterIssueCache as clearLoaderCache } from '../newsletters/loader';
import { clearNewsletterIssueCache as clearEmailLoaderCache } from '../emails/newsletter-loader';
import { POST } from '../app/api/admin/newsletters/route';
import { DELETE } from '../app/api/admin/newsletters/[number]/route';

function request(method: string, auth?: string): NextRequest {
  return new NextRequest('http://localhost/api/admin/newsletters', {
    method,
    headers: auth ? { authorization: `Bearer ${auth}` } : {},
  });
}

function params(number: string) {
  return { params: Promise.resolve({ number }) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/admin/newsletters', () => {
  it('returns 401 without auth', async () => {
    const res = await POST(request('POST'));
    expect(res.status).toBe(401);
    expect(createNewsletterIssue).not.toHaveBeenCalled();
  });

  it('returns 401 with the wrong password', async () => {
    const res = await POST(request('POST', 'wrong'));
    expect(res.status).toBe(401);
  });

  it('creates an issue for publication 1 and clears the cache', async () => {
    vi.mocked(createNewsletterIssue).mockResolvedValue(9);
    const res = await POST(request('POST', 'secret'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ number: 9 });
    expect(createNewsletterIssue).toHaveBeenCalledWith(1);
    expect(clearEmailLoaderCache).toHaveBeenCalled();
  });
});

describe('DELETE /api/admin/newsletters/[number]', () => {
  it('returns 401 without auth', async () => {
    const res = await DELETE(request('DELETE'), params('10'));
    expect(res.status).toBe(401);
    expect(deleteNewsletterIssue).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid number', async () => {
    const res = await DELETE(request('DELETE', 'secret'), params('abc'));
    expect(res.status).toBe(400);
    expect(deleteNewsletterIssue).not.toHaveBeenCalled();
  });

  it('returns 404 when the issue does not exist', async () => {
    vi.mocked(deleteNewsletterIssue).mockResolvedValue('not_found');
    const res = await DELETE(request('DELETE', 'secret'), params('42'));
    expect(res.status).toBe(404);
    expect(clearLoaderCache).not.toHaveBeenCalled();
  });

  it('returns 409 with the reason when the issue is blocked', async () => {
    vi.mocked(deleteNewsletterIssue).mockResolvedValue({ blocked: 'Newsletter #8 has schedule history' });
    const res = await DELETE(request('DELETE', 'secret'), params('8'));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'Newsletter #8 has schedule history' });
    expect(clearLoaderCache).not.toHaveBeenCalled();
  });

  it('deletes the issue and clears the cache', async () => {
    vi.mocked(deleteNewsletterIssue).mockResolvedValue('deleted');
    const res = await DELETE(request('DELETE', 'secret'), params('10'));
    expect(res.status).toBe(200);
    expect(deleteNewsletterIssue).toHaveBeenCalledWith(10);
    expect(clearLoaderCache).toHaveBeenCalled();
  });
});
