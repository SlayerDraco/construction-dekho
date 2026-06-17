import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireHouseAccess } from '@/lib/auth'
import { generateAlertsForHouse, acknowledgeAlert, getActiveAlerts } from '@/lib/alert-engine'
import { createAuditLog } from '@/lib/audit'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ houseId: string }> }
) {
  const { houseId } = await params
  const { error } = await requireHouseAccess(houseId, 'house:read')
  if (error) return error

  const alerts = await getActiveAlerts(houseId)
  return NextResponse.json(alerts)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ houseId: string }> }
) {
  const { houseId } = await params
  const { error } = await requireHouseAccess(houseId, 'house:read')
  if (error) return error

  const searchParams = request.nextUrl.searchParams
  const action = searchParams.get('action')

  if (action === 'refresh') {
    await generateAlertsForHouse(houseId)
    const alerts = await getActiveAlerts(houseId)
    return NextResponse.json(alerts)
  }

  if (action === 'acknowledge') {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const { houseAlertId } = body as { houseAlertId: string }
    if (!houseAlertId) {
      return NextResponse.json({ error: 'houseAlertId required' }, { status: 400 })
    }

    await acknowledgeAlert(houseId, houseAlertId)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
