import { NextResponse } from 'next/server';

/**
 * Blocks debug endpoints in production.
 * Returns a 404 response if NODE_ENV === 'production'.
 * Call at the top of each debug route handler.
 */
export function debugGate() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Not found' } },
      { status: 404 }
    );
  }
  return null;
}
