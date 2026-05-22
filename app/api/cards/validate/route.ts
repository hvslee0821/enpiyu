import { NextRequest, NextResponse } from 'next/server';
import { verifySignature, type CardPayload } from '@/lib/cardSign';
import { rateLimitCardValidate } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    const rl = rateLimitCardValidate(request);
    if (!rl.allowed) {
      return NextResponse.json(
        { valid: false, error: 'Too many requests' },
        { status: 429, headers: rl.retryAfter ? { 'Retry-After': String(rl.retryAfter) } : undefined }
      );
    }

    if (!process.env.CARD_SIGNING_SECRET) {
      return NextResponse.json({ valid: true }); // allow when not configured (dev)
    }

    let body: { payload?: CardPayload; signature?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ valid: false }, { status: 400 });
    }
    const { payload, signature } = body;
    if (!payload || typeof payload !== 'object' || !signature || typeof signature !== 'string') {
      return NextResponse.json({ valid: false }, { status: 400 });
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

    const valid = verifySignature(normalized, signature);
    return NextResponse.json({ valid });
  } catch (e) {
    console.error('Card validate error:', e);
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
