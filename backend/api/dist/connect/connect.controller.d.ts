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
    cancelRequest(requestId: string, email: string): Promise<{
        id: any;
        state: "cancelled";
    }>;
    getReferrals(email: string): Promise<{
        id: any;
        job: any;
        referrer: import("../database/database.service").ConnectPersonRecord;
        createdAt: any;
    }[]>;
    sendReferral(body: {
        email: string;
        targetEmail: string;
        job: Record<string, unknown>;
    }): Promise<{
        id: any;
        createdAt: any;
    }>;
    removeConnection(targetEmail: string, email: string): Promise<{
        id: any;
        status: "removed";
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
    sendMessage(body: {
        email: string;
        targetEmail: string;
        body: string;
        job?: Record<string, unknown>;
    }): Promise<{
        id: any;
        createdAt: any;
    }>;
    approveMessages(candidateEmail: string, body: {
        email: string;
    }): Promise<{
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
