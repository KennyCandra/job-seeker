const BASE = process.env.SMOKE_URL || "http://127.0.0.1:3000";

async function check(name: string, path: string, expectStatus = 200): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}${path}`);
    const ok = res.status === expectStatus;
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}  [${res.status}] ${path}`);
    return ok;
  } catch (err: any) {
    console.log(`FAIL  ${name}  [ERR] ${path} -> ${err?.message ?? err}`);
    return false;
  }
}

async function main() {
  let pass = 0;
  let fail = 0;
  const inc = (b: boolean) => (b ? pass++ : fail++);

  inc(await check("health", "/health"));
  inc(await check("stats", "/api/stats"));
  inc(await check("config", "/api/config"));
  inc(await check("tasks-list", "/api/tasks"));
  inc(await check("jobs-list", "/api/jobs?limit=1"));
  inc(await check("applications-list", "/api/applications"));
  inc(await check("saved-jobs", "/api/saved-jobs"));
  inc(await check("companies", "/api/companies"));
  inc(await check("profile", "/api/profile"));
  inc(await check("shortlist", "/api/shortlist"));
  inc(await check("404-unknown", "/api/does-not-exist", 404));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
