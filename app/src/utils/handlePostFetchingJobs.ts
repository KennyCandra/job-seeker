import { join } from "path";
import { companies, savedJobs } from "../db";
import { DATA_DIR } from "../shared/paths";
import { writeFile } from "fs";

function extractCompanyJobId(link: string): { companySlug: string; jobId: string; ats: string } | null {
    const clean = link.split("?")[0];

    let m = clean.match(/(?:job-)?boards\.([^./]+\.)?greenhouse\.io\/([^/]+)\/jobs\/(\d+)/);
    if (m) return { companySlug: m[2], jobId: m[3], ats: "greenhouse" };

    m = clean.match(/jobs\.lever\.co\/([^/]+)\/([^/]+)/);
    if (m) return { companySlug: m[1], jobId: m[2], ats: "lever" };

    m = clean.match(/jobs\.ashbyhq\.com\/([^/]+)\/([^/]+)/);
    if (m) return { companySlug: m[1], jobId: m[2], ats: "ashby" };

    return null;
}

export async function handlePostFetchingJobs(links: string[]) {
    console.log(`[handlePostFetchingJobs] Starting with ${links.length} links`);
    for (const [i, link] of links.entries()) {
        console.log(`\n[handlePostFetchingJobs] [${i + 1}/${links.length}] Processing: ${link}`);

        const extracted = extractCompanyJobId(link);
        if (!extracted) {
            console.warn(`[handlePostFetchingJobs] ⚠ Could not extract company/jobId from URL — skipping`);
            continue;
        }
        const { companySlug, jobId, ats } = extracted;
        console.log(`[handlePostFetchingJobs] Extracted → company: ${companySlug}, jobId: ${jobId}, ats: ${ats}`);

        const existing = savedJobs.instance.get(companySlug, jobId);
        if (existing) {
            console.log(`[handlePostFetchingJobs] ⏭ Already in DB — skipping`);
            continue;
        }
        console.log(`[handlePostFetchingJobs] Not in DB, fetching page...`);

        const res = await fetch(link, { signal: AbortSignal.timeout(30000) });
        if (!res.ok) {
            console.error(`[handlePostFetchingJobs] ❌ Fetch responded ${res.status} — skipping`);
            continue;
        }
        const text = await res.text();
        console.log(`[handlePostFetchingJobs] ✓ Fetched ${text.length} bytes`);

        if (!companies.instance.getBySlug(companySlug)) {
            const boardUrl = link.split("/jobs/")[0];
            companies.instance.save({ name: companySlug, ats: ats as any, slug: companySlug, boardUrl });
            console.log(`[handlePostFetchingJobs] ➕ Added company "${companySlug}" (${ats})`);
        } else {
            console.log(`[handlePostFetchingJobs] Company "${companySlug}" already exists`);
        }

        savedJobs.instance.save({
            companySlug,
            jobId,
            url: link,
            title: "",
            location: "",
            description: "",
        });
        console.log(`[handlePostFetchingJobs] ✓ Saved job to database`);

        const filePath = join(DATA_DIR, `${companySlug}-${jobId}.html`);
        writeFile(filePath, text, "utf-8", (err) => {
            if (err) console.error(`[handlePostFetchingJobs] ❌ File write error:`, err);
            else console.log(`[handlePostFetchingJobs] ✓ Wrote HTML to ${filePath}`);
        });

        console.log(`[handlePostFetchingJobs] ✅ Done — ${companySlug}/${jobId}`);
    }
    console.log(`\n[handlePostFetchingJobs] Finished processing ${links.length} links`);
};
