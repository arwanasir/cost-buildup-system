import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

export interface AuditRequest extends Request {
  correlationId?: string;
  clientIp?: string;
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: AuditRequest, res: Response, next: NextFunction) {
    const correlationId =
      req.headers['x-correlation-id'] || crypto.randomUUID();
    req.correlationId = correlationId as string;

    // trust proxy is true, so req.ip is parsed from x-forwarded-for if present
    req.clientIp = req.ip || req.socket?.remoteAddress;

    res.setHeader('X-Correlation-Id', req.correlationId);
    next();
  }
}
