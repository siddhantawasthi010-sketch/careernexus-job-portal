import { DatabaseService } from '../database/database.service';
export declare class ConnectService {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    search(email: string, role: string, query: string): Promise<any[]>;
    getOverview(email: string): Promise<{
        incoming: any[];
        outgoing: any[];
        connections: any[];
    }>;
    sendRequest(email: string, targetEmail: string): Promise<{
        request: import("../database/database.service").ConnectionRequestRecord;
        state: "connected";
    } | {
        request: import("../database/database.service").ConnectionRequestRecord;
        state: "sent" | "received";
    }>;
    respond(email: string, requestId: string, status: string): Promise<import("../database/database.service").ConnectionRequestRecord>;
}
