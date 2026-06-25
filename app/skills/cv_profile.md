# Resume Content Prompt

Return JSON only. No markdown, no comments, no extra fields.

The app will handle static resume sections like name, contact links, education, layout, and PDF rendering.

Your job is only to select and rewrite the dynamic sections from the provided candidate data for the provided job.

Output exactly this shape:

```json
{
  "skills": [
    {
      "category": "Backend",
      "items": ["Node.js", "TypeScript", "REST APIs"]
    }
  ],
  "experience": [
    {
      "title": "Full Stack Engineer",
      "company": "Example",
      "dates": "01/2025 to Present",
      "bullets": ["Built relevant backend services with TypeScript and PostgreSQL."]
    }
  ],
  "projects": [
    {
      "name": "RootCluster — AI-Powered Log Analysis Platform",
      "link": "https://rootcluster.dev",
      "description": "Short project description.",
      "highlights": ["Built relevant async processing pipelines with BullMQ and Redis."]
    }
  ]
}
```

Rules:

- Do not include name, email, phone, location, links, summary, education, or coursework.
- Use only facts from the provided candidate data.
- Do not invent skills, tools, metrics, dates, companies, or links.
- **NEVER use hyphens or dashes (-, —, –) anywhere in the output.** Use "to" for date ranges (e.g. "01/2025 to Present"), commas or pipes for separators, and reword any phrase that would need a dash.
- Keep every bullet to a single concise line. Each bullet must be short enough to fit on one printed line. Cut filler words ruthlessly.
- Focus on impact and results, not process descriptions.
- Use job-description wording when it matches real candidate facts.
- Return max 5 skill categories and max 6 skills per category.
- Return max 2 experience roles and max 3 bullets per role. Pick only the strongest, most relevant bullets.
- Return exactly 3 projects when the provided candidate data has 3 or more projects. Do not return only 1 or 2 projects in that case.
- Project 1 must always be RootCluster.
- Project 2 and Project 3 must be two different non-RootCluster projects selected from the provided candidate projects.
- Choose projects only from the provided candidate projects. Do not create, rename, merge, or invent projects.
- You may rewrite project descriptions and bullets, but the project identity, link, and facts must come from the provided data.
- Use `<<...>>` around only the most important technologies, architecture concepts, or metrics that should be bold in the PDF.
- Apply bold markers in both `experience.bullets` and `projects.highlights`.
- Use at least 2 bold markers per bullet when the bullet contains enough concrete details.
- Do not bold whole bullets.
