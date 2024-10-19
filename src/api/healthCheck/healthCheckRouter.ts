import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import express from 'express';
import { z } from 'zod';

import { createApiResponse } from '@/api-docs/openAPIResponseBuilders';
import { ServiceResponse } from '@/common/models/serviceResponse';
import { handleServiceResponse } from '@/common/utils/httpHandlers';

import type { Request, Response, Router } from 'express';

export const healthCheckRegistry = new OpenAPIRegistry();
export const healthCheckRouter: Router = express.Router();

healthCheckRegistry.registerPath({
    method: 'get',
    path: '/health-check',
    tags: ['Health Check'],
    responses: createApiResponse(z.null(), 'Success'),
});

healthCheckRouter.get('/', (_req: Request, res: Response) => {
    const serviceResponse = ServiceResponse.success('Service is healthy', null);
    return handleServiceResponse(serviceResponse, res);
});
