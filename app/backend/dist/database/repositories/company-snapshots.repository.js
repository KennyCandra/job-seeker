"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanySnapshotsRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const SNAPSHOT_COLUMNS = `id, company_id AS "companyId", snapshot_date AS "snapshotDate",
  open_count AS "openCount", new_count AS "newCount", closed_count AS "closedCount",
  created_at AS "createdAt"`;
let CompanySnapshotsRepository = class CompanySnapshotsRepository {
    dataSource;
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async upsertForDate(date) {
        const now = new Date().toISOString();
        const rows = await this.dataSource.query(`INSERT INTO company_snapshots (company_id, snapshot_date, open_count, new_count, closed_count, created_at)
       SELECT c.id, $1,
         COUNT(j.id) FILTER (WHERE j.status = 'open')::int,
         COUNT(j.id) FILTER (WHERE LEFT(j.first_seen_at, 10) = $1)::int,
         COUNT(j.id) FILTER (WHERE LEFT(j.closed_at, 10) = $1)::int,
         $2
       FROM companies c
       LEFT JOIN jobs j ON j.company_id = c.id
       WHERE c.active = 1
       GROUP BY c.id
       ON CONFLICT (company_id, snapshot_date) DO UPDATE SET
         open_count = EXCLUDED.open_count,
         new_count = EXCLUDED.new_count,
         closed_count = EXCLUDED.closed_count
       RETURNING id`, [date, now]);
        return rows.length;
    }
    async getByCompany(companyId, limit = 90) {
        const rows = await this.dataSource.query(`SELECT ${SNAPSHOT_COLUMNS} FROM company_snapshots WHERE company_id = $1 ORDER BY snapshot_date DESC LIMIT $2`, [companyId, limit]);
        return rows;
    }
    async countForDate(date) {
        const rows = await this.dataSource.query(`SELECT COUNT(*)::int AS c FROM company_snapshots WHERE snapshot_date = $1`, [date]);
        return Number(rows[0]?.c ?? 0);
    }
};
exports.CompanySnapshotsRepository = CompanySnapshotsRepository;
exports.CompanySnapshotsRepository = CompanySnapshotsRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], CompanySnapshotsRepository);
//# sourceMappingURL=company-snapshots.repository.js.map