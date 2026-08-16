import { NextRequest, NextResponse } from 'next/server';
import { head, put } from '@vercel/blob';

const JA_CDN_BASE = 'https://cdn.jovianarchive.com/RaveChartGenerator.php';
const BLOB_PREFIX = 'chart-images';
const FETCH_TIMEOUT_MS = 15_000;

export async function GET(request: NextRequest) {
  const timeId = request.nextUrl.searchParams.get('timeId');
  if (!timeId || !/^\d+$/.test(timeId)) {
    return NextResponse.json({ error: 'Missing or invalid timeId parameter' }, { status: 400 });
  }

  const blobPath = `${BLOB_PREFIX}/${timeId}.png`;
  const jaUrl = `${JA_CDN_BASE}?Time=${timeId}`;

  // If BLOB_READ_WRITE_TOKEN is not set (local dev), proxy directly to JA CDN
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return proxyFromCdn(jaUrl);
  }

  // Check cache first
  try {
    const existing = await head(blobPath);
    if (existing) {
      return NextResponse.redirect(existing.url, 302);
    }
  } catch (err: unknown) {
    // head() throws BlobNotFoundError when not found — that's the expected cache miss
    if (err instanceof Error && err.name !== 'BlobNotFoundError') {
      console.error('Blob head() error:', err);
    }
  }

  // Cache miss — fetch from JA CDN
  let imageBuffer: ArrayBuffer;
  let contentType: string;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(jaUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Upstream chart image service unavailable' },
        { status: 502 }
      );
    }

    contentType = response.headers.get('content-type') ?? 'image/png';
    imageBuffer = await response.arrayBuffer();
  } catch {
    // JA CDN is down and we have no cache — nothing we can do
    return NextResponse.json(
      { error: 'Upstream chart image service unavailable' },
      { status: 502 }
    );
  }

  // Store in Vercel Blob
  try {
    const blob = await put(blobPath, imageBuffer, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
    });
    return NextResponse.redirect(blob.url, 302);
  } catch (err) {
    // Blob storage failed but we still have the image in memory — serve it directly
    console.error('Blob put() failed, serving image directly:', err);
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }
}

/** Proxy directly to the JA CDN (used when Blob storage is not configured). */
async function proxyFromCdn(url: string): Promise<NextResponse> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Upstream chart image service unavailable' },
        { status: 502 }
      );
    }

    const contentType = response.headers.get('content-type') ?? 'image/png';
    const body = await response.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Upstream chart image service unavailable' },
      { status: 502 }
    );
  }
}
