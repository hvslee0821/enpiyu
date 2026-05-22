import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, CODES_COLLECTION, type CodeDoc } from '@/lib/mongodb';
import { rateLimitVerify } from '@/lib/rateLimit';
import { createSignToken } from '@/lib/cardSign';

export async function POST(request: NextRequest) {
  try {
    const rl = rateLimitVerify(request);
    if (!rl.allowed) {
      return NextResponse.json(
        { valid: false, error: 'Too many attempts. Try again later.' },
        { status: 429, headers: rl.retryAfter ? { 'Retry-After': String(rl.retryAfter) } : undefined }
      );
    }

    let body: { code?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ valid: false, error: 'Invalid request' }, { status: 400 });
    }
    const { code } = body;

    const normalized = typeof code === 'string' ? code.trim().replace(/\D/g, '') : '';
    if (normalized.length !== 6) {
      return NextResponse.json({ valid: false, error: 'Invalid code format' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const coll = db.collection<CodeDoc>(CODES_COLLECTION);

    const result = await coll.findOneAndUpdate(
      { code: normalized, status: 'active' },
      { $set: { status: 'used' as const } },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ valid: false, error: 'Code not found or already used' }, { status: 404 });
    }

    let signToken: string | undefined;
    if (process.env.CARD_SIGNING_SECRET) {
      try {
        signToken = createSignToken();
      } catch {
        // CARD_SIGNING_SECRET not set in dev; still return valid
      }
    }
    return NextResponse.json({ valid: true, signToken });
  } catch (e) {
    console.error('Verify code error:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
