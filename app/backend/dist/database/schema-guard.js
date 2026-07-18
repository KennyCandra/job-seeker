"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyBaseline = verifyBaseline;
const common_1 = require("@nestjs/common");
const log = new common_1.Logger("SchemaGuard");
async function verifyBaseline(dataSource) {
    try {
        const rows = (await dataSource.query(`SELECT COUNT(*)::int AS c FROM "migrations"`));
        const count = rows[0]?.c ?? 0;
        if (count === 0) {
            log.warn('No migrations recorded. Run "bun run db:baseline" to validate and record the schema baseline before using the API.');
            return false;
        }
        log.log(`Baseline verified: ${count} migration(s) recorded.`);
        return true;
    }
    catch {
        log.warn('Could not verify baseline (migrations table may not exist). Run "bun run db:baseline".');
        return false;
    }
}
//# sourceMappingURL=schema-guard.js.map