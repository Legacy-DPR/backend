import { StatusCodes } from 'http-status-codes';

import type { ErrorRequestHandler, RequestHandler } from 'express';

const unexpectedRequest: RequestHandler = (_req, res) => {
    res.sendStatus(StatusCodes.NOT_FOUND);
};

const addErrorToRequestLog: ErrorRequestHandler = (err, _req, res, next) => {
    res.locals.err = err;
    next(err);
};

export default () => [unexpectedRequest, addErrorToRequestLog];
