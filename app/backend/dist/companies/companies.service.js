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
var CompaniesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompaniesService = void 0;
const common_1 = require("@nestjs/common");
const repositories_1 = require("../database/repositories");
const task_queue_service_1 = require("../tasks/task-queue.service");
const paths_1 = require("../common/paths");
const errors_1 = require("../common/errors");
const ATS_PLATFORMS = new Set(["greenhouse", "lever", "ashby", "custom"]);
let CompaniesService = CompaniesService_1 = class CompaniesService {
    companies;
    queue;
    logger = new common_1.Logger(CompaniesService_1.name);
    constructor(companies, queue) {
        this.companies = companies;
        this.queue = queue;
    }
    getAll() {
        return this.companies.getAll();
    }
    async create(input) {
        if (!input.name || !input.ats)
            throw new errors_1.AppException(400, "name and ats required");
        if (!ATS_PLATFORMS.has(input.ats))
            throw new errors_1.AppException(400, "Invalid ats");
        const companySlug = (0, paths_1.slug)(input.name);
        const requestedEndpoint = input.endpoint || input.boardUrl || (0, paths_1.endpointForAts)(companySlug, input.ats);
        const validationError = validateCompanyEndpoint(input.ats, requestedEndpoint);
        if (validationError)
            throw new errors_1.AppException(400, validationError);
        const ok = await this.companies.save({
            name: input.name,
            ats: input.ats,
            endpoint: input.ats === "custom" ? "manual" : requestedEndpoint,
        });
        return { ok };
    }
    async setActive(slug, active) {
        if (active)
            await this.companies.reactivate(slug);
        else
            await this.companies.deactivate(slug);
        return { ok: true };
    }
    remove(slug) {
        return this.companies.deactivate(slug).then(() => ({ ok: true }));
    }
    discover() {
        return this.queue.enqueueTask("discover-companies", {}, { dedupeKey: "discover-companies" });
    }
    discoverLegacy() {
        return this.queue.enqueueTask("discover-companies", {}, { dedupeKey: "discover-companies" });
    }
    fetch(slug, filter) {
        return this.queue.enqueueTask("sync-company", { companySlug: slug, filter: Boolean(filter) }, { dedupeKey: `sync-company:${slug}:${Boolean(filter)}` });
    }
};
exports.CompaniesService = CompaniesService;
exports.CompaniesService = CompaniesService = CompaniesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [repositories_1.CompaniesRepository,
        task_queue_service_1.TaskQueueService])
], CompaniesService);
function validateCompanyEndpoint(ats, endpoint) {
    if (ats === "custom") {
        return endpoint === "manual" || endpoint.trim() === "" ? null : "custom companies cannot store a fetchable endpoint";
    }
    let url;
    try {
        url = new URL(endpoint);
    }
    catch {
        return "endpoint must be a valid URL";
    }
    if (!["https:", "http:"].includes(url.protocol))
        return "endpoint must use http or https";
    const host = url.hostname.toLowerCase();
    const allowedHosts = {
        greenhouse: ["boards.greenhouse.io", "boards-api.greenhouse.io", "job-boards.greenhouse.io"],
        lever: ["api.lever.co", "jobs.lever.co"],
        ashby: ["api.ashbyhq.com", "jobs.ashbyhq.com"],
    };
    if (!allowedHosts[ats].includes(host))
        return `${ats} endpoint host is not allowed`;
    return null;
}
//# sourceMappingURL=companies.service.js.map