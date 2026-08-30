import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, apiResponse, apiError } from '@/lib/api-helpers'
import { KYCStatus, KYCLevel } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    await requireRole('KYC_OFFICER', 'ADMIN', 'SUPER_ADMIN')

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const status = searchParams.get('status') || 'PENDING'

    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (status) {
      where.status = status
    }

    const [documents, total] = await Promise.all([
      db.kYCDocument.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.kYCDocument.count({ where }),
    ])

    return apiResponse({
      documents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return apiError('Unauthorized', 401)
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return apiError('Forbidden', 403)
    }
    console.error('Get admin KYC error:', error)
    return apiError('Internal server error', 500)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const adminUser = await requireRole('KYC_OFFICER', 'ADMIN', 'SUPER_ADMIN')

    const body = await request.json()
    const { documentId, action, rejectionReason } = body

    if (!documentId || !action) {
      return apiError('Document ID and action are required')
    }

    const document = await db.kYCDocument.findUnique({
      where: { id: documentId },
    })

    if (!document) {
      return apiError('KYC document not found', 404)
    }

    if (document.status !== 'PENDING') {
      return apiError('This document has already been reviewed')
    }

    if (action === 'approve') {
      await db.$transaction(async (tx) => {
        await tx.kYCDocument.update({
          where: { id: documentId },
          data: {
            status: KYCStatus.APPROVED,
            reviewedBy: adminUser.id,
            reviewedAt: new Date(),
          },
        })

        const approvedCount = await tx.kYCDocument.count({
          where: { userId: document.userId, status: KYCStatus.APPROVED },
        })

        let newKycLevel: KYCLevel = 'BASIC'
        if (approvedCount >= 2) {
          newKycLevel = 'INTERMEDIATE'
        }
        if (approvedCount >= 3) {
          newKycLevel = 'ADVANCED'
        }

        const profile = await tx.profile.findUnique({
          where: { userId: document.userId },
        })

        if (profile) {
          await tx.profile.update({
            where: { userId: document.userId },
            data: {
              kycLevel: newKycLevel,
            },
          })
        }

        await tx.notification.create({
          data: {
            userId: document.userId,
            type: 'KYC',
            title: 'KYC Verification Approved',
            message: `Your ${document.docType.replace('_', ' ')} document has been verified successfully. Your KYC level is now ${newKycLevel}.`,
          },
        })
      })

      return apiResponse({ message: 'KYC document approved successfully' })
    }

    if (action === 'reject') {
      if (!rejectionReason) {
        return apiError('Rejection reason is required')
      }

      await db.$transaction(async (tx) => {
        await tx.kYCDocument.update({
          where: { id: documentId },
          data: {
            status: KYCStatus.REJECTED,
            reviewedBy: adminUser.id,
            reviewedAt: new Date(),
            rejectionReason,
          },
        })

        await tx.notification.create({
          data: {
            userId: document.userId,
            type: 'KYC',
            title: 'KYC Verification Rejected',
            message: `Your ${document.docType.replace('_', ' ')} document has been rejected. Reason: ${rejectionReason}. Please submit a new document for verification.`,
          },
        })
      })

      return apiResponse({ message: 'KYC document rejected successfully' })
    }

    return apiError('Invalid action. Use "approve" or "reject"')
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return apiError('Unauthorized', 401)
    }
    if (error instanceof Error && error.message === 'Forbidden') {
      return apiError('Forbidden', 403)
    }
    console.error('Update admin KYC error:', error)
    return apiError('Internal server error', 500)
  }
}