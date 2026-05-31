import { z } from "zod";

export const applicationSchema = z.object({
  cover_letter: z.string(),
  email_subject: z.string(),
  email_body: z.string(),
});
