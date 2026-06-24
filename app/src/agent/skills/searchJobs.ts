import { join } from "path";
import { writeFile } from "fs";
import { DATA_DIR } from "../../shared/paths";
import { handlePostFetchingJobs } from "../../utils/handlePostFetchingJobs";
import type { AgentSkill } from "../types";

export const searchJobs: AgentSkill = {
  name: "search_jobs",
  description: 'Search Google via SerpAPI using a dork query to find job listings on ATS platforms. Build a query like: site:greenhouse.io "software engineer" SaaS "senior" -principal -staff',
  params: {
    query: {
      type: "string",
      description: "Full Google dork query targeting ATS sites (greenhouse.io, lever.co, ashbyhq.com) with role, seniority, company-type, and location keywords",
    },
  },
  required: ["query"],
  execute: async (args) => {
    const query = args.query as string;
    if (!query) return { type: "error", message: "Provide a dork query." };

    const apiKey = process.env.SERP_API_KEY;
    if (!apiKey) return { type: "error", message: "SERP_API_KEY not configured." };

    try {
      const res = await fetch(
        `https://serpapi.com/search?q=${encodeURIComponent(query)}&api_key=${apiKey}&engine=google`,
        { signal: AbortSignal.timeout(20000) },
      );
      const data = await res.json();
      if (data.error) return { type: "error", message: `API error: ${JSON.stringify(data.error)}` };

      const results = data.organic_results?.map((r: any) => r.link) || [];

      await handlePostFetchingJobs(results);

      if (results.length === 0) return { type: "text", text: "No results found." };

      return {
        type: "text",
        text: `📋 ${data.organic_results?.length || 0} results:\n\n${results.slice(0, 4000).join("\n")}`,
      };
    } catch (err: any) {
      return {
        type: "error",
        message: err.name === "TimeoutError" ? "Search timed out." : `Error: ${err.message}`,
      };
    }
  },
};
