import { prisma } from './prisma'

export async function createNotification({
  userId,
  title,
  body,
}: {
  userId: string
  title: string
  body: string
}): Promise<void> {
  await prisma.notification.create({
    data: { userId, title, body },
  })
}

export async function createNotificationForHouseMembers({
  houseId,
  title,
  body,
  excludeUserId,
}: {
  houseId: string
  title: string
  body: string
  excludeUserId?: string
}): Promise<void> {
  const house = await prisma.house.findUnique({
    where: { id: houseId },
    include: { members: true },
  })

  if (!house) return

  const userIds = new Set<string>()
  userIds.add(house.ownerId)
  house.members.forEach((m) => userIds.add(m.userId))
  if (excludeUserId) userIds.delete(excludeUserId)

  await prisma.notification.createMany({
    data: Array.from(userIds).map((uid) => ({ userId: uid, title, body })),
  })
}
