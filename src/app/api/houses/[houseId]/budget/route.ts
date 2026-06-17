import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireHouseAccess } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'

const createExpenseSchema = z.object({
  category: z.enum(['ELECTRICAL', 'PLUMBING', 'FLOORING', 'PAINTING', 'LABOUR', 'MATERIALS', 'OTHER']),
  amount: z.number().positive().max(100000000),
  notes: z.string().max(500).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ houseId: string }> }
) {
  const { houseId } = await params
  const { error } = await requireHouseAccess(houseId, 'budget:read')
  if (error) return error

  const searchParams = request.nextUrl.searchParams
  const category = searchParams.get('category')

  const where: Record<string, unknown> = { houseId }
  if (category) where.category = category

  const expenses = await prisma.expense.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  // Compute totals by category
  const totals = await prisma.expense.groupBy({
    by: ['category'],
    where: { houseId },
    _sum: { amount: true },
    _count: true,
  })

  const grandTotal = expenses.reduce((sum, e) => sum + e.amount, 0)

  // Get cost estimates for comparison
  const house = await prisma.house.findUnique({
    where: { id: houseId },
    select: { city: true },
  })

  const costEstimates = house
    ? await prisma.costEstimate.findMany({
        where: { city: house.city },
        include: { stage: { select: { name: true } } },
      })
    : []

  return NextResponse.json({
    expenses,
    totals,
    grandTotal,
    costEstimates,
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ houseId: string }> }
) {
  const { houseId } = await params
  const { user, error } = await requireHouseAccess(houseId, 'budget:write')
  if (error) return error

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = createExpenseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const expense = await prisma.expense.create({
    data: {
      houseId,
      category: parsed.data.category,
      amount: parsed.data.amount,
      notes: parsed.data.notes,
    },
  })

  await createAuditLog({
    userId: user!.id,
    houseId,
    action: 'EXPENSE_ADDED',
    entity: 'Expense',
    entityId: expense.id,
    metadata: { category: expense.category, amount: expense.amount },
  })

  return NextResponse.json(expense, { status: 201 })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ houseId: string }> }
) {
  const { houseId } = await params
  const { user, error } = await requireHouseAccess(houseId, 'budget:write')
  if (error) return error

  const searchParams = request.nextUrl.searchParams
  const expenseId = searchParams.get('id')

  if (!expenseId) {
    return NextResponse.json({ error: 'Expense id required' }, { status: 400 })
  }

  const expense = await prisma.expense.findFirst({ where: { id: expenseId, houseId } })
  if (!expense) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
  }

  await prisma.expense.delete({ where: { id: expenseId } })

  return NextResponse.json({ success: true })
}
