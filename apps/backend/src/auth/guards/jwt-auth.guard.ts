import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Named JWT guard so controllers and focused permission tests share a stable token. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
