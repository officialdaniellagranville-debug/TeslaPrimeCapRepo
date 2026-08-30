import { cookies } from 'next/headers'
import { verifyToken } from './auth'
import { db } from './db'

export function apiResponse(data: unknown, status = 200) {
  return Response.json(data, { status })
}

export function apiError(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}

export async function getSessionUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value
  if (!token) return null
  const payload = verifyToken(token)
  if (!payload) return null
  const user = await db.user.findUnique({
    where: { id: payload.userId as string },
    include: { profile: true, wallets: true }
  })
  return user
}

export async function requireAuth() {
  const user = await getSessionUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

export async function requireRole(...roles: string[]) {
  const user = await requireAuth()
  if (!roles.includes(user.role)) throw new Error('Forbidden')
  return user
}