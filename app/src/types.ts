export type JobRecord = {
  id: string;
  site: string;
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
  posted_at?: string;
};

export type FilterResult = {
  verdict: "accept" | "reject";
  score: number;
  reasons: string[];
  must_have_hits: string[];
  missing: string[];
};

export type ResumePayload = {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  portfolio?: string;
  experience: Array<{
    title: string;
    company: string;
    dates: string;
    bullets: string[];
  }>;
  skills: string[] | Array<{ category: string; items: string[] }>;
  education: Array<{
    degree: string;
    school: string;
    year: string;
  }>;
  projects?: Array<{
    name: string;
    link?: string;
    description?: string;
    techStack?: string;
    highlights?: string[];
    skillsUsed?: string;
  }>;
};

export type ApplicationPayload = {
  cover_letter: string;
  email_subject: string;
  email_body: string;
};

export type FilteredJob = {
  job: JobRecord;
  filter: FilterResult;
};

export type AppStatus = "ready" | "applied" | "rejected";