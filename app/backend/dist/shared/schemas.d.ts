import { z } from "zod";
export declare const resumeSchema: z.ZodObject<{
    experience: z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        company: z.ZodString;
        dates: z.ZodString;
        bullets: z.ZodArray<z.ZodString>;
    }, z.core.$strip>>;
    skills: z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodArray<z.ZodObject<{
        category: z.ZodString;
        items: z.ZodArray<z.ZodString>;
    }, z.core.$strip>>]>;
    projects: z.ZodOptional<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        link: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        highlights: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const applicationSchema: z.ZodObject<{
    cover_letter: z.ZodString;
    email_subject: z.ZodString;
    email_body: z.ZodString;
}, z.core.$strip>;
