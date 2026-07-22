"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RepositoriesModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const entities_1 = require("../entities");
const index_1 = require("./index");
let RepositoriesModule = class RepositoriesModule {
};
exports.RepositoriesModule = RepositoriesModule;
exports.RepositoriesModule = RepositoriesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                entities_1.Company,
                entities_1.Job,
                entities_1.JobFilterEntity,
                entities_1.Application,
                entities_1.ApplicationRun,
                entities_1.ApplicationRunStep,
                entities_1.JobDocument,
                entities_1.SearchConfigEntity,
                entities_1.TaskRun,
                entities_1.TaskRunLog,
                entities_1.UserProfile,
                entities_1.UserAnswer,
                entities_1.CompanySnapshot,
            ]),
        ],
        providers: [
            index_1.CompaniesRepository,
            index_1.JobsRepository,
            index_1.JobFiltersRepository,
            index_1.JobDocumentsRepository,
            index_1.TaskRunsRepository,
            index_1.TaskRunLogsRepository,
            index_1.ApplicationsRepository,
            index_1.ApplicationRunsRepository,
            index_1.ApplicationRunStepsRepository,
            index_1.UserProfileRepository,
            index_1.UserAnswersRepository,
            index_1.SearchConfigRepository,
            index_1.ShortlistRepository,
            index_1.CompanySnapshotsRepository,
        ],
        exports: [
            index_1.CompaniesRepository,
            index_1.JobsRepository,
            index_1.JobFiltersRepository,
            index_1.JobDocumentsRepository,
            index_1.TaskRunsRepository,
            index_1.TaskRunLogsRepository,
            index_1.ApplicationsRepository,
            index_1.ApplicationRunsRepository,
            index_1.ApplicationRunStepsRepository,
            index_1.UserProfileRepository,
            index_1.UserAnswersRepository,
            index_1.SearchConfigRepository,
            index_1.ShortlistRepository,
            index_1.CompanySnapshotsRepository,
        ],
    })
], RepositoriesModule);
//# sourceMappingURL=repositories.module.js.map