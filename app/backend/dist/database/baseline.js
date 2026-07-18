"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const fs_1 = require("fs");
const data_source_1 = require("./data-source");
const MANIFEST = [
    {
        table: "companies",
        columns: [
            { column: "id", type: "integer", nullable: false },
            { column: "name", type: "text", nullable: false },
            { column: "slug", type: "text", nullable: false },
            { column: "ats", type: "text", nullable: false },
            { column: "endpoint", type: "text", nullable: false },
            { column: "active", type: "integer", nullable: false, default: "1" },
            { column: "discovered_at", type: "text", nullable: false },
            { column: "last_fetched_at", type: "text", nullable: true },
            { column: "last_successful_fetch_at", type: "text", nullable: true },
            { column: "last_error_at", type: "text", nullable: true },
            { column: "last_error", type: "text", nullable: true },
            { column: "created_at", type: "text", nullable: false },
            { column: "updated_at", type: "text", nullable: false },
        ],
        uniqueIndexes: ["UQ_b28b07d25e4324eee577de5496d"],
    },
    {
        table: "jobs",
        columns: [
            { column: "id", type: "text", nullable: false },
            { column: "company_id", type: "integer", nullable: false },
            { column: "external_id", type: "text", nullable: false },
            { column: "title", type: "text", nullable: false, default: "''::text" },
            { column: "location", type: "text", nullable: false, default: "''::text" },
            { column: "url", type: "text", nullable: false, default: "''::text" },
            { column: "description", type: "text", nullable: false, default: "''::text" },
            { column: "raw_json", type: "text", nullable: false, default: "'{}'::text" },
            { column: "content_hash", type: "text", nullable: false, default: "''::text" },
            { column: "status", type: "text", nullable: false, default: "'open'::text" },
            { column: "first_seen_at", type: "text", nullable: false },
            { column: "last_seen_at", type: "text", nullable: false },
            { column: "closed_at", type: "text", nullable: true },
            { column: "created_at", type: "text", nullable: false },
            { column: "updated_at", type: "text", nullable: false },
        ],
        uniqueIndexes: ["idx_jobs_company_external"],
        foreignKeys: [
            {
                constraint: "FK_jobs_company_id",
                column: "company_id",
                refTable: "companies",
                refColumn: "id",
                onDelete: "CASCADE",
                onUpdate: "CASCADE",
            },
        ],
    },
    {
        table: "job_filters",
        columns: [
            { column: "id", type: "text", nullable: false },
            { column: "job_id", type: "text", nullable: false },
            { column: "content_hash", type: "text", nullable: false, default: "''::text" },
            { column: "verdict", type: "text", nullable: false, default: "'reject'::text" },
            { column: "score", type: "integer", nullable: false, default: "0" },
            { column: "reasons", type: "text", nullable: false, default: "'[]'::text" },
            { column: "must_have_hits", type: "text", nullable: false, default: "'[]'::text" },
            { column: "missing_items", type: "text", nullable: false, default: "'[]'::text" },
            { column: "model", type: "text", nullable: false, default: "''::text" },
            { column: "prompt_version", type: "text", nullable: false, default: "''::text" },
            { column: "created_at", type: "text", nullable: false },
        ],
        foreignKeys: [
            {
                constraint: "FK_job_filters_job_id",
                column: "job_id",
                refTable: "jobs",
                refColumn: "id",
                onDelete: "CASCADE",
                onUpdate: "CASCADE",
            },
        ],
    },
    {
        table: "applications",
        columns: [
            { column: "id", type: "text", nullable: false },
            { column: "job_id", type: "text", nullable: false },
            { column: "status", type: "text", nullable: false, default: "'ready'::text" },
            { column: "score", type: "integer", nullable: false, default: "0" },
            { column: "documents", type: "text", nullable: false, default: "'[]'::text" },
            { column: "notes", type: "text", nullable: false, default: "''::text" },
            { column: "created_at", type: "text", nullable: false },
            { column: "updated_at", type: "text", nullable: false },
        ],
        uniqueIndexes: ["UQ_8aba14d7f098c23ba06d8693235"],
        foreignKeys: [
            {
                constraint: "FK_applications_job_id",
                column: "job_id",
                refTable: "jobs",
                refColumn: "id",
                onDelete: "CASCADE",
                onUpdate: "CASCADE",
            },
        ],
    },
    {
        table: "application_runs",
        columns: [
            { column: "id", type: "text", nullable: false },
            { column: "job_id", type: "text", nullable: false },
            { column: "status", type: "text", nullable: false, default: "'running'::text" },
            { column: "profile_path", type: "text", nullable: false, default: "''::text" },
            { column: "output_dir", type: "text", nullable: false, default: "''::text" },
            { column: "current_url", type: "text", nullable: false, default: "''::text" },
            { column: "error", type: "text", nullable: true },
            { column: "summary", type: "text", nullable: false, default: "'{}'::text" },
            { column: "created_at", type: "text", nullable: false },
            { column: "updated_at", type: "text", nullable: false },
        ],
        foreignKeys: [
            {
                constraint: "FK_application_runs_job_id",
                column: "job_id",
                refTable: "jobs",
                refColumn: "id",
                onDelete: "CASCADE",
                onUpdate: "CASCADE",
            },
        ],
    },
    {
        table: "application_run_steps",
        columns: [
            { column: "id", type: "text", nullable: false },
            { column: "run_id", type: "text", nullable: false },
            { column: "type", type: "text", nullable: false },
            { column: "label", type: "text", nullable: false, default: "''::text" },
            { column: "detail", type: "text", nullable: false, default: "''::text" },
            { column: "screenshot_path", type: "text", nullable: true },
            { column: "payload", type: "text", nullable: false, default: "'{}'::text" },
            { column: "created_at", type: "text", nullable: false },
        ],
        foreignKeys: [
            {
                constraint: "FK_application_run_steps_run_id",
                column: "run_id",
                refTable: "application_runs",
                refColumn: "id",
                onDelete: "CASCADE",
                onUpdate: "CASCADE",
            },
        ],
    },
    {
        table: "job_documents",
        columns: [
            { column: "id", type: "text", nullable: false },
            { column: "job_id", type: "text", nullable: false },
            { column: "type", type: "text", nullable: false },
            { column: "status", type: "text", nullable: false, default: "'ready'::text" },
            { column: "content", type: "text", nullable: false, default: "''::text" },
            { column: "file_path", type: "text", nullable: false, default: "''::text" },
            { column: "metadata", type: "text", nullable: false, default: "'{}'::text" },
            { column: "created_by", type: "text", nullable: false, default: "'system'::text" },
            { column: "created_at", type: "text", nullable: false },
            { column: "updated_at", type: "text", nullable: false },
        ],
        foreignKeys: [
            {
                constraint: "FK_job_documents_job_id",
                column: "job_id",
                refTable: "jobs",
                refColumn: "id",
                onDelete: "CASCADE",
                onUpdate: "CASCADE",
            },
        ],
    },
    {
        table: "task_runs",
        columns: [
            { column: "id", type: "text", nullable: false },
            { column: "bull_job_id", type: "text", nullable: true },
            { column: "type", type: "text", nullable: false },
            { column: "status", type: "text", nullable: false, default: "'queued'::text" },
            { column: "dedupe_key", type: "text", nullable: true },
            { column: "payload_json", type: "text", nullable: false, default: "'{}'::text" },
            { column: "progress_json", type: "text", nullable: true },
            { column: "result_json", type: "text", nullable: true },
            { column: "error", type: "text", nullable: true },
            { column: "created_at", type: "text", nullable: false },
            { column: "started_at", type: "text", nullable: true },
            { column: "completed_at", type: "text", nullable: true },
            { column: "updated_at", type: "text", nullable: false },
        ],
    },
    {
        table: "task_run_logs",
        columns: [
            { column: "id", type: "text", nullable: false },
            { column: "run_id", type: "text", nullable: false },
            { column: "level", type: "text", nullable: false, default: "'info'::text" },
            { column: "message", type: "text", nullable: false },
            { column: "payload_json", type: "text", nullable: true },
            { column: "created_at", type: "text", nullable: false },
        ],
        foreignKeys: [
            {
                constraint: "FK_task_run_logs_run_id",
                column: "run_id",
                refTable: "task_runs",
                refColumn: "id",
                onDelete: "CASCADE",
                onUpdate: "CASCADE",
            },
        ],
    },
    {
        table: "user_profile",
        columns: [
            { column: "id", type: "text", nullable: false, default: "'default'::text" },
            { column: "full_name", type: "text", nullable: false, default: "''::text" },
            { column: "email", type: "text", nullable: false, default: "''::text" },
            { column: "phone", type: "text", nullable: false, default: "''::text" },
            { column: "location", type: "text", nullable: false, default: "''::text" },
            { column: "linkedin", type: "text", nullable: false, default: "''::text" },
            { column: "portfolio", type: "text", nullable: false, default: "''::text" },
            { column: "github", type: "text", nullable: false, default: "''::text" },
            { column: "headline", type: "text", nullable: false, default: "''::text" },
            { column: "summary", type: "text", nullable: false, default: "''::text" },
            { column: "skills_json", type: "text", nullable: false, default: "'[]'::text" },
            { column: "experience_json", type: "text", nullable: false, default: "'[]'::text" },
            { column: "projects_json", type: "text", nullable: false, default: "'[]'::text" },
            { column: "education_json", type: "text", nullable: false, default: "'[]'::text" },
            { column: "preferences_json", type: "text", nullable: false, default: "'{}'::text" },
            { column: "created_at", type: "text", nullable: false },
            { column: "updated_at", type: "text", nullable: false },
        ],
    },
    {
        table: "user_answers",
        columns: [
            { column: "id", type: "text", nullable: false },
            { column: "category", type: "text", nullable: false, default: "''::text" },
            { column: "question", type: "text", nullable: false, default: "''::text" },
            { column: "answer", type: "text", nullable: false, default: "''::text" },
            { column: "tags_json", type: "text", nullable: false, default: "'[]'::text" },
            { column: "created_at", type: "text", nullable: false },
            { column: "updated_at", type: "text", nullable: false },
        ],
    },
    {
        table: "search_config",
        columns: [
            { column: "key", type: "text", nullable: false },
            { column: "value", type: "text", nullable: false },
        ],
    },
];
function normalizeDefault(d) {
    if (d == null)
        return undefined;
    return d.replace(/'/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}
function columnTypeMatches(actual, expected) {
    const a = actual.toLowerCase();
    const e = expected.toLowerCase();
    if (a === e)
        return true;
    if ((a === "integer" || a === "bigint") && (e === "integer" || e === "bigint"))
        return true;
    return false;
}
async function introspect(qr) {
    const problems = [];
    const actualTables = new Set();
    const tables = (await qr.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`));
    for (const t of tables)
        actualTables.add(t.table_name);
    for (const expect of MANIFEST) {
        if (!actualTables.has(expect.table)) {
            problems.push(`MISSING TABLE: ${expect.table}`);
            continue;
        }
        const cols = (await qr.query(`SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`, [expect.table]));
        const colMap = new Map(cols.map((c) => [c.column_name, c]));
        for (const ec of expect.columns) {
            const ac = colMap.get(ec.column);
            if (!ac) {
                problems.push(`MISSING COLUMN: ${expect.table}.${ec.column}`);
                continue;
            }
            if (!columnTypeMatches(ac.data_type, ec.type)) {
                problems.push(`TYPE MISMATCH: ${expect.table}.${ec.column} expected ${ec.type} but found ${ac.data_type}`);
            }
            const isNullable = ac.is_nullable === "YES";
            if (isNullable !== ec.nullable) {
                problems.push(`NULLABILITY MISMATCH: ${expect.table}.${ec.column} expected nullable=${ec.nullable} but found ${isNullable}`);
            }
            if (ec.default !== undefined) {
                const actualDefault = normalizeDefault(ac.column_default);
                if (actualDefault !== ec.default) {
                    problems.push(`DEFAULT MISMATCH: ${expect.table}.${ec.column} expected default "${ec.default}" but found "${actualDefault}"`);
                }
            }
        }
        for (const uq of expect.uniqueIndexes ?? []) {
            const idx = (await qr.query(`SELECT indexname, indisunique FROM pg_indexes i
         JOIN pg_class c ON c.relname = i.indexname
         JOIN pg_index ix ON ix.indexrelid = c.oid
         WHERE i.schemaname = 'public' AND i.tablename = $1 AND i.indexname = $2`, [expect.table, uq]));
            if (idx.length === 0) {
                problems.push(`MISSING UNIQUE INDEX: ${expect.table}.${uq}`);
            }
            else if (!idx[0].indisunique) {
                problems.push(`INDEX NOT UNIQUE: ${expect.table}.${uq}`);
            }
        }
        for (const fk of expect.foreignKeys ?? []) {
            const fks = (await qr.query(`SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS ref_table, ccu.column_name AS ref_column,
                rc.delete_rule, rc.update_rule
         FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
         JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
         JOIN information_schema.referential_constraints rc ON rc.constraint_name = tc.constraint_name
         WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public' AND tc.table_name = $1 AND tc.constraint_name = $2`, [expect.table, fk.constraint]));
            if (fks.length === 0) {
                problems.push(`MISSING FOREIGN KEY: ${expect.table}.${fk.constraint}`);
                continue;
            }
            const f = fks[0];
            if (f.column_name !== fk.column) {
                problems.push(`FK COLUMN MISMATCH: ${expect.table}.${fk.constraint} column ${f.column_name} != ${fk.column}`);
            }
            if (f.ref_table !== fk.refTable || f.ref_column !== fk.refColumn) {
                problems.push(`FK TARGET MISMATCH: ${expect.table}.${fk.constraint} -> ${f.ref_table}.${f.ref_column} expected ${fk.refTable}.${fk.refColumn}`);
            }
            if (fk.onDelete && f.delete_rule.toUpperCase() !== fk.onDelete) {
                problems.push(`FK ON DELETE MISMATCH: ${expect.table}.${fk.constraint} expected ${fk.onDelete} found ${f.delete_rule}`);
            }
            if (fk.onUpdate && f.update_rule.toUpperCase() !== fk.onUpdate) {
                problems.push(`FK ON UPDATE MISMATCH: ${expect.table}.${fk.constraint} expected ${fk.onUpdate} found ${f.update_rule}`);
            }
        }
    }
    return { actualTables, problems };
}
async function main() {
    await data_source_1.AppDataSource.initialize();
    const qr = data_source_1.AppDataSource.createQueryRunner();
    try {
        await qr.query(`CREATE TABLE IF NOT EXISTS "migrations" ("id" SERIAL NOT NULL, "timestamp" BIGINT NOT NULL, "name" varchar NOT NULL, CONSTRAINT "PK_migrations" PRIMARY KEY ("id"))`);
        const { problems } = await introspect(qr);
        if (problems.length > 0) {
            console.error("=== SCHEMA BASELINE VALIDATION FAILED ===");
            for (const p of problems)
                console.error(" - " + p);
            console.error("Refusing to record baseline. Check the target schema against the migration.");
            process.exitCode = 1;
            return;
        }
        console.log("Schema validation passed.");
        const dir = __dirname + "/migrations";
        const files = (0, fs_1.readdirSync)(dir).filter((f) => f.endsWith(".ts") || f.endsWith(".js"));
        const migrationEntries = files
            .map((f) => {
            const m = f.match(/^(\d+)-(.+)\.(ts|js)$/);
            return m ? { timestamp: Number(m[1]), name: m[2] } : null;
        })
            .filter(Boolean);
        if (migrationEntries.length === 0) {
            console.log("No migration files found to record.");
            return;
        }
        const existing = (await qr.query(`SELECT "timestamp", "name" FROM "migrations"`));
        const existingSet = new Set(existing.map((e) => `${e.timestamp}-${e.name}`));
        const newEntries = migrationEntries.filter((e) => !existingSet.has(`${e.timestamp}-${e.name}`));
        if (newEntries.length === 0) {
            console.log(`Baseline already recorded (${migrationEntries.length} migrations). Nothing to do.`);
            return;
        }
        await qr.startTransaction();
        try {
            for (const entry of newEntries) {
                await qr.query(`INSERT INTO "migrations" ("timestamp", "name") VALUES ($1, $2)`, [entry.timestamp, entry.name]);
                console.log(`Marked applied: ${entry.name}`);
            }
            await qr.commitTransaction();
            console.log(`Schema baseline validated and recorded (${newEntries.length} new migration(s)).`);
        }
        catch (e) {
            await qr.rollbackTransaction();
            console.error("Baseline recording failed; transaction rolled back.");
            throw e;
        }
    }
    finally {
        await data_source_1.AppDataSource.destroy();
    }
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
//# sourceMappingURL=baseline.js.map