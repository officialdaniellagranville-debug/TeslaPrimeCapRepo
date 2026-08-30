import { getSessionUser, apiResponse, apiError } from '@/lib/api-helpers'

export async function GET() {
  try {
    const user = await getSessionUser()

    if (!user) {
      return apiError('Unauthorized', 401)
    }

    return apiResponse({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        referralCode: user.referralCode,
        isDemo: user.isDemo,
        isActive: user.isActive,
        createdAt: user.createdAt,
        profile: user.profile,
        wallets: user.wallets,
      },
    })
  } catch (error) {
    console.error('Get current user error:', error)
    return apiError('Internal server error', 500)
  }
}