import { NextRequest, NextResponse } from 'next/server';
import { verifySignToken, signPayload, type CardPayload } from '@/lib/cardSign';
import { rateLimitCardSign } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    const rl = rateLimitCardSign(request);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: rl.retryAfter ? { 'Retry-After': String(rl.retryAfter) } : undefined }
      );
    }

    if (!process.env.CARD_SIGNING_SECRET) {
      return NextResponse.json({ error: 'Signing not configured' }, { status: 503 });
    }

    let body: { signToken?: string; payload?: CardPayload };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const { signToken, payload } = body;
    if (!signToken || !payload || typeof payload !== 'object') {
      return NextResponse.json({ error: 'signToken and payload required' }, { status: 400 });
    }

    if (!verifySignToken(signToken)) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const normalized: CardPayload = {
      text1: String(payload.text1 ?? ''),
      text2: String(payload.text2 ?? ''),
      text3: String(payload.text3 ?? ''),
      text4: String(payload.text4 ?? ''),
      text5: String(payload.text5 ?? ''),
      text6: String(payload.text6 ?? ''),
      text7: String(payload.text7 ?? ''),
      text8: String(payload.text8 ?? ''),
      uploadedImage: payload.uploadedImage != null ? String(payload.uploadedImage) : null,
      userName: String(payload.userName ?? ''),
    };

    const signature = signPayload(normalized);
    return NextResponse.json({ signature });
  } catch (e) {
    console.error('Card sign error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
