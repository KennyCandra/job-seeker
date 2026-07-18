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
exports.DiscoveryTasksService = void 0;
const common_1 = require("@nestjs/common");
const task_registry_1 = require("../tasks/task-registry");
const task_queue_service_1 = require("../tasks/task-queue.service");
const task_runs_service_1 = require("../tasks/task-runs.service");
const repositories_1 = require("../database/repositories");
const discovery_service_1 = require("./discovery.service");
let DiscoveryTasksService = class DiscoveryTasksService {
    registry;
    queue;
    runs;
    companies;
    discovery;
    constructor(registry, queue, runs, companies, discovery) {
        this.registry = registry;
        this.queue = queue;
        this.runs = runs;
        this.companies = companies;
        this.discovery = discovery;
    }
    onModuleInit() {
        this.registry.register("discover-companies", this.discoverCompanies.bind(this));
        this.registry.register("ln-companies", this.discoverCompanies.bind(this));
        this.registry.register("discover-fetch-filter", this.discoverFetchFilter.bind(this));
        this.registry.register("ln-fetch-filter", this.discoverFetchFilter.bind(this));
    }
    async discoverCompanies(ctx) {
        const { log, throwIfCancelled } = ctx;
        await throwIfCancelled();
        const result = await this.discovery.discover((pl) => log("info", `[discovery] ${pl.type}: ${pl.message}`));
        await throwIfCancelled();
        return {
            source: result.source,
            found: result.found,
            added: result.added,
            updated: result.updated,
            queries: result.queries,
            companies: result.companies,
        };
    }
    async discoverFetchFilter(ctx) {
        const { log, progress, isCancelled, throwIfCancelled } = ctx;
        await throwIfCancelled();
        await log("info", "Starting company discovery...");
        const discovery = await this.discovery.discover((pl) => log("info", `[discovery] ${pl.type}: ${pl.message}`));
        await log("info", `Discovery done: ${discovery.added} new companies`);
        const allCompanies = await this.companies.getActive();
        await log("info", `Fan-out sync+filter for ${allCompanies.length} active companies`);
        if (allCompanies.length === 0) {
            await progress({ total: 0, queued: 0, running: 0, completed: 0, failed: 0, cancelled: 0 });
            return { discovered: discovery.added, total: 0, queued: 0, running: 0, completed: 0, failed: 0, cancelled: 0, failedSlugs: [] };
        }
        const childEntries = [];
        for (const company of allCompanies) {
            await throwIfCancelled();
            const { runId } = await this.queue.enqueueTask("sync-company", { companySlug: company.slug, filter: true }, { dedupeKey: `sync-company:${company.slug}:true` });
            childEntries.push({ runId, companySlug: company.slug, companyName: company.name });
            await log("info", `Enqueued sync+filter for ${company.slug} → ${runId}`);
        }
        const total = childEntries.length;
        const failedSlugs = [];
        let completed = 0, failed = 0, cancelled = 0, running = 0, queued = 0;
        while (true) {
            if (await isCancelled()) {
                await log("warn", "discover-fetch-filter cancelled — cancelling children");
                for (const entry of childEntries) {
                    try {
                        await this.queue.cancelTask(entry.runId);
                    }
                    catch { }
                }
                break;
            }
            completed = 0;
            failed = 0;
            cancelled = 0;
            running = 0;
            queued = 0;
            failedSlugs.length = 0;
            for (const entry of childEntries) {
                const child = await this.runs.get(entry.runId);
                if (!child)
                    continue;
                if (child.status === "completed")
                    completed++;
                else if (child.status === "failed") {
                    failed++;
                    failedSlugs.push(entry.companySlug);
                }
                else if (child.status === "cancelled")
                    cancelled++;
                else if (child.status === "running")
                    running++;
                else if (child.status === "queued")
                    queued++;
            }
            await progress({ total, queued, running, completed, failed, cancelled });
            if (completed + failed + cancelled === total)
                break;
            await new Promise((r) => setTimeout(r, 2000));
        }
        return { discovered: discovery.added, total, queued, running, completed, failed, cancelled, failedSlugs };
    }
};
exports.DiscoveryTasksService = DiscoveryTasksService;
exports.DiscoveryTasksService = DiscoveryTasksService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [task_registry_1.TaskRegistry,
        task_queue_service_1.TaskQueueService,
        task_runs_service_1.TaskRunsService,
        repositories_1.CompaniesRepository,
        discovery_service_1.DiscoveryService])
], DiscoveryTasksService);
//# sourceMappingURL=discovery.tasks.js.map