import { checkIfServiceClientSecretTokenValid } from '@/services/service-client-service';

import type {
    NextFunction,
    Request,
    Response,
} from 'express-serve-static-core';

export async function checkIfServiceAuthorized(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    const secretToken = req.headers.authorization;
    if (!secretToken) return res.status(401).send('Not authorized');
    const isValid = await checkIfServiceClientSecretTokenValid(
        secretToken.replace('Bearer ', '').trim(),
    );
    if (!isValid) res.status(401).send('Not authorized');
    next();
}

