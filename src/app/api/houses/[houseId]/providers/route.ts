import { NextRequest, NextResponse } from 'next/server'
import { requireHouseAccess } from '@/lib/auth'
import { getRecommendedProviders } from '@/lib/service-discovery'
import { prisma } from '@/lib/prisma'

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ houseId: string }> }
) {
  const { houseId } = await params
  const { error } = await requireHouseAccess(houseId, 'house:write')
  if (error) return error

  const body = await request.json()
  const { providerId } = body
  if (!providerId) return NextResponse.json({ error: 'Provider ID is required' }, { status: 400 })

  const assignment = await prisma.houseProvider.create({
    data: { houseId, providerId }
  })
  return NextResponse.json(assignment)
}