import { ConnectService } from './connect.service';
export declare class ConnectController {
    private readonly connectService;
    constructor(connectService: ConnectService);
    search(email: string, role: string, query: string): Promise<any[]>;
    getOverview(email: string): Promise<{
        incoming: any[];
        outgoing: any[];
        connections: any[];
    }>;
    sendRequest(body: {
        email: string;
        targetEmail: string;
    }): Promise<{
        request: import("../database/database.service").ConnectionRequestRecord;
        state: "connected";
    } | {
        request: import("../database/database.service").ConnectionRequestRecord;
        state: "sent" | "received";
    }>;
    respond(requestId: string, body: {
        email: string;
        status: string;
    }): Promise<import("../database/database.service").ConnectionRequestRecord>;
}
