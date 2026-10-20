import { NextRequest } from 'next/server';
import { requireAuth, apiResponse, apiError } from '@/lib/api-helpers';
import { db } from '@/lib/db';
import { z } from 'zod';

// GET /api/beneficiaries — List user's saved payment addresses
async function getHandler(_request: NextRequest, _context: any, user: any) {
  try {
    // Return all active payment addresses (these are platform-wide, not per-user)
    const addresses = await db.paymentAddress.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    return apiResponse(addresses);
  } catch (error) {
    console.error('Get beneficiaries error:', error);
    return apiError('Failed to fetch beneficiaries', 'INTERNAL_ERROR', 500);
  }
}

// POST /api/beneficiaries — Add a beneficiary (placeholder - not user-specific in this schema)
async function postHandler(request: NextRequest, _context: any, _user: any) {
  try {
    const body = await request.json();
    const schema = z.object({
      label: z.string().min(1).max(100),
      currency: z.string().min(1).max(50),
      network: z.string().optional(),
      address: z.string().min(1).max(200),
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError('Invalid request data', 'VALIDATION_ERROR', 400);
    }

    const { label, currency, network, address } = parsed.data;

    const result = await db.paymentAddress.create({
      data: {
        label,
        currency,
        network: network || null,
        address,
        isActive: true,
        sortOrder: 0,
      },
    });

    return apiResponse(result, 201);
  } catch (error) {
    console.error('Create beneficiary error:', error);
    return apiError('Failed to create beneficiary', 'INTERNAL_ERROR', 500);
  }
}

export const GET = requireAuth(getHandler);
export const POST = requireAuth(postHandler);
