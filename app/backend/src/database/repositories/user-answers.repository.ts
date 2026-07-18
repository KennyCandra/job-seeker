import { Injectable } from "@nestjs/common";
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

@Injectable()
export class UserAnswersRepository {
  constructor(private readonly dataSource: DataSource) {}

  async getAll(): Promise<UserAnswerRow[]> {
    const rows = await this.dataSource.query(
      `SELECT id, category, question, answer, tags_json AS "tagsJson", created_at AS "createdAt", updated_at AS "updatedAt" FROM user_answers ORDER BY created_at DESC, id ASC`,
    );
    return rows as UserAnswerRow[];
  }

  async getById(id: string): Promise<UserAnswerRow | undefined> {
    const rows = await this.dataSource.query(
      `SELECT id, category, question, answer, tags_json AS "tagsJson", created_at AS "createdAt", updated_at AS "updatedAt" FROM user_answers WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] as UserAnswerRow | undefined;
  }

  async create(input: { category: string; question: string; answer: string; tagsJson?: string }): Promise<string> {
    const id = `answer_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    await this.dataSource.query(
      `INSERT INTO user_answers (id, category, question, answer, tags_json, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $6)`,
      [id, input.category, input.question, input.answer, input.tagsJson ?? "[]", now],
    );
    return id;
  }

  async update(id: string, data: Record<string, unknown>): Promise<void> {
    const sets: string[] = ["updated_at = $2"];
    const params: unknown[] = [id, new Date().toISOString()];
    let i = 3;
    for (const [k, v] of Object.entries(data)) {
      sets.push(`${toSnake(k)} = $${i++}`);
      params.push(v);
    }
    await this.dataSource.query(`UPDATE user_answers SET ${sets.join(", ")} WHERE id = $1`, params);
  }

  async delete(id: string): Promise<void> {
    await this.dataSource.query(`DELETE FROM user_answers WHERE id = $1`, [id]);
  }
}

function toSnake(k: string): string {
  return k.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase());
}
