import { LibraryService } from './library.service';
export declare class LibraryController {
    private readonly libraryService;
    constructor(libraryService: LibraryService);
    getTopics(): Promise<import("../database/database.service").LibraryTopicRecord[]>;
}
