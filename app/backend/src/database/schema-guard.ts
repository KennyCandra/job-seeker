import { Logger } from "@nestjs/common";
import type { DataSource } from "typeorm";

const log = new Logger("SchemaGuard");

/**
 * Quick startup check: verifies the migrations table exists and the baseline
 * migration has been recorded. Logs a warning (does not crash) if not.
 */
export async function verifyBaseline(dataSource: DataSource): Promise<boolean> {
  try {
    const rows = (await dataSource.query(
      `SELECT COUNT(*)::int AS c FROM "migrations"`,
    )) as Array<{ c: number }>;
    const count = rows[0]?.c ?? 0;
    if (count === 0) {
      log.warn(
        'No migrations recorded. Run "bun run db:baseline" to validate and record the schema baseline before using the API.',
      );
      return false;
    }
    log.log(`Baseline verified: ${count} migration(s) recorded.`);
    return true;
  } catch {
    log.warn('Could not verify baseline (migrations table may not exist). Run "bun run db:baseline".');
    return false;
  }
}
