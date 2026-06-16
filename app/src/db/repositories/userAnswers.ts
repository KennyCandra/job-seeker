import { eq, desc } from "drizzle-orm";
import { Repository } from "../repository";
import { userAnswers } from "../schema";

export type UserAnswerRow = {
  id: string;
  category: string;
  question: string;
  answer: string;
  tagsJson: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateUserAnswerInput = {
  category: string;
  question: string;
  answer: string;
  tagsJson?: string;
};

export class UserAnswersRepository extends Repository {
  async getAll(): Promise<UserAnswerRow[]> {
    return this.db.select().from(userAnswers).orderBy(desc(userAnswers.createdAt)) as Promise<UserAnswerRow[]>;
  }

  async getByCategory(category: string): Promise<UserAnswerRow[]> {
    return this.db.select().from(userAnswers)
      .where(eq(userAnswers.category, category))
      .orderBy(desc(userAnswers.createdAt)) as Promise<UserAnswerRow[]>;
  }

  async getById(id: string): Promise<UserAnswerRow | undefined> {
    const [row] = await this.db.select().from(userAnswers).where(eq(userAnswers.id, id)).limit(1);
    return row as UserAnswerRow | undefined;
  }

  async create(input: CreateUserAnswerInput): Promise<string> {
    const id = `ans_${shortId()}`;
    const now = new Date().toISOString();
    await this.db.insert(userAnswers).values({
      id,
      category: input.category,
      question: input.question,
      answer: input.answer,
      tagsJson: input.tagsJson ?? "[]",
      createdAt: now,
      updatedAt: now,
    });
    return id;
  }

  async update(id: string, input: Partial<CreateUserAnswerInput>): Promise<void> {
    const updates: Record<string, any> = { ...input, updatedAt: new Date().toISOString() };
    Object.keys(updates).forEach((k) => { if (updates[k] === undefined) delete updates[k]; });
    await this.db.update(userAnswers).set(updates).where(eq(userAnswers.id, id));
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(userAnswers).where(eq(userAnswers.id, id));
  }
}

function shortId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`.slice(0, 12);
}
