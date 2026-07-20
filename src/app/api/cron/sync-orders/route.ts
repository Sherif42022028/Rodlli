import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { syncMerchantOrders } from '@/lib/google-sheets'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Validate CRON_SECRET header / query param
  const authHeader = request.headers.get('authorization')
  const { searchParams } = new URL(request.url)
  const querySecret = searchParams.get('secret')

  const expectedSecret = process.env.CRON_SECRET
  if (expectedSecret) {
    const isHeaderValid = authHeader === `Bearer ${expectedSecret}`
    const isQueryValid = querySecret === expectedSecret
    if (!isHeaderValid && !isQueryValid) {
      return NextResponse.json({ error: 'Unauthorized cron access' }, { status: 401 })
    }
  }

  try {
    // Find all merchants with active orders sheet sync enabled
    const result = await db.execute(
      sql`SELECT id, business_name FROM merchants 
          WHERE (orders_sync_enabled = true OR sheet_sync_enabled = true)
            AND (orders_sheet_id IS NOT NULL OR google_sheet_id IS NOT NULL)
            AND google_refresh_token IS NOT NULL`
    )

    const merchants = result.rows as unknown as Array<{ id: string; business_name: string }>
    if (!merchants || merchants.length === 0) {
      return NextResponse.json({ message: 'No merchants active for orders sync', processed: 0 })
    }

    const summary: Array<{ merchantId: string; name: string; result: any }> = []

    for (const merchant of merchants) {
      const syncResult = await syncMerchantOrders(merchant.id)
      summary.push({
        merchantId: merchant.id,
        name: merchant.business_name,
        result: syncResult
      })
    }

    return NextResponse.json({
      message: 'Orders sync cron executed successfully',
      timestamp: new Date().toISOString(),
      totalMerchants: merchants.length,
      summary
    })
  } catch (error: any) {
    console.error('Cron sync-orders error:', error)
    return NextResponse.json({ error: error.message || 'Cron sync orders failed' }, { status: 500 })
  }
}
