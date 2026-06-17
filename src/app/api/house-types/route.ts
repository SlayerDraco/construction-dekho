import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const types = await prisma.houseType.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(types)
}
