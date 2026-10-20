import { NextRequest } from 'next/server';
import { requireAuth, apiResponse, apiError } from '@/lib/api-helpers';

// Cards endpoint — Card model not in schema yet, returns mock data
// When Card model is added to Prisma schema, replace with real DB queries
async function handler(request: NextRequest, _context: any, user: any) {
  if (request.method === 'GET') {
    // Return empty cards list since Card model doesn't exist yet
    return apiResponse([]);
  }

  if (request.method === 'POST') {
    return apiError('Card service is currently unavailable. Please contact support.', 'SERVICE_UNAVAILABLE', 503);
  }

  if (request.method === 'PATCH') {
    return apiError('Card service is currently unavailable. Please contact support.', 'SERVICE_UNAVAILABLE', 503);
  }

  return apiError('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
}

export const GET = requireAuth(handler);
export const POST = requireAuth(handler);
export const PATCH = requireAuth(handler);
