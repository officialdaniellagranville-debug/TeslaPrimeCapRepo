import { requireAuth, apiResponse, apiError } from '@/lib/api-helpers'

export async function GET() {
  try {
    const user = await requireAuth()

    const wallet = user.wallets?.find((w) => !w.isDemo) || user.wallets?.[0]

    if (!wallet) {
      return apiError('Wallet not found', 404)
    }

    return apiResponse({
      id: wallet.id,
      balance: wallet.balance,
      currency: wallet.currency,
      isDemo: wallet.isDemo,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return apiError('Unauthorized', 401)
    }
    console.error('Get wallet error:', error)
    return apiError('Internal server error', 500)
  }
}