import { NextRequest } from 'next/server';
import { requireAuth, apiResponse, apiError } from '@/lib/api-helpers';
import { rateLimit } from '@/lib/rate-limit';
import { db } from '@/lib/db';
import { z } from 'zod';

const billPaymentSchema = z.object({
  billType: z.string().min(1).max(50),
  accountNumber: z.string().min(1).max(100),
  amount: z.number().positive().max(100000),
  currency: z.string().default('USD'),
});

// POST /api/bills — Pay a bill
async function postHandler(request: NextRequest, _context: any, user: any) {
  const rateLimitResult = await rateLimit(request, true);
  if (rateLimitResult) return rateLimitResult;

  try {
    const body = await request.json();
    const parsed = billPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('Invalid bill payment data', 'VALIDATION_ERROR', 400);
    }

    const { billType, accountNumber, amount, currency } = parsed.data;

    // Get user's active wallet
    const wallet = await db.wallet.findFirst({
      where: { userId: user.id, type: user.activeMode || 'live' },
    });

    if (!wallet) {
      return apiError('No wallet found', 'WALLET_NOT_FOUND', 404);
    }

    if (Number(wallet.balance) < amount) {
      return apiError('Insufficient balance', 'INSUFFICIENT_FUNDS', 400);
    }

    // Create transaction for the bill payment
    const transaction = await db.$transaction(async (tx) => {
      // Deduct from wallet
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: amount } },
      });

      // Create transaction record
      const txn = await tx.transaction.create({
        data: {
          userId: user.id,
          walletId: wallet.id,
          type: 'withdrawal',
          amount,
          currency,
          status: 'completed',
          description: `Bill Payment: ${billType} - ${accountNumber}`,
          reference: `BILL-${Date.now()}`,
        },
      });

      return txn;
    });

    // Create notification
    await db.notification.create({
      data: {
        userId: user.id,
        title: 'Bill Payment Successful',
        body: `${billType} payment of ${currency} ${amount.toFixed(2)} processed successfully.`,
        type: 'transaction',
      },
    }).catch(() => {}); // Non-blocking

    return apiResponse(transaction, 201);
  } catch (error) {
    console.error('Bill payment error:', error);
    return apiError('Failed to process bill payment', 'INTERNAL_ERROR', 500);
  }
}

export const POST = requireAuth(postHandler);
