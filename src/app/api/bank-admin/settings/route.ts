import { db } from '@/lib/db';
import { requireRole, apiResponse, apiError } from '@/lib/api-helpers';
import { NextRequest } from 'next/server';

async function getHandler(_request: NextRequest) {
  try {
    let s = await db.siteSettings.findUnique({ where: { id: 'main' } });
    if (!s) s = await db.siteSettings.create({ data: { id: 'main' } });
    return apiResponse(s);
  } catch (error) {
    console.error('Admin get settings error:', error);
    return apiError('Failed to get settings', 'INTERNAL_ERROR', 500);
  }
}

async function putHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const updateData: Record<string, any> = {};
    const allStringFields = [
      'heroTitle','heroSubtitle','heroCtaText','heroCtaLink',
      'statCustomers','statAssets','statUptime','statSupport',
      'routingNumber','branchHours',
      'savingsRate','certificateRate','creditCardRate','loanRate',
      'aboutTitle','aboutMission','aboutFounded','aboutMembers','aboutAssetsValue','aboutBranches',
      'contactAddress','contactPhone','contactEmail','contactHours','contactIntlPhone',
      'dashChecking','dashSavings','dashCreditCard','dashInvestments',
      'heroBgUrl','aboutPhotoUrl','logoUrl',
      'servicesJson','testimonialsJson','faqJson',
    ];
    for (const key of allStringFields) {
      if (body[key] !== undefined) updateData[key] = String(body[key]);
    }
    if (Object.keys(updateData).length === 0) return apiError('No fields', 'BAD_REQUEST');
    await db.siteSettings.upsert({
      where: { id: 'main' }, update: updateData,
      create: { id: 'main', ...updateData },
    });
    return apiResponse({ updated: true });
  } catch (error) {
    console.error('Admin update error:', error);
    return apiError('Failed to update', 'INTERNAL_ERROR', 500);
  }
}

export const GET = requireRole('SUPER_ADMIN', 'ADMIN')(getHandler);
export const PUT = requireRole('SUPER_ADMIN', 'ADMIN')(putHandler);
