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
  getAll(): UserAnswerRow[] {
    return this.db.select().from(userAnswers).orderBy(desc(userAnswers.createdAt)).all() as UserAnswerRow[];
  }

  getByCategory(category: string): UserAnswerRow[] {
    return this.db.select().from(userAnswers)
      .where(eq(userAnswers.category, category))
      .orderBy(desc(userAnswers.createdAt))
      .all() as UserAnswerRow[];
  }

  getById(id: string): UserAnswerRow | undefined {
    return this.db.select().from(userAnswers).where(eq(userAnswers.id, id)).get() as UserAnswerRow | undefined;
  }

  create(input: CreateUserAnswerInput): string {
    const id = `ans_${shortId()}`;
    const now = new Date().toISOString();
    this.db.insert(userAnswers).values({
      id,
      category: input.category,
      question: input.question,
      answer: input.answer,
      tagsJson: input.tagsJson ?? "[]",
      createdAt: now,
      updatedAt: now,
    }).run();
    return id;
  }

  update(id: string, input: Partial<CreateUserAnswerInput>): void {
    const updates: Record<string, any> = { ...input, updatedAt: new Date().toISOString() };
    Object.keys(updates).forEach((k) => { if (updates[k] === undefined) delete updates[k]; });
    this.db.update(userAnswers).set(updates).where(eq(userAnswers.id, id)).run();
  }

  delete(id: string): void {
    this.db.delete(userAnswers).where(eq(userAnswers.id, id)).run();
  }
}

function shortId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`.slice(0, 12);
}
