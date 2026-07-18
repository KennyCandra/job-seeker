import { Controller, Get, Put, Post, Delete, Body, Param } from "@nestjs/common";
import { z } from "zod";
import { ProfileService } from "./profile.service";
import { AppException } from "../common/errors";

const profileSchema = z.object({
  fullName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedin: z.string().optional(),
  portfolio: z.string().optional(),
  github: z.string().optional(),
  headline: z.string().optional(),
  summary: z.string().optional(),
  skillsJson: z.string().optional(),
  experienceJson: z.string().optional(),
  projectsJson: z.string().optional(),
  educationJson: z.string().optional(),
  preferencesJson: z.string().optional(),
});

@Controller("profile")
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Get()
  async get() {
    const profile = await this.profile.getProfile();
    return { ok: true, profile: profile ?? null };
  }

  @Put()
  async put(@Body() body: unknown) {
    const parsed = profileSchema.parse(body);
    const updated = await this.profile.upsertProfile(parsed as Record<string, unknown>);
    return { ok: true, profile: updated };
  }

  @Get("answers")
  async answers() {
    return { ok: true, answers: await this.profile.getAnswers() };
  }

  @Post("answers")
  async createAnswer(@Body() body: { category: string; question: string; answer: string; tagsJson?: string }) {
    if (!body.category || !body.question || !body.answer) {
      throw new AppException(400, "category, question, and answer required");
    }
    const created = await this.profile.createAnswer(body);
    return { ok: true, answer: created };
  }

  @Put("answers/:id")
  async updateAnswer(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    await this.profile.updateAnswer(id, body);
    return { ok: true, answer: await this.profile.getAnswer(id) };
  }

  @Delete("answers/:id")
  async deleteAnswer(@Param("id") id: string) {
    await this.profile.deleteAnswer(id);
    return { ok: true };
  }
}
