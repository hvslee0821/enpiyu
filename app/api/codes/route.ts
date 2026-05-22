import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, CODES_COLLECTION, type CodeDoc } from '@/lib/mongodb';
import { rateLimitGenerate } from '@/lib/rateLimit';

function generateSixDigitCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(request: NextRequest) {
  try {
    const rl = rateLimitGenerate(request);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Try again later.' },
        { status: 429, headers: rl.retryAfter ? { 'Retry-After': String(rl.retryAfter) } : undefined }
      );
    }

    let body: { adminSecret?: string; count?: number };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { adminSecret, count = 1 } = body;

    const requiredSecret = process.env.CODE_ADMIN_SECRET;
    if (!requiredSecret || adminSecret !== requiredSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const num = Math.min(Math.max(Number(count) || 1, 1), 50);
    const { db } = await connectToDatabase();
    const coll = db.collection<CodeDoc>(CODES_COLLECTION);

    const existing = await coll.find({}).project({ code: 1 }).toArray();
    const existingSet = new Set(existing.map((d) => d.code));

    const toInsert: CodeDoc[] = [];
    let attempts = 0;
    while (toInsert.length < num && attempts < num * 3) {
      attempts++;
      const code = generateSixDigitCode();
      if (existingSet.has(code)) continue;
      existingSet.add(code);
      toInsert.push({
        code,
        status: 'active',
        createdAt: new Date(),
      });
    }

    if (toInsert.length > 0) {
      await coll.insertMany(toInsert);
    }

    const created = toInsert.map((d) => d.code);
    return NextResponse.json({ codes: created, count: created.length });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error('Generate codes error:', err.message, err);
    const message =
      process.env.NODE_ENV === 'development' ? err.message : 'Server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
