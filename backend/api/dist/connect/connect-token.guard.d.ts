import { CanActivate, ExecutionContext } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
export declare class ConnectTokenGuard implements CanActivate {
    private readonly authService;
    constructor(authService: AuthService);
    canActivate(context: ExecutionContext): boolean;
}
