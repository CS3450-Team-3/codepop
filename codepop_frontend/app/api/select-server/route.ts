import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: { serverUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { serverUrl } = body;

  if (!serverUrl) {
    return NextResponse.json({ error: 'serverUrl required' }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true, serverUrl });

  // Cookie read by /api/proxy/[...path] on every API request
  response.cookies.set('selected_backend', serverUrl, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });

  return response;
}
