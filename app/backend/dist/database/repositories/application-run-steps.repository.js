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
exports.ApplicationRunStepsRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
let ApplicationRunStepsRepository = class ApplicationRunStepsRepository {
    dataSource;
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async create(input) {
        const now = input.createdAt || new Date().toISOString();
        await this.dataSource.query(`INSERT INTO application_run_steps (id, run_id, type, label, detail, screenshot_path, payload, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
            input.id,
            input.runId,
            input.type,
            input.label ?? "",
            input.detail ?? "",
            input.screenshotPath ?? null,
            JSON.stringify(input.payload ?? {}),
            now,
        ]);
    }
    async getByRunId(runId) {
        const rows = await this.dataSource.query(`SELECT id, run_id AS "runId", type, label, detail, screenshot_path AS "screenshotPath",
              payload, created_at AS "createdAt"
       FROM application_run_steps WHERE run_id = $1 ORDER BY created_at ASC, id ASC`, [runId]);
        return rows;
    }
};
exports.ApplicationRunStepsRepository = ApplicationRunStepsRepository;
exports.ApplicationRunStepsRepository = ApplicationRunStepsRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], ApplicationRunStepsRepository);
//# sourceMappingURL=application-run-steps.repository.js.map