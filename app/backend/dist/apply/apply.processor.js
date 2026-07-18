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
var ApplyProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplyProcessor = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bullmq_1 = require("@nestjs/bullmq");
const repositories_1 = require("../database/repositories");
const constants_1 = require("../queue/constants");
const llm_1 = require("../shared/llm");
const runner_1 = require("./runner");
const profile_1 = require("./profile");
const sessions_1 = require("./sessions");
const apply_control_service_1 = require("./apply-control.service");
let ApplyProcessor = ApplyProcessor_1 = class ApplyProcessor extends bullmq_1.WorkerHost {
    jobs;
    runs;
    steps;
    profile;
    userAnswers;
    control;
    config;
    logger = new common_1.Logger(ApplyProcessor_1.name);
    constructor(jobs, runs, steps, profile, userAnswers, control, config) {
        super();
        this.jobs = jobs;
        this.runs = runs;
        this.steps = steps;
        this.profile = profile;
        this.userAnswers = userAnswers;
        this.control = control;
        this.config = config;
    }
    async process(job) {
        const { applyRunId, jobId, url } = job.data;
        const runId = applyRunId || `apply-${jobId}`;
        this.logger.log(`Running apply run ${runId} for job ${jobId} -> ${url}`);
        const jobRow = await this.jobs.getById(jobId);
        if (!jobRow)
            throw new Error(`Job not found: ${jobId}`);
        const profileRow = await this.profile.get();
        const answerRows = await this.userAnswers.getAll();
        const { profile, answersMarkdown } = (0, profile_1.buildApplicantProfile)(profileRow, answerRows);
        this.control.onControl(runId, (action) => {
            const session = (0, sessions_1.getPausedApplySession)(runId);
            if (!session)
                return;
            this.control.offControl(runId);
            if (action === "resume") {
                session.resume().catch((err) => this.logger.error(`Resume failed for ${runId}: ${err?.message ?? err}`));
            }
            else if (action === "cancel") {
                session.cancel().catch((err) => this.logger.error(`Cancel failed for ${runId}: ${err?.message ?? err}`));
            }
        });
        try {
            const result = await (0, runner_1.runApply)({
                runId,
                jobId,
                url,
                profile,
                answersMarkdown,
                keepBrowserOnBlock: this.config.get("APPLY_KEEP_BROWSER_ON_BLOCK", { infer: true }),
                llm: llm_1.OpenCodeClient.fromConfig(this.config),
                runsRepo: this.runs,
                stepsRepo: this.steps,
            });
            return result;
        }
        finally {
            if (!(0, sessions_1.getPausedApplySession)(runId)) {
                this.control.offControl(runId);
            }
        }
    }
};
exports.ApplyProcessor = ApplyProcessor;
exports.ApplyProcessor = ApplyProcessor = ApplyProcessor_1 = __decorate([
    (0, common_1.Injectable)(),
    (0, bullmq_1.Processor)(constants_1.APPLY_QUEUE),
    __metadata("design:paramtypes", [repositories_1.JobsRepository,
        repositories_1.ApplicationRunsRepository,
        repositories_1.ApplicationRunStepsRepository,
        repositories_1.UserProfileRepository,
        repositories_1.UserAnswersRepository,
        apply_control_service_1.ApplyControlService,
        config_1.ConfigService])
], ApplyProcessor);
//# sourceMappingURL=apply.processor.js.map