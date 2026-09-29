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
    cancelRequest(email: string, requestId: string): Promise<{
        id: any;
        state: "cancelled";
    }>;
    getReferrals(email: string): Promise<{
        id: any;
        job: any;
        referrer: import("../database/database.service").ConnectPersonRecord;
        createdAt: any;
    }[]>;
    sendReferral(email: string, targetEmail: string, job: Record<string, unknown>): Promise<{
        id: any;
        createdAt: any;
    }>;
    removeConnection(email: string, targetEmail: string): Promise<{
        id: any;
        status: "removed";
    }>;
    sendMessage(email: string, targetEmail: string, body: string, job?: Record<string, unknown>): Promise<{
        id: any;
        createdAt: any;
    }>;
    getMessages(email: string): Promise<{
        id: any;
        sender: import("../database/database.service").ConnectPersonRecord;
        recipient: import("../database/database.service").ConnectPersonRecord;
        body: any;
        job: any;
        createdAt: any;
        readAt: any;
        isReceived: boolean;
        permissionStatus: any;
    }[]>;
    approveMessages(email: string, candidateEmail: string): Promise<{
        candidateEmail: any;
        status: any;
    }>;
    getNotifications(email: string): Promise<{
        [key: string]: unknown;
        id: string;
        type: string;
        title: string;
        description: string;
        createdAt: string;
    }[]>;
}
