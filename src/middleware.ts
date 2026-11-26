import { NextResponse, type NextRequest } from 'next/server';

const LOCALES = ['fr', 'en'];
const PUBLIC_FILE = /\.[a-zA-Z0-9]+$/;

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || PUBLIC_FILE.test(pathname)) return NextResponse.next();

  const headers = new Headers(req.headers);
  const cookieLocale = req.cookies.get('edl_locale')?.value;
  const preferred = cookieLocale && LOCALES.includes(cookieLocale) ? cookieLocale : (req.headers.get('accept-language') ?? '').toLowerCase().startsWith('en') ? 'en' : 'fr';

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    headers.set('x-locale', preferred);
    const res = NextResponse.next({ request: { headers } });
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
    res.headers.set('Cache-Control', 'private, no-store');
    return res;
  }

  const seg = pathname.split('/')[1];
  if (!LOCALES.includes(seg)) {
    const url = req.nextUrl.clone();
    url.pathname = `/${preferred}${pathname === '/' ? '' : pathname}`;
    url.search = search;
    return NextResponse.redirect(url, 307);
  }

  headers.set('x-locale', seg);
  const res = NextResponse.next({ request: { headers } });
  res.cookies.set('edl_locale', seg, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
  const rest = pathname.split('/')[2] ?? '';
  // private customer pages: never indexed, never publicly cached
  if (['order', 'my-orders', 'track', 'checkout', 'cart'].includes(rest)) {
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
    if (rest !== 'cart' && rest !== 'checkout') res.headers.set('Cache-Control', 'private, no-store');
  }
  return res;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
