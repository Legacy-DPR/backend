import { prisma } from '@/lib/db-client';

export async function getServiceClientBySecretToken(secretToken: string) {
    return prisma.serviceClient.findUnique({
        where: {
            secretToken,
        },
    });
}
