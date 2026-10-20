import { NextRequest } from 'next/server';
import { requireAuth, apiResponse } from '@/lib/api-helpers';

// Card tracking endpoint — returns empty list if Card model not available
async function handler(_request: NextRequest, _context: any, _user: any) {
  // Card model not yet in schema — return empty tracking data
  // When cards are implemented, this will query the Card table
  return apiResponse([]);
}

export const GET = requireAuth(handler);
