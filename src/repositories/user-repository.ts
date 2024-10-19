import { prisma } from '@/lib/db-client';

export async function findUserByTelegramId(telegramId: string) {
    return prisma.user.findUnique({
        where: { telegramId },
        include: { userDetails: true },
    });
}
