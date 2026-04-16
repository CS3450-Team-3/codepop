import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const DEFAULT_BACKEND = process.env.BACKEND_URL ?? 'http://backend:9000';

async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const cookieStore = await cookies();
  const selectedBackend =
    cookieStore.get('selected_backend')?.value || DEFAULT_BACKEND;

  const { path } = await params;
  // Next.js catch-all routes strip trailing slashes, but Django needs them
  // (APPEND_SLASH = False on the backend). Re-add the slash if the original
  // request URL ended with one.
  const hadTrailingSlash = request.nextUrl.pathname.endsWith('/');
  const pathStr = path.join('/') + (hadTrailingSlash ? '/' : '');
  const search = request.nextUrl.search;
  const targetUrl = `${selectedBackend}/${pathStr}${search}`;

  const forwardHeaders = new Headers();
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (
      lower !== 'host' &&
      lower !== 'connection' &&
      lower !== 'transfer-encoding'
    ) {
      forwardHeaders.set(key, value);
    }
  });

  const fetchOptions: RequestInit & { duplex?: string } = {
    method: request.method,
    headers: forwardHeaders,
    redirect: 'follow',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const body = await request.arrayBuffer();
    if (body.byteLength > 0) {
      fetchOptions.body = body;
    }
  }

  try {
    const upstream = await fetch(targetUrl, fetchOptions as RequestInit);

    const responseHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (lower === 'transfer-encoding') return;
      if (lower === 'set-cookie') {
        // Rewrite cookie to work from the frontend origin
        const rewritten = value
          .replace(/;\s*domain=[^;,]*/gi, '')
          .replace(/;\s*secure/gi, '')
          .replace(/;\s*samesite=[^;,]*/gi, '; SameSite=Lax');
        responseHeaders.append('set-cookie', rewritten);
        return;
      }
      responseHeaders.set(key, value);
    });

    const responseBody = await upstream.arrayBuffer();
    return new NextResponse(responseBody, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error('[proxy] upstream error:', err);
    return NextResponse.json(
      { error: 'Proxy upstream unreachable' },
      { status: 502 }
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const HEAD = handler;
export const OPTIONS = handler;
