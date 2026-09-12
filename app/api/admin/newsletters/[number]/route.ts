import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword } from '@/lib/admin-auth';
import { getDbNewsletterFull, updateNewsletter } from '@/lib/db';

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
    const newsletter = await getDbNewsletterFull(num);
    if (!newsletter) {
      return NextResponse.json({ error: 'Newsletter not found' }, { status: 404 });
    }

    return NextResponse.json({
      number: newsletter.number,
      subject: newsletter.subject,
      preview: newsletter.preview,
      slug: newsletter.slug,
      description: newsletter.description,
      image: newsletter.rawImage,
      postscripts: newsletter.rawPs,
      bodyJson: newsletter.bodyJson,
      bodyHtml: newsletter.bodyHtml,
      bodyMarkdown: newsletter.bodyMarkdown,
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
      image,
      postscripts,
    } = body;

    if (!bodyJson || !bodyHtml) {
      return NextResponse.json(
        { error: 'bodyJson and bodyHtml are required' },
        { status: 400 },
      );
    }

    await updateNewsletter(num, {
      bodyJson,
      bodyHtml,
      subject,
      preview,
      slug,
      description,
      image,
      postscripts,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(`[admin/newsletters/${num}] PUT error:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
