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
  swapNewsletterIssues: vi.fn(),
}));
vi.mock('../lib/newsletter/loader', () => ({
  loadNewsletterIssue: vi.fn(),
  clearNewsletterIssueCache: vi.fn(),
}));
vi.mock('../lib/newsletter/email-loader', () => ({
  getNewsletterIssueNumbers: vi.fn(),
  clearNewsletterIssueCache: vi.fn(),
}));

import { createNewsletterIssue, deleteNewsletterIssue, swapNewsletterIssues } from '../lib/db';
import { clearNewsletterIssueCache as clearLoaderCache } from '../lib/newsletter/loader';
import { clearNewsletterIssueCache as clearEmailLoaderCache } from '../lib/newsletter/email-loader';
import { POST } from '../app/api/admin/newsletters/route';
import { DELETE } from '../app/api/admin/newsletters/[number]/route';
import { POST as MOVE } from '../app/api/admin/newsletters/[number]/move/route';

function request(method: string, auth?: string): NextRequest {
  return new NextRequest('http://localhost/api/admin/newsletters', {
    method,
    headers: auth ? { authorization: `Bearer ${auth}` } : {},
  });
}

function moveRequest(body: unknown, auth?: string): NextRequest {
  return new NextRequest('http://localhost/api/admin/newsletters/10/move', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(auth ? { authorization: `Bearer ${auth}` } : {}),
    },
    body: JSON.stringify(body),
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

describe('POST /api/admin/newsletters/[number]/move', () => {
  it('returns 401 without auth', async () => {
    const res = await MOVE(moveRequest({ direction: 'down' }), params('10'));
    expect(res.status).toBe(401);
    expect(swapNewsletterIssues).not.toHaveBeenCalled();
  });

  it('returns 401 with the wrong password', async () => {
    const res = await MOVE(moveRequest({ direction: 'down' }, 'wrong'), params('10'));
    expect(res.status).toBe(401);
    expect(swapNewsletterIssues).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid number', async () => {
    const res = await MOVE(moveRequest({ direction: 'down' }, 'secret'), params('abc'));
    expect(res.status).toBe(400);
    expect(swapNewsletterIssues).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid direction', async () => {
    const res = await MOVE(moveRequest({ direction: 'sideways' }, 'secret'), params('10'));
    expect(res.status).toBe(400);
    expect(swapNewsletterIssues).not.toHaveBeenCalled();
  });

  it('returns 400 when moving up into the welcome series', async () => {
    const res = await MOVE(moveRequest({ direction: 'up' }, 'secret'), params('4'));
    expect(res.status).toBe(400);
    expect(swapNewsletterIssues).not.toHaveBeenCalled();
  });

  it('returns 404 when an issue does not exist', async () => {
    vi.mocked(swapNewsletterIssues).mockResolvedValue('not_found');
    const res = await MOVE(moveRequest({ direction: 'down' }, 'secret'), params('42'));
    expect(res.status).toBe(404);
    expect(clearLoaderCache).not.toHaveBeenCalled();
  });

  it('returns 409 with the reason when the move is blocked', async () => {
    vi.mocked(swapNewsletterIssues).mockResolvedValue({ blocked: 'Newsletter #9 has been sent' });
    const res = await MOVE(moveRequest({ direction: 'up' }, 'secret'), params('10'));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'Newsletter #9 has been sent' });
    expect(clearLoaderCache).not.toHaveBeenCalled();
  });

  it('moves up by swapping with the previous issue', async () => {
    vi.mocked(swapNewsletterIssues).mockResolvedValue('swapped');
    const res = await MOVE(moveRequest({ direction: 'up' }, 'secret'), params('11'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, number: 10 });
    expect(swapNewsletterIssues).toHaveBeenCalledWith(11, 10);
    expect(clearLoaderCache).toHaveBeenCalled();
  });

  it('moves down by swapping with the next issue', async () => {
    vi.mocked(swapNewsletterIssues).mockResolvedValue('swapped');
    const res = await MOVE(moveRequest({ direction: 'down' }, 'secret'), params('10'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, number: 11 });
    expect(swapNewsletterIssues).toHaveBeenCalledWith(10, 11);
    expect(clearLoaderCache).toHaveBeenCalled();
  });
});
