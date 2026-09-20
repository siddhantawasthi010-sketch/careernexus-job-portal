import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(body: {
        email: string;
        password: string;
    }): {
        accessToken: string;
        user: {
            id: number;
            name: string;
            email: string;
            role: string;
        };
    };
}
