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
exports.StatsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
let StatsService = class StatsService {
    dataSource;
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async getStats() {
        const [row] = await this.dataSource.query(`
      SELECT
        (SELECT COUNT(*)::int FROM companies) AS companies,
        (SELECT COUNT(*)::int FROM jobs) AS jobs,
        (SELECT COUNT(*)::int FROM jobs WHERE status = 'open') AS "openJobs",
        (SELECT COUNT(*)::int FROM jobs WHERE status = 'closed') AS "closedJobs",
        (SELECT COUNT(DISTINCT job_id)::int FROM job_filters) AS shortlist,
        (SELECT COUNT(*)::int FROM applications) AS applications,
        (SELECT COUNT(*)::int FROM job_documents) AS "docsGenerated",
        (SELECT COUNT(*)::int FROM job_documents WHERE type = 'cv') AS "cvCount",
        (SELECT COUNT(*)::int FROM job_documents WHERE type = 'cover_letter') AS "coverLetterCount",
        (SELECT COUNT(*)::int FROM job_documents WHERE type = 'recommendation') AS "recommendationCount"
    `);
        const jobs = Number(row?.jobs || 0);
        return {
            companies: Number(row?.companies || 0),
            jobs,
            openJobs: Number(row?.openJobs || 0),
            closedJobs: Number(row?.closedJobs || 0),
            shortlist: Number(row?.shortlist || 0),
            applications: Number(row?.applications || 0),
            savedJobs: jobs,
            docsGenerated: Number(row?.docsGenerated || 0),
            cvCount: Number(row?.cvCount || 0),
            coverLetterCount: Number(row?.coverLetterCount || 0),
            recommendationCount: Number(row?.recommendationCount || 0),
        };
    }
};
exports.StatsService = StatsService;
exports.StatsService = StatsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], StatsService);
//# sourceMappingURL=stats.service.js.map