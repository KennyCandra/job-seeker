import { join } from "path";
import { companies, jobs } from "../db";
import { DATA_DIR } from "../shared/paths";
import { parseAtsUrl } from "../shared/index";
import { writeFile } from "fs";

export async function handlePostFetchingJobs(links: string[]) {
    console.log(`[handlePostFetchingJobs] Starting with ${links.length} links`);
    for (const [i, link] of links.entries()) {
        console.log(`\n[handlePostFetchingJobs] [${i + 1}/${links.length}] Processing: ${link}`);

        const extracted = parseAtsUrl(link);
        if (!extracted) {
            console.warn(`[handlePostFetchingJobs] ⚠ Could not extract company/jobId from URL — skipping`);
            continue;
        }
        const { slug: companySlug, jobId, ats, endpoint } = extracted;
        if (!jobId) {
            console.warn(`[handlePostFetchingJobs] ⚠ Could not extract jobId from URL — skipping`);
            continue;
        }
        console.log(`[handlePostFetchingJobs] Extracted → company: ${companySlug}, jobId: ${jobId}, ats: ${ats}`);

        const existing = await jobs.instance.get(companySlug, jobId);
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

        if (!(await companies.instance.getBySlug(companySlug))) {
            await companies.instance.save({ name: companySlug, ats, slug: companySlug, endpoint });
            console.log(`[handlePostFetchingJobs] ➕ Added company "${companySlug}" (${ats})`);
        } else {
            console.log(`[handlePostFetchingJobs] Company "${companySlug}" already exists`);
        }

        const company = await companies.instance.getBySlug(companySlug);
        if (!company) {
            console.error(`[handlePostFetchingJobs] ❌ Company "${companySlug}" missing after save`);
            continue;
        }

        await jobs.instance.save({
            id: `${ats === "greenhouse" ? "gh" : ats}-${jobId}`,
            companyId: company.id,
            externalId: jobId,
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
