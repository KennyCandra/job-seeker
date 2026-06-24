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
      "title": "Full-Stack Engineer",
      "company": "Example",
      "dates": "01/2025 - Present",
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
- Keep bullets short, direct, and ATS-friendly.
- Use job-description wording when it matches real candidate facts.
- Return max 5 skill categories and max 6 skills per category.
- Return max 2 experience roles and max 4 bullets per role.
- Return exactly 2 projects when source data allows it.
- Project 1 must always be RootCluster.
- Project 2 should be the best matching non-RootCluster project.
- Choose projects only from the provided candidate projects. Do not create, rename, merge, or invent projects.
- You may rewrite project descriptions and bullets, but the project identity, link, and facts must come from the provided data.
- Use `<<...>>` around only the most important technologies, architecture concepts, or metrics that should be bold in the PDF.
- Apply bold markers in both `experience.bullets` and `projects.highlights`.
- Use at least 2 bold markers per bullet when the bullet contains enough concrete details.
- Do not bold whole bullets.
