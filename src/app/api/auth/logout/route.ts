import { withApiLogging } from '@/lib/logger';
import { NextResponse } from 'next/server';

/**
 * Logout server-side: menghapus cookie token httpOnly.
 * Cookie httpOnly tidak dapat dihapus oleh JavaScript klien, sehingga
 * logout WAJIB dilakukan lewat endpoint ini — jika tidak, sesi tetap aktif.
 */
async function POSTHandler() {
  try {
    const response = NextResponse.json({ ok: true });
    response.cookies.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
    return response;
  } catch (error) {
    console.error('[api/auth/logout]', error);
    return NextResponse.json({ error: 'Terjadi kesalahan internal' }, { status: 500 });
  }
}

// Terbungkus withApiLogging (audit R-08): request-id, log terstruktur, metrik latensi.
export const POST = withApiLogging(POSTHandler, 'POST /auth/logout');
