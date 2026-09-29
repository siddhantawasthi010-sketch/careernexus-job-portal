import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';

interface ConnectRequest {
  headers: { authorization?: string };
  body?: { email?: string };
  query?: { email?: string };
}

@Injectable()
export class ConnectTokenGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<ConnectRequest>();
    const authorization = request.headers.authorization || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    const tokenEmail = token ? this.authService.getEmailFromAccessToken(token) : null;
    const requestedEmail = request.body?.email || request.query?.email;
    if (!tokenEmail || typeof requestedEmail !== 'string' || tokenEmail !== requestedEmail.trim().toLowerCase()) {
      throw new UnauthorizedException('A valid signed-in session is required for Connect.');
    }
    return true;
  }
}