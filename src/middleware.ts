import { checkIfServiceClientSecretTokenValid } from '@/services/service-client-service';

// @ts-ignore
import type { NextFunction, Request, Response } from 'express-serve-static-core';

export async function checkIfServiceAuthorized(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    if (req.path.startsWith('/qrcodes')) {
        return next();
    }

    const secretToken = req.headers.authorization;
    if (!secretToken) return res.status(401).send('Not authorized');

    const isValid = await checkIfServiceClientSecretTokenValid(
        secretToken.replace('Bearer ', '').trim(),
    );
    if (!isValid) return res.status(401).send('Not authorized');
    next();
}

