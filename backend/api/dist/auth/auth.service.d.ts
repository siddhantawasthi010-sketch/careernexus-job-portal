export declare class AuthService {
    login(email: string, password: string): {
        accessToken: string;
        user: {
            id: number;
            name: string;
            email: string;
            role: string;
        };
    };
}
