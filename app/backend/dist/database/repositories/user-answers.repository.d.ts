import { DataSource } from "typeorm";
export type UserAnswerRow = {
    id: string;
    category: string;
    question: string;
    answer: string;
    tagsJson: string;
    createdAt: string;
    updatedAt: string;
};
export declare class UserAnswersRepository {
    private readonly dataSource;
    constructor(dataSource: DataSource);
    getAll(): Promise<UserAnswerRow[]>;
    getById(id: string): Promise<UserAnswerRow | undefined>;
    create(input: {
        category: string;
        question: string;
        answer: string;
        tagsJson?: string;
    }): Promise<string>;
    update(id: string, data: Record<string, unknown>): Promise<void>;
    delete(id: string): Promise<void>;
}
