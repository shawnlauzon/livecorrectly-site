import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import {
  getNewsletterNotes,
  insertNewsletterNote,
  updateNewsletterNote,
  deleteNewsletterNote,
} from '@/lib/db';

/**
 * Dated notes for newsletter sends. A note is shown above the issue body of
 * any newsletter sent on its date (in the publication's timezone).
 *
 * GET    → { notes: NewsletterNote[] } (newest date first)
 * POST   { sendDate: "YYYY-MM-DD", body: string } → create (409 if the date has a note)
 * PUT    { id, sendDate, body } → update (409 if another note has that date)
 * DELETE { id } → delete
 */

function authorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;
  return checkAdminPassword(authHeader.replace('Bearer ', ''));
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Validate a note's date + body, returning an error message or the cleaned values. */
function parseNote(body: { sendDate?: unknown; body?: unknown }): { error: string } | { sendDate: string; body: string } {
  if (typeof body.sendDate !== 'string' || !DATE_PATTERN.test(body.sendDate)) {
    return { error: 'sendDate must be YYYY-MM-DD' };
  }
  if (typeof body.body !== 'string' || body.body.trim() === '') {
    return { error: 'body is required' };
  }
  return { sendDate: body.sendDate, body: body.body.trim() };
}

async function readJson(request: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    return NextResponse.json({ notes: await getNewsletterNotes(1) });
  } catch (error) {
    console.error('[admin/newsletters/notes] GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const json = await readJson(request);
  if (!json) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = parseNote(json);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  try {
    const note = await insertNewsletterNote({ newsletterId: 1, ...parsed });
    if (note === 'duplicate') {
      return NextResponse.json({ error: `There is already a note for ${parsed.sendDate}` }, { status: 409 });
    }
    return NextResponse.json({ note });
  } catch (error) {
    console.error('[admin/newsletters/notes] POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const json = await readJson(request);
  if (!json) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (typeof json.id !== 'number') {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }
  const parsed = parseNote(json);
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  try {
    const note = await updateNewsletterNote(json.id, parsed);
    if (note === 'duplicate') {
      return NextResponse.json({ error: `There is already a note for ${parsed.sendDate}` }, { status: 409 });
    }
    if (!note) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }
    return NextResponse.json({ note });
  } catch (error) {
    console.error('[admin/newsletters/notes] PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const json = await readJson(request);
  if (!json || typeof json.id !== 'number') {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }
  try {
    if (!(await deleteNewsletterNote(json.id))) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin/newsletters/notes] DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
