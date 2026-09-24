import { DatabaseService } from '../database/database.service';
export declare class CoursesService {
    private readonly databaseService;
    constructor(databaseService: DatabaseService);
    getCourses(): Promise<import("../database/database.service").CourseRecord[]>;
}
