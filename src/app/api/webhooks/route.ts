import { headers } from 'next/headers'
import { Webhook } from 'svix'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    return new NextResponse('Missing webhook secret', { status: 500 })
  }

  const headerPayload = await headers()

  const svixId = headerPayload.get('svix-id')
  const svixTimestamp = headerPayload.get('svix-timestamp')
  const svixSignature = headerPayload.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new NextResponse('Missing Svix headers', { status: 400 })
  }

  const payload = await req.text()

  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: any

  try {
    evt = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    })
  } catch (err) {
    console.error('Webhook verification failed:', err)
    return new NextResponse('Invalid signature', { status: 400 })
  }

  const eventType = evt.type

  if (eventType === 'user.created') {
    const data = evt.data

    await prisma.user.upsert({
      where: {
        clerkId: data.id,
      },
      update: {},
      create: {
        clerkId: data.id,
        email: data.email_addresses?.[0]?.email_address ?? '',
        fullName:
          `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim() ||
          'Unnamed User',
        profileImage: data.image_url,
        role: 'OWNER',
      },
    })
  }

  if (eventType === 'user.updated') {
    const data = evt.data

    await prisma.user.updateMany({
      where: {
        clerkId: data.id,
      },
      data: {
        email: data.email_addresses?.[0]?.email_address ?? '',
        fullName:
          `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim() ||
          'Unnamed User',
        profileImage: data.image_url,
      },
    })
  }

  if (eventType === 'user.deleted') {
    const data = evt.data

    if (data?.id) {
      await prisma.user.deleteMany({
        where: {
          clerkId: data.id,
        },
      })
    }
  }

  return NextResponse.json({
    success: true,
  })
}