# Migration Queue TODO

## Goal

When an existing company endpoint stops working, detect whether the company moved to another supported ATS, update the company record, and ingest the response that was already fetched. Do not make a second redundant network request and do not put large ATS responses in Redis.

## Current state

- The dedicated BullMQ queue is `jobs-migrations`.
- The `detect-migration` handler is registered and the migration worker runs.
- Manual jobs complete successfully.
- The handler tries every supported ATS except `prevAts`.
- The handler currently logs responses but always returns `{ detected: false }`.
- A failed `sync-company` task does not yet enqueue a migration job automatically.
- Migration worker logging uses no-op `log` and `progress` callbacks.

Verified test case:

```json
{
  "type": "detect-migration",
  "companySlug": "amplemarket",
  "prevAts": "ashby"
}
```

Expected result: Amplemarket is detected on Greenhouse. Its Greenhouse endpoint returns HTTP 200, while its Lever and Ashby endpoints return HTTP 404.

## Implementation order

### 1. Separate fetching from ingestion

Extract the normalization, classification, and persistence portion of `syncCompany()` into a reusable function. Suggested contract:

```ts
ingestCompanyJobs({
  company,
  ats,
  endpoint,
  rawJobs,
}): Promise<SingleCompanySyncResult>
```

Both normal company sync and migration detection should call this function.

### 2. Return structured fetch results

Migration fetch attempts should return enough information to persist and ingest the result:

```ts
type MigrationMatch = {
  ats: Exclude<AtsPlatform, "custom">;
  endpoint: string;
  rawJobs: RawJob[];
};
```

Validate the expected response shape for each ATS. An HTTP 200 response alone is not sufficient evidence of a match.

### 3. Finish migration detection

For each ATS other than `prevAts`:

1. Build the canonical endpoint.
2. Fetch with a timeout.
3. Validate and parse the response.
4. Stop at the first valid match.
5. Return the detected ATS, endpoint, and fetched jobs.

If none match, return the attempted ATS platforms and keep the company inactive.

### 4. Update the company and reuse the response

After a valid match:

1. Update `ats` and `endpoint`.
2. Reactivate the company.
3. Ingest `rawJobs` using the shared ingestion function.
4. Clear `lastError` and `lastErrorAt`.
5. Update successful-fetch timestamps.

Only mark the migration successful after ingestion succeeds. Do not enqueue the raw response into BullMQ; some company payloads can be tens of megabytes.

Suggested result:

```ts
{
  detected: true,
  ats: "greenhouse",
  endpoint: "https://boards-api.greenhouse.io/v1/boards/amplemarket/jobs?content=true",
  fetched: rawJobs.length,
}
```

### 5. Connect failed sync to migration

When `sync-company` receives a qualifying endpoint failure such as HTTP 404:

1. Record the failure and deactivate the company.
2. Enqueue `detect-migration` with `companySlug` and the current ATS as `prevAts`.
3. Use a deterministic job ID or dedupe key to prevent duplicate migration checks.

Do not enqueue `discover-companies`; discovery is a broad search operation, not a targeted company retry.

### 6. Add operational logging

Record:

- company slug and previous ATS;
- each candidate ATS and endpoint;
- HTTP or validation failure;
- detected ATS and endpoint;
- ingestion counts;
- final no-match result.

Replace the migration worker's no-op logging callbacks or integrate migration jobs with the existing task-run logging model.

## Acceptance test

Enqueue Amplemarket with `prevAts: "ashby"` and verify:

- the task detects Greenhouse;
- only one successful Greenhouse fetch occurs;
- the company row has `ats = greenhouse` and the canonical Greenhouse endpoint;
- the company is active and its previous error is cleared;
- fetched jobs are normalized and persisted;
- the result reports `detected: true` and the ingestion counts;
- no raw ATS payload is stored in Redis.

