import { Injectable } from "@nestjs/common";
import { UserProfileRepository, UserAnswersRepository } from "../database/repositories";

@Injectable()
export class ProfileService {
  constructor(
    private readonly profile: UserProfileRepository,
    private readonly answers: UserAnswersRepository,
  ) {}

  getProfile() {
    return this.profile.get();
  }

  async upsertProfile(data: Record<string, unknown>) {
    await this.profile.upsert(data);
    return this.profile.get();
  }

  getAnswers() {
    return this.answers.getAll();
  }

  getAnswer(id: string) {
    return this.answers.getById(id);
  }

  async createAnswer(input: { category: string; question: string; answer: string; tagsJson?: string }) {
    const id = await this.answers.create(input);
    return this.answers.getById(id);
  }

  updateAnswer(id: string, data: Record<string, unknown>) {
    return this.answers.update(id, data);
  }

  deleteAnswer(id: string) {
    return this.answers.delete(id);
  }
}
