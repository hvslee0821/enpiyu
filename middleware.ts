import { NextRequest, NextResponse } from 'next/server';

const ADMIN_PATH = process.env.CODE_ADMIN_PATH?.trim();
const SECRET_PATH = '/secret';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (ADMIN_PATH && pathname === `/${ADMIN_PATH}`) {
    return NextResponse.rewrite(new URL(SECRET_PATH, request.url));
  }

  if (ADMIN_PATH && pathname === SECRET_PATH) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/secret'],
};
