import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, apiResponse, apiError } from '@/lib/api-helpers'

export async function GET() {
  try {
    const user = await requireAuth()

    const documents = await db.kYCDocument.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    const kycLevel = user.profile?.kycLevel || 'NONE'

    return apiResponse({
      kycLevel,
      documents,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return apiError('Unauthorized', 401)
    }
    console.error('Get KYC error:', error)
    return apiError('Internal server error', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { docType, docNumber, frontImage, backImage } = body

    if (!docType || !frontImage) {
      return apiError('Document type and front image are required')
    }

    const validDocTypes = ['PASSPORT', 'DRIVERS_LICENSE', 'NATIONAL_ID', 'UTILITY_BILL', 'SELFIE']
    if (!validDocTypes.includes(docType)) {
      return apiError('Invalid document type')
    }

    const pendingDocs = await db.kYCDocument.count({
      where: { userId: user.id, status: 'PENDING' },
    })

    if (pendingDocs > 0) {
      return apiError('You already have a pending KYC document under review')
    }

    const document = await db.kYCDocument.create({
      data: {
        userId: user.id,
        docType,
        docNumber: docNumber || null,
        frontImage,
        backImage: backImage || null,
        status: 'PENDING',
      },
    })

    await db.notification.create({
      data: {
        userId: user.id,
        type: 'KYC',
        title: 'KYC Document Submitted',
        message: `Your ${docType.replace('_', ' ')} document has been submitted for verification. You will be notified once it is reviewed.`,
      },
    })

    return apiResponse(document, 201)
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return apiError('Unauthorized', 401)
    }
    console.error('Submit KYC error:', error)
    return apiError('Internal server error', 500)
  }
}