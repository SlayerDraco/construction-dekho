import { NextRequest, NextResponse } from 'next/server'
import { requireHouseAccess } from '@/lib/auth'
import { getRecommendedProviders } from '@/lib/service-discovery'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ houseId: string }> }
) {
  const { houseId } = await params
  const { error } = await requireHouseAccess(houseId, 'house:read')
  if (error) return error

  const providers = await getRecommendedProviders(houseId)
  return NextResponse.json(providers)
}
