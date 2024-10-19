import { getServiceClientBySecretToken } from '@/repositories/service-client-repository';

export async function checkIfServiceClientSecretTokenValid(
    secretToken: string,
) {
    const serviceClient = await getServiceClientBySecretToken(secretToken);

    return !!serviceClient;
}
