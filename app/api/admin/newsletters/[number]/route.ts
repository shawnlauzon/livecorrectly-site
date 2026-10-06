import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import { getDbNewsletterIssueFull, updateNewsletterIssue, deleteNewsletterIssue } from '@/lib/db';
import { clearNewsletterIssueCache } from '@/lib/newsletter/loader';

/**
 * GET /api/admin/newsletters/[number]
 *
 * Return newsletter content for the visual editor.
 * If bodyJson exists, returns it (editor loads TipTap JSON).
 * Also returns all metadata fields for the metadata panel.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> },
) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const password = authHeader.replace('Bearer ', '');
  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { number: numStr } = await params;
  const num = parseInt(numStr, 10);
  if (isNaN(num) || num < 1) {
    return NextResponse.json({ error: 'Invalid newsletter number' }, { status: 400 });
  }

  try {
    const newsletter = await getDbNewsletterIssueFull(num);
    if (!newsletter) {
      return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 });
    }

    return NextResponse.json({
      number: newsletter.number,
      subject: newsletter.subject,
      preview: newsletter.preview,
      slug: newsletter.slug,
      description: newsletter.description,
      postscripts: newsletter.rawPs,
      bodyJson: newsletter.bodyJson,
      bodyHtml: newsletter.bodyHtml,
      updatedAt: newsletter.updatedAt,
      createdAt: newsletter.createdAt,
    });
  } catch (error) {
    console.error(`[admin/newsletters/${num}] Error:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/newsletters/[number]
 *
 * Save editor content (TipTap JSON + pre-rendered HTML) and metadata.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> },
) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const password = authHeader.replace('Bearer ', '');
  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { number: numStr } = await params;
  const num = parseInt(numStr, 10);
  if (isNaN(num) || num < 1) {
    return NextResponse.json({ error: 'Invalid newsletter number' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const {
      bodyJson,
      bodyHtml,
      subject,
      preview,
      slug,
      description,
      postscripts,
      expectedUpdatedAt,
      expectedCreatedAt,
    } = body;

    if (!bodyJson || !bodyHtml) {
      return NextResponse.json(
        { error: 'bodyJson and bodyHtml are required' },
        { status: 400 },
      );
    }

    const result = await updateNewsletterIssue(num, {
      bodyJson,
      bodyHtml,
      subject,
      preview,
      slug,
      description,
      postscripts,
    }, { updatedAt: expectedUpdatedAt, createdAt: expectedCreatedAt });

    if (result !== 'conflict' && 'movedTo' in result) {
      return NextResponse.json(
        {
          error: result.movedTo === null
            ? 'This newsletter was deleted'
            : `This newsletter is now #${result.movedTo}`,
          movedTo: result.movedTo,
        },
        { status: 409 },
      );
    }

    if (result === 'conflict') {
      return NextResponse.json(
        { error: 'Conflict: newsletter was modified by another session' },
        { status: 409 },
      );
    }

    return NextResponse.json({ ok: true, updatedAt: result.updatedAt });
  } catch (error) {
    console.error(`[admin/newsletters/${num}] PUT error:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/newsletters/[number]
 *
 * Delete an unsent newsletter issue; later issues are renumbered down by one.
 * Returns 409 if this issue (or a later one) has sends or schedule history.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> },
) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const password = authHeader.replace('Bearer ', '');
  if (!checkAdminPassword(password)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { number: numStr } = await params;
  const num = parseInt(numStr, 10);
  if (isNaN(num) || num < 1) {
    return NextResponse.json({ error: 'Invalid newsletter number' }, { status: 400 });
  }

  try {
    const result = await deleteNewsletterIssue(num);
    if (result === 'not_found') {
      return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 });
    }
    if (result !== 'deleted') {
      return NextResponse.json({ error: result.blocked }, { status: 409 });
    }
    clearNewsletterIssueCache();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(`[admin/newsletters/${num}] DELETE error:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
